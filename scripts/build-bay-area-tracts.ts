/**
 * Downloads CA Census tracts (TIGER 2023), filters to 6 Bay Area counties,
 * assigns friendly neighbourhood/city names via OSM + TIGER places,
 * simplifies geometries, and emits GeoJSON + tract search index.
 *
 * Usage: npm run build:tracts
 */

import fs from "node:fs";
import path from "node:path";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";
import { Readable } from "node:stream";

import AdmZip from "adm-zip";
import area from "@turf/area";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import centroid from "@turf/centroid";
import { point, polygon as turfPolygon } from "@turf/helpers";
import simplify from "@turf/simplify";
import type {
  Feature,
  FeatureCollection,
  Polygon,
  MultiPolygon,
  Position,
} from "geojson";
import * as shapefile from "shapefile";

const ROOT = path.resolve(__dirname, "..");
const CACHE_DIR = path.join(ROOT, ".cache", "tiger");
const OSM_CACHE = path.join(ROOT, ".cache", "osm-neighbourhoods.json");
const OUT_GEOJSON = path.join(ROOT, "public", "data", "bay-area-tracts.geojson");
const OUT_INDEX = path.join(ROOT, "src", "data", "bay-area-tract-index.ts");

const TIGER_TRACT_URL =
  "https://www2.census.gov/geo/tiger/TIGER2023/TRACT/tl_2023_06_tract.zip";
const TIGER_PLACE_URL =
  "https://www2.census.gov/geo/tiger/TIGER2023/PLACE/tl_2023_06_place.zip";

const BAY_AREA_BOUNDS = {
  west: -123.05,
  south: 36.9,
  east: -121.2,
  north: 38.45,
};

const TARGET_COUNTIES = new Set(["001", "013", "041", "075", "081", "085"]);

const COUNTY_NAMES: Record<string, string> = {
  "001": "Alameda",
  "013": "Contra Costa",
  "041": "Marin",
  "075": "San Francisco",
  "081": "San Mateo",
  "085": "Santa Clara",
};

const SF_TRACT_ALIASES: Record<string, string> = {
  "06075020800": "Mission District",
  "06075010102": "Castro",
  "06075022802": "Noe Valley",
  "06075020300": "Haight-Ashbury",
  "06075002601": "SOMA",
  "06075040100": "North Beach",
  "06075011901": "Pacific Heights",
  "06075015301": "Richmond",
};

const SIMPLIFY_TOLERANCE = 0.0008;
const OSM_NODE_MAX_KM = 2.5;

interface TractIndexEntry {
  geoid: string;
  name: string;
  city: string;
  county: string;
  centroid: [number, number];
  bounds: [number, number, number, number];
}

interface NamedPolygon {
  name: string;
  geometry: Polygon | MultiPolygon;
  areaSqM: number;
}

interface NamedPoint {
  name: string;
  lng: number;
  lat: number;
}

interface OsmCache {
  polygons: NamedPolygon[];
  nodes: NamedPoint[];
}

interface OsmElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
  geometry?: { lat: number; lon: number }[];
  members?: {
    type: string;
    ref: number;
    role: string;
    geometry?: { lat: number; lon: number }[];
  }[];
}

interface OsmResponse {
  elements: OsmElement[];
}

async function download(url: string, dest: string): Promise<void> {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Download failed (${res.status}): ${url}`);
  }
  const body = res.body;
  if (!body) throw new Error(`Empty response from ${url}`);
  await pipeline(
    Readable.fromWeb(body as import("stream/web").ReadableStream),
    createWriteStream(dest)
  );
}

function ringBounds(ring: number[][]): [number, number, number, number] {
  const lngs = ring.map((c) => c[0]);
  const lats = ring.map((c) => c[1]);
  return [
    Math.min(...lngs),
    Math.min(...lats),
    Math.max(...lngs),
    Math.max(...lats),
  ];
}

function featureBounds(
  geometry: Polygon | MultiPolygon
): [number, number, number, number] {
  if (geometry.type === "Polygon") {
    return ringBounds(geometry.coordinates[0]);
  }
  const boxes = geometry.coordinates.map((poly) => ringBounds(poly[0]));
  return [
    Math.min(...boxes.map((b) => b[0])),
    Math.min(...boxes.map((b) => b[1])),
    Math.max(...boxes.map((b) => b[2])),
    Math.max(...boxes.map((b) => b[3])),
  ];
}

function cleanPlaceName(name: string): string {
  return name
    .replace(/\s+city$/i, "")
    .replace(/\s+town$/i, "")
    .replace(/\s+CDP$/i, "")
    .trim();
}

function cleanNeighbourhoodName(name: string): string {
  return cleanPlaceName(name)
    .replace(/\s+District$/i, "")
    .replace(/\s+neighbourhood$/i, "")
    .replace(/\s+Neighborhood$/i, "")
    .trim();
}

function haversineKm(
  lng1: number,
  lat1: number,
  lng2: number,
  lat2: number
): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function osmRingToCoords(ring: { lat: number; lon: number }[]): Position[] {
  const coords = ring.map((n) => [n.lon, n.lat] as Position);
  if (coords.length > 0) {
    const first = coords[0];
    const last = coords[coords.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      coords.push([...first]);
    }
  }
  return coords;
}

function elementToPolygons(el: OsmElement): NamedPolygon[] {
  const name = el.tags?.name;
  if (!name) return [];

  const results: NamedPolygon[] = [];

  if (el.type === "way" && el.geometry && el.geometry.length >= 4) {
    const coords = osmRingToCoords(el.geometry);
    const geom = turfPolygon([coords]).geometry;
    results.push({
      name: cleanNeighbourhoodName(name),
      geometry: geom,
      areaSqM: area(geom),
    });
    return results;
  }

  if (el.type === "relation" && el.members) {
    for (const member of el.members) {
      if (member.role === "outer" && member.geometry && member.geometry.length >= 4) {
        const coords = osmRingToCoords(member.geometry);
        const geom = turfPolygon([coords]).geometry;
        results.push({
          name: cleanNeighbourhoodName(name),
          geometry: geom,
          areaSqM: area(geom),
        });
      }
    }
  }

  return results;
}

function elementToNode(el: OsmElement): NamedPoint | null {
  const name = el.tags?.name;
  if (!name || el.lat === undefined || el.lon === undefined) return null;
  return {
    name: cleanNeighbourhoodName(name),
    lng: el.lon,
    lat: el.lat,
  };
}

async function fetchOsmNeighbourhoods(): Promise<OsmCache> {
  if (fs.existsSync(OSM_CACHE)) {
    console.log("Using cached OSM neighbourhoods");
    return JSON.parse(fs.readFileSync(OSM_CACHE, "utf8")) as OsmCache;
  }

  const { south, west, north, east } = BAY_AREA_BOUNDS;
  const query = `
[out:json][timeout:180];
(
  way["place"~"neighbourhood|quarter|suburb"](${south},${west},${north},${east});
  relation["place"~"neighbourhood|quarter|suburb"](${south},${west},${north},${east});
  node["place"~"neighbourhood|quarter|suburb"](${south},${west},${north},${east});
);
out geom;
`.trim();

  console.log("Fetching OSM neighbourhood data from Overpass API…");
  const endpoints = [
    `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`,
    `https://overpass.kumi.systems/api/interpreter?data=${encodeURIComponent(query)}`,
  ];

  let json: OsmResponse | null = null;
  for (const endpoint of endpoints) {
    const res = await fetch(endpoint, {
      headers: { "User-Agent": "NeighbourlyBuild/1.0 (bay-area tract builder)" },
    });
    if (res.ok) {
      json = (await res.json()) as OsmResponse;
      break;
    }
    console.warn(`Overpass failed (${res.status})`);
    await new Promise((r) => setTimeout(r, 2000));
  }

  if (!json) {
    console.warn("Overpass unavailable — continuing with TIGER places only");
    return { polygons: [], nodes: [] };
  }

  const polygons: NamedPolygon[] = [];
  const nodes: NamedPoint[] = [];

  for (const el of json.elements) {
    if (el.type === "node") {
      const node = elementToNode(el);
      if (node) nodes.push(node);
    } else {
      polygons.push(...elementToPolygons(el));
    }
  }

  const cache: OsmCache = { polygons, nodes };
  fs.mkdirSync(path.dirname(OSM_CACHE), { recursive: true });
  fs.writeFileSync(OSM_CACHE, JSON.stringify(cache), "utf8");
  console.log(
    `Cached ${polygons.length} OSM neighbourhood polygons and ${nodes.length} suburb nodes`
  );
  return cache;
}

async function loadTigerPlaces(): Promise<NamedPolygon[]> {
  const zipPath = path.join(CACHE_DIR, "tl_2023_06_place.zip");
  const extractDir = path.join(CACHE_DIR, "place-extracted");

  if (!fs.existsSync(zipPath)) {
    console.log(`Downloading ${TIGER_PLACE_URL}`);
    await download(TIGER_PLACE_URL, zipPath);
  } else {
    console.log("Using cached TIGER place archive");
  }

  const shpPath = await extractZip(zipPath, extractDir);
  console.log(`Reading places shapefile: ${shpPath}`);

  const source = await shapefile.open(shpPath);
  const places: NamedPolygon[] = [];

  let result = await source.read();
  while (!result.done) {
    const raw = result.value;
    const stateFips = String(raw.properties?.STATEFP ?? "");
    const name = String(raw.properties?.NAME ?? "");

    if (stateFips === "06" && name && raw.geometry) {
      const geom = raw.geometry as Polygon | MultiPolygon;
      const center = centroid({ type: "Feature", properties: {}, geometry: geom });
      const [lng, lat] = center.geometry.coordinates;

      if (
        lng >= BAY_AREA_BOUNDS.west &&
        lng <= BAY_AREA_BOUNDS.east &&
        lat >= BAY_AREA_BOUNDS.south &&
        lat <= BAY_AREA_BOUNDS.north
      ) {
        places.push({
          name: cleanPlaceName(name),
          geometry: geom,
          areaSqM: area(geom),
        });
      }
    }

    result = await source.read();
  }

  console.log(`Loaded ${places.length} TIGER places in Bay Area bbox`);
  return places;
}

function findContainingPolygons(
  lng: number,
  lat: number,
  polygons: NamedPolygon[]
): NamedPolygon[] {
  const pt = point([lng, lat]);
  return polygons.filter((p) => booleanPointInPolygon(pt, p.geometry));
}

function pickSmallest(matches: NamedPolygon[]): NamedPolygon | null {
  if (matches.length === 0) return null;
  return matches.reduce((a, b) => (a.areaSqM < b.areaSqM ? a : b));
}

function findNearestOsmNode(
  lng: number,
  lat: number,
  city: string,
  nodes: NamedPoint[],
  blocklist: Set<string>
): NamedPoint | null {
  const cityLower = city.toLowerCase();
  let best: NamedPoint | null = null;
  let bestDist = OSM_NODE_MAX_KM;

  for (const node of nodes) {
    const nodeLower = node.name.toLowerCase();
    if (nodeLower === cityLower || blocklist.has(nodeLower)) continue;
    const dist = haversineKm(lng, lat, node.lng, node.lat);
    if (dist < bestDist) {
      bestDist = dist;
      best = node;
    }
  }

  return best;
}

function resolveTractLabels(
  geoid: string,
  lng: number,
  lat: number,
  county: string,
  osmPolygons: NamedPolygon[],
  osmNodes: NamedPoint[],
  tigerPlaces: NamedPolygon[],
  cityNameBlocklist: Set<string>
): { name: string; city: string } {
  const sfAlias = SF_TRACT_ALIASES[geoid];
  if (sfAlias) {
    return { name: sfAlias, city: "San Francisco" };
  }

  const placeMatch = pickSmallest(findContainingPolygons(lng, lat, tigerPlaces));
  const city = placeMatch?.name ?? "";

  const osmCandidates = findContainingPolygons(lng, lat, osmPolygons).filter(
    (p) => !cityNameBlocklist.has(p.name.toLowerCase())
  );
  const osmPolygon = pickSmallest(osmCandidates);
  if (osmPolygon) {
    return { name: osmPolygon.name, city };
  }

  if (city) {
    const osmNode = findNearestOsmNode(lng, lat, city, osmNodes, cityNameBlocklist);
    if (osmNode) {
      return { name: osmNode.name, city };
    }
  }

  if (placeMatch) {
    return { name: placeMatch.name, city: placeMatch.name };
  }

  return { name: `Unincorporated ${county}`, city: "" };
}

async function extractZip(zipPath: string, destDir: string): Promise<string> {
  fs.mkdirSync(destDir, { recursive: true });
  const zip = new AdmZip(zipPath);
  zip.extractAllTo(destDir, true);
  const shp = fs.readdirSync(destDir).find((f) => f.endsWith(".shp"));
  if (!shp) throw new Error("No .shp found in TIGER archive");
  return path.join(destDir, shp);
}

function emitIndex(entries: TractIndexEntry[]): void {
  const lines = entries
    .sort((a, b) => a.geoid.localeCompare(b.geoid))
    .map(
      (e) =>
        `  { geoid: "${e.geoid}", name: ${JSON.stringify(e.name)}, city: ${JSON.stringify(e.city)}, county: ${JSON.stringify(e.county)}, centroid: [${e.centroid[0]}, ${e.centroid[1]}], bounds: [${e.bounds.join(", ")}] }`
    )
    .join(",\n");

  const content = `/** Auto-generated by scripts/build-bay-area-tracts.ts — do not edit manually. */
import type { BBox } from "geojson";

export interface TractIndexEntry {
  geoid: string;
  name: string;
  city: string;
  county: string;
  centroid: [number, number];
  bounds: BBox;
}

export const BAY_AREA_TRACT_INDEX: TractIndexEntry[] = [
${lines}
];
`;

  fs.mkdirSync(path.dirname(OUT_INDEX), { recursive: true });
  fs.writeFileSync(OUT_INDEX, content, "utf8");
}

async function main(): Promise<void> {
  console.log("Building Bay Area tract dataset…");

  const osmData = await fetchOsmNeighbourhoods();
  const tigerPlaces = await loadTigerPlaces();

  const cityNameBlocklist = new Set(
    tigerPlaces.map((p) => p.name.toLowerCase())
  );

  const zipPath = path.join(CACHE_DIR, "tl_2023_06_tract.zip");
  const extractDir = path.join(CACHE_DIR, "extracted");

  if (!fs.existsSync(zipPath)) {
    console.log(`Downloading ${TIGER_TRACT_URL}`);
    await download(TIGER_TRACT_URL, zipPath);
  } else {
    console.log("Using cached TIGER tract archive");
  }

  const shpPath = await extractZip(zipPath, extractDir);
  console.log(`Reading tract shapefile: ${shpPath}`);

  const source = await shapefile.open(shpPath);
  const features: Feature<Polygon | MultiPolygon>[] = [];
  const index: TractIndexEntry[] = [];

  let result = await source.read();
  while (!result.done) {
    const raw = result.value;
    const geoid = String(raw.properties?.GEOID ?? "");
    const countyFips = String(raw.properties?.COUNTYFP ?? geoid.slice(2, 5));

    if (TARGET_COUNTIES.has(countyFips) && raw.geometry) {
      const county = COUNTY_NAMES[countyFips] ?? "Bay Area";

      const geom = raw.geometry as Polygon | MultiPolygon;
      const simplified = simplify(
        { type: "Feature", properties: {}, geometry: geom },
        { tolerance: SIMPLIFY_TOLERANCE, highQuality: true }
      );

      const center = centroid(simplified);
      const [lng, lat] = center.geometry.coordinates;
      const bounds = featureBounds(simplified.geometry as Polygon | MultiPolygon);

      const { name, city } = resolveTractLabels(
        geoid,
        lng,
        lat,
        county,
        osmData.polygons,
        osmData.nodes,
        tigerPlaces,
        cityNameBlocklist
      );

      const feature: Feature<Polygon | MultiPolygon> = {
        type: "Feature",
        properties: {
          geoid,
          name,
          city,
          county,
          centroid: [lng, lat],
        },
        geometry: simplified.geometry as Polygon | MultiPolygon,
      };

      features.push(feature);
      index.push({ geoid, name, city, county, centroid: [lng, lat], bounds });
    }

    result = await source.read();
  }

  const collection: FeatureCollection = {
    type: "FeatureCollection",
    features,
  };

  fs.mkdirSync(path.dirname(OUT_GEOJSON), { recursive: true });
  const geojson = JSON.stringify(collection);
  fs.writeFileSync(OUT_GEOJSON, geojson, "utf8");

  emitIndex(index);

  const sizeMb = (Buffer.byteLength(geojson) / (1024 * 1024)).toFixed(2);
  console.log(`Wrote ${features.length} tracts → ${OUT_GEOJSON} (${sizeMb} MB)`);
  console.log(`Wrote tract index → ${OUT_INDEX}`);

  const fremontSamples = index
    .filter((e) => e.city === "Fremont")
    .map((e) => e.name)
    .filter((n, i, arr) => arr.indexOf(n) === i)
    .slice(0, 10);
  if (fremontSamples.length > 0) {
    console.log("Fremont area names:", fremontSamples.join(", "));
  }

  if (parseFloat(sizeMb) > 8) {
    console.warn(
      `⚠ GeoJSON is ${sizeMb} MB (target <8 MB). Consider PMTiles conversion.`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
