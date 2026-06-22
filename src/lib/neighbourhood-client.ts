import type { BBox } from "geojson";
import type { NeighbourhoodCensusData } from "@/lib/neighbourhood";
import { getTractByGeoid } from "@/lib/tracts";
import type { AreaSelection } from "@/store/useAppStore";

export interface NeighbourhoodSearchHit {
  id: string;
  displayName: string;
  city: string;
  county: string;
  bbox: BBox;
}

export interface NeighbourhoodResolveHit {
  id: string | null;
  displayName: string;
  city: string;
  county?: string;
  bbox?: BBox;
}

export interface NeighbourhoodProfile {
  id: string;
  displayName: string;
  city: string;
  county: string;
  bbox: BBox;
  primaryGeoid: string | null;
}

export async function searchNeighbourhoodsApi(
  query: string
): Promise<NeighbourhoodSearchHit[]> {
  const res = await fetch(
    `/api/neighbourhood/search?q=${encodeURIComponent(query)}`
  );
  if (!res.ok) return [];
  const json = (await res.json()) as { results: NeighbourhoodSearchHit[] };
  return json.results ?? [];
}

export async function resolveNeighbourhoodApi(
  geoid: string
): Promise<NeighbourhoodResolveHit | null> {
  const res = await fetch(
    `/api/neighbourhood/resolve?geoid=${encodeURIComponent(geoid)}`
  );
  if (!res.ok) return null;
  return (await res.json()) as NeighbourhoodResolveHit;
}

/** Resolve tract GEOID to user-facing area identity (neighbourhood or city fallback). */
export async function resolveAreaSelection(geoid: string): Promise<AreaSelection> {
  const tract = getTractByGeoid(geoid);
  const resolved = await resolveNeighbourhoodApi(geoid);

  const city = resolved?.city ?? tract?.city ?? "";
  const county = resolved?.county ?? tract?.county ?? "Bay Area";

  return {
    neighbourhoodId: resolved?.id ?? null,
    geoid,
    displayName: resolved?.displayName ?? (city || "Selected area"),
    city,
    county,
  };
}

export async function fetchNeighbourhoodProfile(
  id: string
): Promise<NeighbourhoodProfile | null> {
  const res = await fetch(`/api/neighbourhood/${encodeURIComponent(id)}/profile`);
  if (!res.ok) return null;
  return (await res.json()) as NeighbourhoodProfile;
}

export async function fetchNeighbourhoodCensus(
  id: string,
  year: string
): Promise<NeighbourhoodCensusData | null> {
  const res = await fetch(
    `/api/neighbourhood/${encodeURIComponent(id)}?year=${encodeURIComponent(year)}`
  );
  if (!res.ok) return null;
  return (await res.json()) as NeighbourhoodCensusData;
}
