/**
 * Fetches Bay Area schools from OSM in cached chunks and emits a compact
 * tract-centroid school ranking artifact.
 *
 * Usage: npm run build:schools
 */

import fs from "node:fs";
import path from "node:path";

import { BAY_AREA_TRACT_INDEX } from "../src/data/bay-area-tract-index";
import { BAY_AREA_BOUNDS } from "../src/lib/regions";
import {
  aggregateSchoolsData,
  emptySchoolsData,
  haversineDistanceKm,
  parseSchoolElements,
  type LocatedSchool,
  type OsmSchoolElement,
} from "../src/lib/school-ranking";
import type { SchoolsData } from "../src/types";

const ROOT = path.resolve(__dirname, "..");
const CACHE_DIR = path.join(ROOT, ".cache", "osm-schools");
const OUTPUT_PATH = path.join(ROOT, "public", "data", "bay-area-schools.json");
const SEARCH_RADIUS_KM = 1.5;
const CHUNK_SIZE_DEGREES = 0.8;
const REQUEST_DELAY_MS = 750;
const MAX_ATTEMPTS = 4;
const BOUNDS_PADDING_DEGREES = 0.025;

const OVERPASS_ENDPOINTS = [
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass.nchc.org.tw/api/interpreter",
];

interface Bounds {
  south: number;
  west: number;
  north: number;
  east: number;
}

interface OverpassResponse {
  elements?: OsmSchoolElement[];
}

function sleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export function createChunks(bounds: Bounds, size: number): Bounds[] {
  const chunks: Bounds[] = [];
  const rows = Math.ceil((bounds.north - bounds.south) / size - 1e-9);
  const columns = Math.ceil((bounds.east - bounds.west) / size - 1e-9);

  for (let row = 0; row < rows; row += 1) {
    const south = bounds.south + row * size;
    for (let column = 0; column < columns; column += 1) {
      const west = bounds.west + column * size;
      chunks.push({
        south,
        west,
        north: Math.min(south + size, bounds.north),
        east: Math.min(west + size, bounds.east),
      });
    }
  }

  return chunks;
}

function chunkCachePath(chunk: Bounds): string {
  const key = [chunk.south, chunk.west, chunk.north, chunk.east]
    .map((coordinate) => coordinate.toFixed(4).replace("-", "m").replace(".", "_"))
    .join("-");
  return path.join(CACHE_DIR, `${key}.json`);
}

async function fetchChunk(chunk: Bounds): Promise<OsmSchoolElement[]> {
  const cachePath = chunkCachePath(chunk);
  if (fs.existsSync(cachePath)) {
    return JSON.parse(fs.readFileSync(cachePath, "utf8")) as OsmSchoolElement[];
  }

  const query = `
[out:json][timeout:90];
(
  node["amenity"="school"](${chunk.south},${chunk.west},${chunk.north},${chunk.east});
  way["amenity"="school"](${chunk.south},${chunk.west},${chunk.north},${chunk.east});
  relation["amenity"="school"](${chunk.south},${chunk.west},${chunk.north},${chunk.east});
);
out center tags;
`.trim();

  let lastError: unknown;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const endpoint = OVERPASS_ENDPOINTS[attempt % OVERPASS_ENDPOINTS.length];

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        signal: AbortSignal.timeout(120_000),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "NeighbourlyBuild/1.0 (Bay Area school rankings)",
        },
        body: `data=${encodeURIComponent(query)}`,
      });

      if (!response.ok) {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      const json = (await response.json()) as OverpassResponse;
      const elements = json.elements ?? [];
      fs.mkdirSync(CACHE_DIR, { recursive: true });
      fs.writeFileSync(cachePath, JSON.stringify(elements), "utf8");
      return elements;
    } catch (error) {
      lastError = error;
      if (attempt + 1 < MAX_ATTEMPTS) {
        await sleep(2000 * (attempt + 1));
      }
    }
  }

  throw new Error(
    `Overpass failed for ${JSON.stringify(chunk)}: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

export async function fetchBayAreaSchools(): Promise<LocatedSchool[]> {
  const bounds = {
    south: BAY_AREA_BOUNDS.south - BOUNDS_PADDING_DEGREES,
    west: BAY_AREA_BOUNDS.west - BOUNDS_PADDING_DEGREES,
    north: BAY_AREA_BOUNDS.north + BOUNDS_PADDING_DEGREES,
    east: BAY_AREA_BOUNDS.east + BOUNDS_PADDING_DEGREES,
  };
  const chunks = createChunks(bounds, CHUNK_SIZE_DEGREES);
  const elements: OsmSchoolElement[] = [];

  for (const [index, chunk] of chunks.entries()) {
    const cachePath = chunkCachePath(chunk);
    const cached = fs.existsSync(cachePath);
    console.log(
      `${cached ? "Loading" : "Fetching"} school chunk ${index + 1}/${chunks.length}`
    );
    elements.push(...(await fetchChunk(chunk)));
    if (!cached && index + 1 < chunks.length) await sleep(REQUEST_DELAY_MS);
  }

  return parseSchoolElements(elements);
}

export function buildTractSchoolRankings(
  schools: LocatedSchool[]
): Record<string, SchoolsData> {
  const rankings: Record<string, SchoolsData> = {};

  for (const tract of BAY_AREA_TRACT_INDEX) {
    const [lng, lat] = tract.centroid;
    const nearby = schools.filter(
      (school) =>
        haversineDistanceKm(lng, lat, school.lng, school.lat) <= SEARCH_RADIUS_KM
    );
    rankings[tract.geoid] =
      nearby.length > 0 ? aggregateSchoolsData(nearby) : emptySchoolsData(tract.city);
  }

  return rankings;
}

async function main(): Promise<void> {
  console.log("Building Bay Area tract school rankings…");
  const schools = await fetchBayAreaSchools();
  const rankings = buildTractSchoolRankings(schools);
  const output = JSON.stringify(rankings);

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, output, "utf8");

  const ratings = new Set(Object.values(rankings).map((entry) => entry.avgRating));
  const noSchoolCount = Object.values(rankings).filter(
    (entry) =>
      entry.elementaryCount + entry.middleCount + entry.highCount === 0 &&
      entry.topSchool.endsWith("area schools")
  ).length;
  const sizeKb = (Buffer.byteLength(output) / 1024).toFixed(1);

  console.log(`Found ${schools.length} unique OSM schools`);
  console.log(
    `Wrote ${Object.keys(rankings).length} tract rankings → ${OUTPUT_PATH} (${sizeKb} KB)`
  );
  console.log(`${ratings.size} distinct ratings; ${noSchoolCount} tracts without schools`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
