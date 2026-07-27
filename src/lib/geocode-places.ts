import { BAY_AREA_BOUNDS } from "./regions";
import { BAY_AREA_TRACTS, dedupeSearchResults, searchTracts } from "./tracts";

const CENSUS_GEOCODER =
  "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress";

const NOMINATIM = "https://nominatim.openstreetmap.org/search";

export interface GeoPoint {
  lat: number;
  lng: number;
}

interface CensusGeocoderResponse {
  result?: {
    addressMatches?: Array<{
      coordinates: { x: number; y: number };
    }>;
  };
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
  place_id: number;
}

export interface AddressSuggestion {
  id: string;
  label: string;
  lat: number;
  lng: number;
}

function geocodeFromLocalIndex(query: string): GeoPoint | null {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return null;

  const cityTracts = BAY_AREA_TRACTS.filter(
    (t) => t.city.toLowerCase() === normalized
  );
  if (cityTracts.length > 0) {
    const lng =
      cityTracts.reduce((sum, t) => sum + t.centroid[0], 0) / cityTracts.length;
    const lat =
      cityTracts.reduce((sum, t) => sum + t.centroid[1], 0) / cityTracts.length;
    return { lng, lat };
  }

  const exactName = dedupeSearchResults(
    BAY_AREA_TRACTS.filter((t) => t.name.toLowerCase() === normalized)
  );
  if (exactName.length === 1) {
    const tract = exactName[0]!;
    return { lng: tract.centroid[0], lat: tract.centroid[1] };
  }

  const partial = dedupeSearchResults(searchTracts(normalized));
  if (partial.length === 1) {
    const tract = partial[0]!;
    return { lng: tract.centroid[0], lat: tract.centroid[1] };
  }

  return null;
}

async function geocodeFromCensus(query: string): Promise<GeoPoint | null> {
  const trimmed = query.trim();
  const attempts = /^\d{5}$/.test(trimmed)
    ? [`${trimmed}, CA`]
    : [`${trimmed}, CA`, `${trimmed}, California`];

  for (const address of attempts) {
    const params = new URLSearchParams({
      address,
      benchmark: "Public_AR_Current",
      format: "json",
    });

    try {
      const res = await fetch(`${CENSUS_GEOCODER}?${params.toString()}`, {
        next: { revalidate: 86400 },
      });
      if (!res.ok) continue;

      const json = (await res.json()) as CensusGeocoderResponse;
      const match = json.result?.addressMatches?.[0];
      if (match) {
        return { lng: match.coordinates.x, lat: match.coordinates.y };
      }
    } catch {
      continue;
    }
  }

  return null;
}

async function geocodeFromNominatim(query: string): Promise<GeoPoint | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const params = new URLSearchParams({
    q: `${trimmed}, California, USA`,
    format: "json",
    limit: "1",
    viewbox: `${BAY_AREA_BOUNDS.west},${BAY_AREA_BOUNDS.north},${BAY_AREA_BOUNDS.east},${BAY_AREA_BOUNDS.south}`,
    bounded: "1",
  });

  try {
    const res = await fetch(`${NOMINATIM}?${params.toString()}`, {
      headers: { "User-Agent": "Neighbourly/1.0 (commute geocode)" },
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;

    const results = (await res.json()) as NominatimResult[];
    const hit = results[0];
    if (!hit) return null;

    const lat = parseFloat(hit.lat);
    const lng = parseFloat(hit.lon);
    if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

    return { lat, lng };
  } catch {
    return null;
  }
}

/** Resolve a place name or ZIP to coordinates (Bay Area–aware). */
export async function geocodePlace(query: string): Promise<GeoPoint | null> {
  const trimmed = query.trim();
  if (!trimmed) return null;

  const local = geocodeFromLocalIndex(trimmed);
  if (local) return local;

  const census = await geocodeFromCensus(trimmed);
  if (census) return census;

  return geocodeFromNominatim(trimmed);
}

/** Street-address suggestions for Bay Area (Nominatim). */
export async function searchAddressSuggestions(
  query: string
): Promise<AddressSuggestion[]> {
  const trimmed = query.trim();
  if (trimmed.length < 3) return [];

  const params = new URLSearchParams({
    q: `${trimmed}, California, USA`,
    format: "json",
    limit: "6",
    addressdetails: "1",
    viewbox: `${BAY_AREA_BOUNDS.west},${BAY_AREA_BOUNDS.north},${BAY_AREA_BOUNDS.east},${BAY_AREA_BOUNDS.south}`,
    bounded: "1",
    countrycodes: "us",
  });

  try {
    const res = await fetch(`${NOMINATIM}?${params.toString()}`, {
      headers: { "User-Agent": "Neighbourly/1.0 (address suggest)" },
      next: { revalidate: 3600 },
    });
    if (!res.ok) return [];

    const results = (await res.json()) as NominatimResult[];
    const suggestions: AddressSuggestion[] = [];

    for (const hit of results) {
      const lat = parseFloat(hit.lat);
      const lng = parseFloat(hit.lon);
      if (Number.isNaN(lat) || Number.isNaN(lng)) continue;

      suggestions.push({
        id: String(hit.place_id),
        label: hit.display_name,
        lat,
        lng,
      });
    }

    return suggestions;
  } catch {
    return [];
  }
}
