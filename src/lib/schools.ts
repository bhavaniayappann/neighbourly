import type { SchoolsData } from "@/types";
import { withCache } from "./cache";
import { getNeighbourhoodProfile } from "./neighbourhood";
import {
  aggregateSchoolsData,
  emptySchoolsData,
  parseSchoolElements,
  type OsmSchoolElement,
} from "./school-ranking";
import { getTractByGeoid } from "./tracts";

interface OverpassResponse {
  elements: OsmSchoolElement[];
}

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

async function queryOverpass(
  lat: number,
  lng: number,
  radiusMeters: number
): Promise<OsmSchoolElement[]> {
  const query = `
[out:json][timeout:10];
(
  node["amenity"="school"](around:${radiusMeters},${lat},${lng});
  way["amenity"="school"](around:${radiusMeters},${lat},${lng});
  relation["amenity"="school"](around:${radiusMeters},${lat},${lng});
);
out center tags;
`.trim();

  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Neighbourly/1.0 (school lookup)",
        },
        body: `data=${encodeURIComponent(query)}`,
      });
      if (!res.ok) continue;
      const json = (await res.json()) as OverpassResponse;
      return json.elements ?? [];
    } catch {
      continue;
    }
  }

  return [];
}

async function fetchSchoolsNearUncached(
  lat: number,
  lng: number,
  radiusMeters: number,
  city?: string
): Promise<SchoolsData> {
  const elements = await queryOverpass(lat, lng, radiusMeters);
  const schools = parseSchoolElements(elements);
  if (schools.length === 0) return emptySchoolsData(city);
  return aggregateSchoolsData(schools);
}

export async function getSchoolsForGeoid(geoid: string): Promise<SchoolsData> {
  const tract = getTractByGeoid(geoid);
  if (!tract) return emptySchoolsData();

  const [lng, lat] = tract.centroid;
  return withCache(geoid, "schools", () =>
    fetchSchoolsNearUncached(lat, lng, 1500, tract.city)
  );
}

export async function getSchoolsForNeighbourhood(
  neighbourhoodId: string
): Promise<SchoolsData> {
  const profile = await getNeighbourhoodProfile(neighbourhoodId);
  if (!profile) return emptySchoolsData();

  const lat = (profile.bbox[1] + profile.bbox[3]) / 2;
  const lng = (profile.bbox[0] + profile.bbox[2]) / 2;

  return withCache(`nh:${neighbourhoodId}`, "schools", () =>
    fetchSchoolsNearUncached(lat, lng, 2500, profile.city)
  );
}
