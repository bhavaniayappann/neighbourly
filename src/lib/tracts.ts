import type { BBox } from "geojson";
import {
  BAY_AREA_TRACT_INDEX,
  type TractIndexEntry,
} from "@/data/bay-area-tract-index";

export type { TractIndexEntry };

export interface TractEntry {
  geoid: string;
  name: string;
  city: string;
  county: string;
  centroid: [number, number];
  bounds: BBox;
}

export const BAY_AREA_TRACTS: TractEntry[] = BAY_AREA_TRACT_INDEX;

export function getTractByGeoid(geoid: string): TractEntry | undefined {
  return BAY_AREA_TRACTS.find((t) => t.geoid === geoid);
}

export function tractLabel(entry: TractEntry): string {
  if (entry.city && entry.name.toLowerCase() !== entry.city.toLowerCase()) {
    return `${entry.name}, ${entry.city}`;
  }
  if (entry.city) return entry.city;
  return `${entry.name}, ${entry.county} County`;
}

export function searchTracts(query: string): TractEntry[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  return BAY_AREA_TRACTS.filter(
    (t) =>
      t.name.toLowerCase().includes(normalized) ||
      t.city.toLowerCase().includes(normalized) ||
      t.county.toLowerCase().includes(normalized)
  );
}

/** One suggestion per unique name+city (picks tract closest to area centroid). */
export function dedupeSearchResults(entries: TractEntry[]): TractEntry[] {
  const byKey = new Map<string, TractEntry>();

  for (const entry of entries) {
    const key = `${entry.name.toLowerCase()}|${entry.city.toLowerCase()}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, entry);
      continue;
    }
    // Prefer entry whose name differs from city (neighbourhood vs city-only)
    if (
      existing.name.toLowerCase() === existing.city.toLowerCase() &&
      entry.name.toLowerCase() !== entry.city.toLowerCase()
    ) {
      byKey.set(key, entry);
    }
  }

  return Array.from(byKey.values());
}
