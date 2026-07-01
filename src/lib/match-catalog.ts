import fremontData from "@/data/fremont-neighbourhoods.json";
import { BAY_AREA_TRACT_INDEX } from "@/data/bay-area-tract-index";
import type { MatchCandidate } from "@/types";

const MATCH_COUNTIES = new Set(["Alameda", "Contra Costa", "Santa Clara"]);
const CITIES_WITH_CURATED = new Set(["Fremont"]);

interface StaticNeighbourhood {
  id: string;
  displayName: string;
  city: string;
  county: string;
  centroidLat: number;
  centroidLng: number;
  bbox: [number, number, number, number];
}

interface StaticJunction {
  neighbourhoodId: string;
  tractGeoid: string;
}

const fremont = fremontData as unknown as {
  neighbourhoods: StaticNeighbourhood[];
  tracts: StaticJunction[];
};

const staticNeighbourhoods = fremont.neighbourhoods;
const staticJunctions = fremont.tracts;

function buildCuratedCandidates(): MatchCandidate[] {
  return staticNeighbourhoods.map((n) => {
    const tractGeoids = staticJunctions
      .filter((j) => j.neighbourhoodId === n.id)
      .map((j) => j.tractGeoid);

    return {
      id: n.id,
      displayName: n.displayName,
      city: n.city,
      county: n.county,
      source: "curated",
      neighbourhoodId: n.id,
      centroid: [n.centroidLng, n.centroidLat],
      bbox: n.bbox,
      primaryGeoid: tractGeoids[0] ?? "",
      tractGeoids,
    };
  });
}

function buildCityCandidates(): MatchCandidate[] {
  const byCity = new Map<
    string,
    {
      city: string;
      county: string;
      tracts: typeof BAY_AREA_TRACT_INDEX;
    }
  >();

  for (const tract of BAY_AREA_TRACT_INDEX) {
    if (!MATCH_COUNTIES.has(tract.county)) continue;
    if (CITIES_WITH_CURATED.has(tract.city)) continue;
    if (!tract.city?.trim()) continue;

    const key = `${tract.city}|${tract.county}`;
    const entry = byCity.get(key) ?? {
      city: tract.city,
      county: tract.county,
      tracts: [],
    };
    entry.tracts.push(tract);
    byCity.set(key, entry);
  }

  const candidates: MatchCandidate[] = [];

  for (const [key, { city, county, tracts }] of Array.from(byCity.entries())) {
    if (tracts.length < 2) continue;

    let west = Infinity;
    let south = Infinity;
    let east = -Infinity;
    let north = -Infinity;
    let sumLng = 0;
    let sumLat = 0;

    for (const t of tracts) {
      const [minLng, minLat, maxLng, maxLat] = t.bounds;
      west = Math.min(west, minLng);
      south = Math.min(south, minLat);
      east = Math.max(east, maxLng);
      north = Math.max(north, maxLat);
      sumLng += t.centroid[0];
      sumLat += t.centroid[1];
    }

    candidates.push({
      id: `city:${key.toLowerCase().replace(/\s+/g, "-")}`,
      displayName: city,
      city,
      county,
      source: "city",
      neighbourhoodId: null,
      centroid: [sumLng / tracts.length, sumLat / tracts.length],
      bbox: [west, south, east, north],
      primaryGeoid: tracts[0]!.geoid,
      tractGeoids: tracts.map((t) => t.geoid),
    });
  }

  return candidates.sort((a, b) => a.city.localeCompare(b.city));
}

let cachedCandidates: MatchCandidate[] | null = null;

export function getMatchCandidates(): MatchCandidate[] {
  if (!cachedCandidates) {
    cachedCandidates = [...buildCuratedCandidates(), ...buildCityCandidates()];
  }
  return cachedCandidates;
}
