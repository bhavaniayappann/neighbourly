/**
 * Assigns Fremont census tracts to curated neighbourhoods via spatial bbox overlap,
 * computes population weights, upserts junction rows to Supabase, and writes a local
 * JSON fallback for dev without a database.
 *
 * Usage: npm run seed:neighbourhoods
 */

import fs from "node:fs";
import path from "node:path";

import bbox from "@turf/bbox";
import centroid from "@turf/centroid";
import type { BBox, FeatureCollection, Polygon, MultiPolygon } from "geojson";

const ROOT = path.resolve(__dirname, "..");
const GEOJSON_PATH = path.join(ROOT, "public", "data", "bay-area-tracts.geojson");
const OUT_JSON = path.join(ROOT, "src", "data", "fremont-neighbourhoods.json");
const OUT_SQL = path.join(ROOT, "supabase", "seed", "fremont-neighbourhood-tract.sql");

export interface NeighbourhoodSeed {
  id: string;
  displayName: string;
  city: string;
  county: string;
  centroid: [number, number]; // [lng, lat]
  bbox: BBox; // [west, south, east, north]
}

/** Illustrative bboxes from the geography strategy doc. */
export const FREMONT_NEIGHBOURHOODS: NeighbourhoodSeed[] = [
  {
    id: "niles-fremont",
    displayName: "Niles",
    city: "Fremont",
    county: "Alameda",
    centroid: [-121.978, 37.5766],
    bbox: [-122.0, 37.56, -121.96, 37.59],
  },
  {
    id: "mission-san-jose-fremont",
    displayName: "Mission San Jose",
    city: "Fremont",
    county: "Alameda",
    centroid: [-121.9211, 37.5124],
    bbox: [-121.94, 37.5, -121.9, 37.53],
  },
  {
    id: "ardenwood-fremont",
    displayName: "Ardenwood",
    city: "Fremont",
    county: "Alameda",
    centroid: [-122.0197, 37.5549],
    bbox: [-122.04, 37.54, -122.0, 37.57],
  },
  {
    id: "irvington-fremont",
    displayName: "Irvington",
    city: "Fremont",
    county: "Alameda",
    centroid: [-121.9736, 37.5271],
    bbox: [-121.99, 37.51, -121.95, 37.54],
  },
  {
    id: "centerville-fremont",
    displayName: "Centerville",
    city: "Fremont",
    county: "Alameda",
    centroid: [-121.9886, 37.5485],
    bbox: [-122.01, 37.53, -121.97, 37.57],
  },
  {
    id: "warm-springs-fremont",
    displayName: "Warm Springs",
    city: "Fremont",
    county: "Alameda",
    centroid: [-121.9419, 37.4974],
    bbox: [-121.96, 37.48, -121.92, 37.52],
  },
];

interface TractProperties {
  geoid: string;
  name: string;
  city: string;
  county: string;
  centroid?: [number, number];
}

interface JunctionRow {
  neighbourhoodId: string;
  tractGeoid: string;
  weight: number;
}

function loadEnvLocal(): void {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key]) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function bboxOverlapArea(a: BBox, b: BBox): number {
  const west = Math.max(a[0], b[0]);
  const south = Math.max(a[1], b[1]);
  const east = Math.min(a[2], b[2]);
  const north = Math.min(a[3], b[3]);
  if (east <= west || north <= south) return 0;
  return (east - west) * (north - south);
}

function centroidInBbox(lng: number, lat: number, box: BBox): boolean {
  return lng >= box[0] && lng <= box[2] && lat >= box[1] && lat <= box[3];
}

function assignNeighbourhood(
  tractBbox: BBox,
  tractCentroid: [number, number],
  neighbourhoods: NeighbourhoodSeed[]
): NeighbourhoodSeed {
  const containing = neighbourhoods.filter((n) =>
    centroidInBbox(tractCentroid[0], tractCentroid[1], n.bbox)
  );
  if (containing.length === 1) return containing[0];

  let best = neighbourhoods[0];
  let bestOverlap = -1;

  for (const n of neighbourhoods) {
    const overlap = bboxOverlapArea(tractBbox, n.bbox);
    if (overlap > bestOverlap) {
      bestOverlap = overlap;
      best = n;
    }
  }

  if (bestOverlap > 0) return best;

  let closest = neighbourhoods[0];
  let closestDist = Number.POSITIVE_INFINITY;
  for (const n of neighbourhoods) {
    const dx = tractCentroid[0] - n.centroid[0];
    const dy = tractCentroid[1] - n.centroid[1];
    const dist = dx * dx + dy * dy;
    if (dist < closestDist) {
      closestDist = dist;
      closest = n;
    }
  }

  return closest;
}

async function fetchTractPopulations(
  geoids: string[]
): Promise<Map<string, number>> {
  const populations = new Map<string, number>();
  const key = process.env.CENSUS_API_KEY?.trim();
  if (!key) return populations;

  const batchSize = 40;
  for (let i = 0; i < geoids.length; i += batchSize) {
    const batch = geoids.slice(i, i + batchSize);
    const params = new URLSearchParams({
      get: "B01003_001E",
      for: `tract:${batch.map((g) => g.slice(5)).join(",")}`,
      in: "state:06 county:001",
      key,
    });

    const res = await fetch(
      `https://api.census.gov/data/2022/acs/acs5?${params.toString()}`
    );
    if (!res.ok) {
      console.warn(`Census population fetch failed: ${res.status}`);
      return populations;
    }

    const json = (await res.json()) as string[][];
    const [headers, ...rows] = json;
    for (const row of rows) {
      const record = Object.fromEntries(headers.map((h, idx) => [h, row[idx]]));
      const geoid = `06${record.county}${record.tract}`;
      const pop = parseInt(record.B01003_001E, 10);
      populations.set(geoid, Number.isFinite(pop) && pop > 0 ? pop : 0);
    }
  }

  return populations;
}

function computeWeights(
  assignments: JunctionRow[],
  populations: Map<string, number>
): JunctionRow[] {
  const byNeighbourhood = new Map<string, JunctionRow[]>();
  for (const row of assignments) {
    const list = byNeighbourhood.get(row.neighbourhoodId) ?? [];
    list.push(row);
    byNeighbourhood.set(row.neighbourhoodId, list);
  }

  const weighted: JunctionRow[] = [];
  for (const [, rows] of byNeighbourhood) {
    const hasPopulation = rows.some((r) => (populations.get(r.tractGeoid) ?? 0) > 0);
    const total = hasPopulation
      ? rows.reduce((sum, r) => sum + (populations.get(r.tractGeoid) ?? 0), 0)
      : rows.length;

    for (const row of rows) {
      const pop = populations.get(row.tractGeoid) ?? 0;
      const raw = hasPopulation ? pop : 1;
      weighted.push({
        ...row,
        weight: total > 0 ? raw / total : 1 / rows.length,
      });
    }
  }

  return weighted;
}

function buildAssignments(
  geojson: FeatureCollection<Polygon | MultiPolygon, TractProperties>
): JunctionRow[] {
  const fremontTracts = geojson.features.filter(
    (f) => f.properties?.city === "Fremont"
  );

  const raw: JunctionRow[] = [];
  for (const feature of fremontTracts) {
    const geoid = feature.properties.geoid;
    const tractBbox = bbox(feature) as BBox;
    const tractCentroid =
      feature.properties.centroid ??
      (centroid(feature).geometry.coordinates as [number, number]);

    const neighbourhood = assignNeighbourhood(
      tractBbox,
      tractCentroid,
      FREMONT_NEIGHBOURHOODS
    );

    raw.push({
      neighbourhoodId: neighbourhood.id,
      tractGeoid: geoid,
      weight: 0,
    });
  }

  return raw;
}

function writeSql(rows: JunctionRow[]): void {
  fs.mkdirSync(path.dirname(OUT_SQL), { recursive: true });
  const lines = [
    "-- Generated by scripts/seed-fremont-neighbourhoods.ts",
    "delete from neighbourhood_tract where neighbourhood_id like '%-fremont';",
    "",
    ...rows.map(
      (r) =>
        `insert into neighbourhood_tract (neighbourhood_id, tract_geoid, weight) values ('${r.neighbourhoodId}', '${r.tractGeoid}', ${r.weight.toFixed(6)}) on conflict (neighbourhood_id, tract_geoid) do update set weight = excluded.weight;`
    ),
    "",
  ];
  fs.writeFileSync(OUT_SQL, lines.join("\n"));
}

function writeJson(rows: JunctionRow[]): void {
  const payload = {
    neighbourhoods: FREMONT_NEIGHBOURHOODS.map((n) => ({
      id: n.id,
      displayName: n.displayName,
      city: n.city,
      county: n.county,
      centroidLat: n.centroid[1],
      centroidLng: n.centroid[0],
      bbox: n.bbox,
    })),
    tracts: rows.map((r) => ({
      neighbourhoodId: r.neighbourhoodId,
      tractGeoid: r.tractGeoid,
      weight: r.weight,
    })),
  };
  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });
  fs.writeFileSync(OUT_JSON, `${JSON.stringify(payload, null, 2)}\n`);
}

async function upsertSupabase(rows: JunctionRow[]): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.log("Supabase not configured — skipped DB upsert (wrote SQL + JSON only)");
    return;
  }

  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };

  const neighbourhoodRows = FREMONT_NEIGHBOURHOODS.map((n) => ({
    id: n.id,
    display_name: n.displayName,
    city: n.city,
    county: n.county,
    centroid_lat: n.centroid[1],
    centroid_lng: n.centroid[0],
    bbox: n.bbox,
  }));

  const nhRes = await fetch(`${url}/rest/v1/neighbourhood`, {
    method: "POST",
    headers: {
      ...headers,
      Prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(neighbourhoodRows),
  });
  if (!nhRes.ok) {
    throw new Error(`neighbourhood upsert failed: ${await nhRes.text()}`);
  }

  const delRes = await fetch(
    `${url}/rest/v1/neighbourhood_tract?neighbourhood_id=like.*-fremont`,
    {
      method: "DELETE",
      headers,
    }
  );
  if (!delRes.ok) {
    throw new Error(`neighbourhood_tract delete failed: ${await delRes.text()}`);
  }

  const junctionRows = rows.map((r) => ({
    neighbourhood_id: r.neighbourhoodId,
    tract_geoid: r.tractGeoid,
    weight: r.weight,
  }));

  const jRes = await fetch(`${url}/rest/v1/neighbourhood_tract`, {
    method: "POST",
    headers: {
      ...headers,
      Prefer: "return=minimal",
    },
    body: JSON.stringify(junctionRows),
  });
  if (!jRes.ok) {
    throw new Error(`neighbourhood_tract insert failed: ${await jRes.text()}`);
  }

  console.log(`Upserted ${junctionRows.length} junction rows to Supabase`);
}

async function main(): Promise<void> {
  loadEnvLocal();

  if (!fs.existsSync(GEOJSON_PATH)) {
    throw new Error(`Missing ${GEOJSON_PATH} — run npm run build:tracts first`);
  }

  const geojson = JSON.parse(
    fs.readFileSync(GEOJSON_PATH, "utf8")
  ) as FeatureCollection<Polygon | MultiPolygon, TractProperties>;

  const rawAssignments = buildAssignments(geojson);
  const geoids = rawAssignments.map((r) => r.tractGeoid);
  const populations = await fetchTractPopulations(geoids);
  const weighted = computeWeights(rawAssignments, populations);

  writeSql(weighted);
  writeJson(weighted);

  try {
    await upsertSupabase(weighted);
  } catch (err) {
    console.warn(
      "Supabase upsert skipped:",
      err instanceof Error ? err.message : err
    );
    console.warn("Apply supabase/seed/fremont-neighbourhood-tract.sql manually if needed.");
  }

  const summary = new Map<string, number>();
  for (const row of weighted) {
    summary.set(row.neighbourhoodId, (summary.get(row.neighbourhoodId) ?? 0) + 1);
  }

  console.log("Fremont neighbourhood tract assignments:");
  for (const n of FREMONT_NEIGHBOURHOODS) {
    console.log(`  ${n.displayName}: ${summary.get(n.id) ?? 0} tracts`);
  }
  console.log(`Wrote ${OUT_JSON}`);
  console.log(`Wrote ${OUT_SQL}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
