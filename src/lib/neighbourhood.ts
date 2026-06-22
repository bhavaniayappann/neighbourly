import staticData from "@/data/fremont-neighbourhoods.json";
import type { CensusTractData } from "@/types";
import { withCache } from "./cache";
import {
  DEFAULT_ACS_YEAR,
  fetchTractCensus,
  type AcsYear,
} from "./census";
import { getTractByGeoid } from "./tracts";
import { getSupabaseAdmin, isSupabaseConfigured } from "./supabase";

export type NeighbourhoodBbox = [number, number, number, number];

export interface Neighbourhood {
  id: string;
  displayName: string;
  city: string;
  county: string;
  centroidLat: number;
  centroidLng: number;
  bbox: NeighbourhoodBbox;
}

export interface NeighbourhoodTract {
  neighbourhoodId: string;
  tractGeoid: string;
  weight: number;
}

export interface NeighbourhoodSearchResult {
  id: string;
  displayName: string;
  city: string;
  county: string;
  bbox: NeighbourhoodBbox;
}

export interface NeighbourhoodResolveResult {
  id: string | null;
  displayName: string;
  city: string;
  county?: string;
  bbox?: NeighbourhoodBbox;
}

export interface NeighbourhoodProfile {
  id: string;
  displayName: string;
  city: string;
  county: string;
  bbox: NeighbourhoodBbox;
  primaryGeoid: string | null;
}

export interface NeighbourhoodCensusData {
  id: string;
  displayName: string;
  city: string;
  county: string;
  population: number;
  medianIncome: number;
  medianRent: number;
  bachelorsPlus: number;
}

interface StaticNeighbourhoodData {
  neighbourhoods: Array<{
    id: string;
    displayName: string;
    city: string;
    county: string;
    centroidLat: number;
    centroidLng: number;
    bbox: NeighbourhoodBbox;
  }>;
  tracts: NeighbourhoodTract[];
}

interface DbNeighbourhoodRow {
  id: string;
  display_name: string;
  city: string;
  county: string;
  centroid_lat: number;
  centroid_lng: number;
  bbox: NeighbourhoodBbox;
}

interface DbNeighbourhoodTractRow {
  neighbourhood_id: string;
  tract_geoid: string;
  weight: number;
}

const fallbackData = staticData as StaticNeighbourhoodData;

function rowToNeighbourhood(row: DbNeighbourhoodRow): Neighbourhood {
  return {
    id: row.id,
    displayName: row.display_name,
    city: row.city,
    county: row.county,
    centroidLat: row.centroid_lat,
    centroidLng: row.centroid_lng,
    bbox: row.bbox,
  };
}

function staticNeighbourhoodToModel(
  row: StaticNeighbourhoodData["neighbourhoods"][number]
): Neighbourhood {
  return {
    id: row.id,
    displayName: row.displayName,
    city: row.city,
    county: row.county,
    centroidLat: row.centroidLat,
    centroidLng: row.centroidLng,
    bbox: row.bbox,
  };
}

function toSearchResult(n: Neighbourhood): NeighbourhoodSearchResult {
  return {
    id: n.id,
    displayName: n.displayName,
    city: n.city,
    county: n.county,
    bbox: n.bbox,
  };
}

function cityFallbackForGeoid(geoid: string): NeighbourhoodResolveResult {
  const tract = getTractByGeoid(geoid);
  const city = tract?.city ?? "Bay Area";
  const county = tract?.county;

  console.warn(`Unmapped tract GEOID (no neighbourhood): ${geoid}`);

  return {
    id: null,
    displayName: city,
    city,
    ...(county ? { county } : {}),
  };
}

async function getNeighbourhoodByIdFromDb(
  id: string
): Promise<Neighbourhood | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("neighbourhood")
    .select(
      "id, display_name, city, county, centroid_lat, centroid_lng, bbox"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.warn(`neighbourhood lookup failed for ${id}:`, error.message);
    return null;
  }

  if (!data) return null;
  return rowToNeighbourhood(data as DbNeighbourhoodRow);
}

function getNeighbourhoodByIdFromStatic(id: string): Neighbourhood | null {
  const row = fallbackData.neighbourhoods.find((n) => n.id === id);
  return row ? staticNeighbourhoodToModel(row) : null;
}

export async function getNeighbourhoodById(
  id: string
): Promise<Neighbourhood | null> {
  if (isSupabaseConfigured()) {
    const fromDb = await getNeighbourhoodByIdFromDb(id);
    if (fromDb) return fromDb;
  }

  return getNeighbourhoodByIdFromStatic(id);
}

async function searchNeighbourhoodsFromDb(
  query: string
): Promise<NeighbourhoodSearchResult[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const pattern = `%${query}%`;
  const { data, error } = await supabase
    .from("neighbourhood")
    .select("id, display_name, city, county, centroid_lat, centroid_lng, bbox")
    .or(`display_name.ilike.${pattern},city.ilike.${pattern}`)
    .order("display_name")
    .limit(20);

  if (error) {
    console.warn("neighbourhood search failed:", error.message);
    return [];
  }

  return (data as DbNeighbourhoodRow[]).map((row) =>
    toSearchResult(rowToNeighbourhood(row))
  );
}

function searchNeighbourhoodsFromStatic(
  query: string
): NeighbourhoodSearchResult[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return [];

  return fallbackData.neighbourhoods
    .filter(
      (n) =>
        n.displayName.toLowerCase().includes(normalized) ||
        n.city.toLowerCase().includes(normalized)
    )
    .map((n) => toSearchResult(staticNeighbourhoodToModel(n)));
}

export async function searchNeighbourhoods(
  query: string
): Promise<NeighbourhoodSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  if (isSupabaseConfigured()) {
    const fromDb = await searchNeighbourhoodsFromDb(trimmed);
    if (fromDb.length > 0) return fromDb;
  }

  return searchNeighbourhoodsFromStatic(trimmed);
}

async function getTractsForNeighbourhoodFromDb(
  neighbourhoodId: string
): Promise<NeighbourhoodTract[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("neighbourhood_tract")
    .select("neighbourhood_id, tract_geoid, weight")
    .eq("neighbourhood_id", neighbourhoodId);

  if (error) {
    console.warn(
      `neighbourhood_tract lookup failed for ${neighbourhoodId}:`,
      error.message
    );
    return [];
  }

  return (data as DbNeighbourhoodTractRow[]).map((row) => ({
    neighbourhoodId: row.neighbourhood_id,
    tractGeoid: row.tract_geoid,
    weight: row.weight,
  }));
}

function getTractsForNeighbourhoodFromStatic(
  neighbourhoodId: string
): NeighbourhoodTract[] {
  return fallbackData.tracts.filter(
    (t) => t.neighbourhoodId === neighbourhoodId
  );
}

async function getTractsForNeighbourhood(
  neighbourhoodId: string
): Promise<NeighbourhoodTract[]> {
  if (isSupabaseConfigured()) {
    const fromDb = await getTractsForNeighbourhoodFromDb(neighbourhoodId);
    if (fromDb.length > 0) return fromDb;
  }

  return getTractsForNeighbourhoodFromStatic(neighbourhoodId);
}

async function resolveNeighbourhoodForTractFromDb(
  geoid: string
): Promise<Neighbourhood | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data: junction, error } = await supabase
    .from("neighbourhood_tract")
    .select("neighbourhood_id")
    .eq("tract_geoid", geoid)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn(`neighbourhood resolve failed for ${geoid}:`, error.message);
    return null;
  }

  if (!junction?.neighbourhood_id) return null;

  return getNeighbourhoodByIdFromDb(junction.neighbourhood_id);
}

function resolveNeighbourhoodForTractFromStatic(
  geoid: string
): Neighbourhood | null {
  const junction = fallbackData.tracts.find((t) => t.tractGeoid === geoid);
  if (!junction) return null;

  return getNeighbourhoodByIdFromStatic(junction.neighbourhoodId);
}

export async function resolveNeighbourhoodForTract(
  geoid: string
): Promise<NeighbourhoodResolveResult> {
  let neighbourhood: Neighbourhood | null = null;

  if (isSupabaseConfigured()) {
    neighbourhood = await resolveNeighbourhoodForTractFromDb(geoid);
  }

  if (!neighbourhood) {
    neighbourhood = resolveNeighbourhoodForTractFromStatic(geoid);
  }

  if (!neighbourhood) {
    return cityFallbackForGeoid(geoid);
  }

  return {
    id: neighbourhood.id,
    displayName: neighbourhood.displayName,
    city: neighbourhood.city,
    county: neighbourhood.county,
    bbox: neighbourhood.bbox,
  };
}

function aggregateTractCensus(
  tractData: CensusTractData[]
): Pick<
  NeighbourhoodCensusData,
  "population" | "medianIncome" | "medianRent" | "bachelorsPlus"
> {
  if (tractData.length === 0) {
    return {
      population: 0,
      medianIncome: 0,
      medianRent: 0,
      bachelorsPlus: 0,
    };
  }

  const totalPop = tractData.reduce((sum, t) => sum + t.population, 0);

  if (totalPop === 0) {
    const n = tractData.length;
    return {
      population: 0,
      medianIncome: Math.round(
        tractData.reduce((s, t) => s + t.medianIncome, 0) / n
      ),
      medianRent: Math.round(
        tractData.reduce((s, t) => s + t.medianRent, 0) / n
      ),
      bachelorsPlus: Math.round(
        tractData.reduce((s, t) => s + t.bachelorsPlus, 0) / n
      ),
    };
  }

  return {
    population: totalPop,
    medianIncome: Math.round(
      tractData.reduce((s, t) => s + t.medianIncome * t.population, 0) /
        totalPop
    ),
    medianRent: Math.round(
      tractData.reduce((s, t) => s + t.medianRent * t.population, 0) / totalPop
    ),
    bachelorsPlus: Math.round(
      tractData.reduce((s, t) => s + t.bachelorsPlus * t.population, 0) /
        totalPop
    ),
  };
}

async function fetchNeighbourhoodCensusUncached(
  id: string,
  year: AcsYear
): Promise<NeighbourhoodCensusData | null> {
  const neighbourhood = await getNeighbourhoodById(id);
  if (!neighbourhood) return null;

  const junctions = await getTractsForNeighbourhood(id);
  const activeJunctions = junctions.filter((j) => j.weight > 0);

  const tractGeoids = activeJunctions.map((j) => j.tractGeoid);
  const tractResults = await Promise.all(
    tractGeoids.map(async (geoid) => {
      const cacheKey = `${geoid}:${year}`;
      return withCache(cacheKey, "demographics", () =>
        fetchTractCensus(geoid, year)
      );
    })
  );

  const demographics = aggregateTractCensus(tractResults);

  return {
    id: neighbourhood.id,
    displayName: neighbourhood.displayName,
    city: neighbourhood.city,
    county: neighbourhood.county,
    ...demographics,
  };
}

export async function getNeighbourhoodProfile(
  id: string
): Promise<NeighbourhoodProfile | null> {
  const neighbourhood = await getNeighbourhoodById(id);
  if (!neighbourhood) return null;

  const junctions = await getTractsForNeighbourhood(id);
  const primaryGeoid = junctions.find((j) => j.weight > 0)?.tractGeoid ?? null;

  return {
    id: neighbourhood.id,
    displayName: neighbourhood.displayName,
    city: neighbourhood.city,
    county: neighbourhood.county,
    bbox: neighbourhood.bbox,
    primaryGeoid,
  };
}

export async function getNeighbourhoodCensus(
  id: string,
  year: AcsYear = DEFAULT_ACS_YEAR
): Promise<NeighbourhoodCensusData | null> {
  const cacheKey = `nh:${id}:${year}`;

  return withCache(cacheKey, "demographics", () =>
    fetchNeighbourhoodCensusUncached(id, year)
  );
}
