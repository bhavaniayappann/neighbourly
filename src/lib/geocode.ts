import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { point } from "@turf/helpers";
import type { FeatureCollection } from "geojson";
import {
  searchTracts,
  dedupeSearchResults,
  getTractByGeoid,
  type TractEntry,
} from "./tracts";

export interface GeocodeResult {
  entry: TractEntry;
  matchType: "name" | "zip" | "partial" | "geocoder";
}

let tractGeometries: FeatureCollection | null = null;
let geometryLoadPromise: Promise<FeatureCollection> | null = null;

export function loadTractGeometries(): Promise<FeatureCollection> {
  if (tractGeometries) return Promise.resolve(tractGeometries);
  if (geometryLoadPromise) return geometryLoadPromise;

  geometryLoadPromise = fetch("/data/bay-area-tracts.geojson")
    .then((res) => {
      if (!res.ok) throw new Error("Failed to load tract geometries");
      return res.json() as Promise<FeatureCollection>;
    })
    .then((data) => {
      tractGeometries = data;
      return data;
    });

  return geometryLoadPromise;
}

export function resolveTractAtPoint(lng: number, lat: number): TractEntry | null {
  if (!tractGeometries) return null;

  const pt = point([lng, lat]);
  for (const feature of tractGeometries.features) {
    if (
      feature.geometry &&
      booleanPointInPolygon(pt, feature.geometry as GeoJSON.Polygon | GeoJSON.MultiPolygon)
    ) {
      const geoid = feature.properties?.geoid as string;
      return getTractByGeoid(geoid) ?? null;
    }
  }
  return null;
}

export function geocodeLocal(query: string): GeocodeResult | null {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const matches = dedupeSearchResults(searchTracts(trimmed));
  if (matches.length === 0) return null;

  const exact = matches.find(
    (t) =>
      t.name.toLowerCase() === trimmed.toLowerCase() ||
      t.city.toLowerCase() === trimmed.toLowerCase()
  );
  if (exact) return { entry: exact, matchType: "name" };

  if (matches.length === 1) {
    return { entry: matches[0], matchType: "partial" };
  }

  const best = matches.find(
    (t) =>
      t.name.toLowerCase().startsWith(trimmed.toLowerCase()) ||
      t.city.toLowerCase().startsWith(trimmed.toLowerCase())
  );
  if (best) return { entry: best, matchType: "partial" };

  return null;
}

export async function geocodeQuery(query: string): Promise<GeocodeResult | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const local = geocodeLocal(trimmed);
  if (local) return local;

  try {
    const res = await fetch(`/api/geocode?q=${encodeURIComponent(trimmed)}`);
    if (!res.ok) return null;

    const data = (await res.json()) as {
      lng: number;
      lat: number;
      matchType: "zip" | "geocoder";
    };

    await loadTractGeometries();
    const tract = resolveTractAtPoint(data.lng, data.lat);
    if (!tract) return null;

    return { entry: tract, matchType: data.matchType };
  } catch {
    return null;
  }
}

export async function searchGeocodeSuggestions(
  query: string
): Promise<TractEntry[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const local = dedupeSearchResults(searchTracts(trimmed));
  if (local.length > 0) return local.slice(0, 8);

  if (/^\d{5}$/.test(trimmed)) {
    const result = await geocodeQuery(trimmed);
    return result ? [result.entry] : [];
  }

  return [];
}
