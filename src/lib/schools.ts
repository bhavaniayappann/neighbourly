import type { SchoolsData } from "@/types";
import { withCache } from "./cache";
import { getNeighbourhoodProfile } from "./neighbourhood";
import { getTractByGeoid } from "./tracts";

type SchoolLevel = "elementary" | "middle" | "high" | "unknown";

interface ParsedSchool {
  name: string;
  level: SchoolLevel;
  isPublic: boolean;
}

interface OverpassElement {
  type: string;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const LEVEL_RANK: Record<SchoolLevel, number> = {
  high: 3,
  middle: 2,
  elementary: 1,
  unknown: 0,
};

function classifyLevel(tags: Record<string, string>): SchoolLevel {
  const level = `${tags["school:level"] ?? ""} ${tags["isced:level"] ?? ""}`.toLowerCase();
  const name = (tags.name ?? "").toLowerCase();

  if (
    level.includes("high") ||
    level.includes("secondary") ||
    name.includes("high school")
  ) {
    return "high";
  }
  if (
    level.includes("middle") ||
    level.includes("junior") ||
    name.includes("middle school") ||
    name.includes("junior high")
  ) {
    return "middle";
  }
  if (
    level.includes("elementary") ||
    level.includes("primary") ||
    name.includes("elementary")
  ) {
    return "elementary";
  }
  return "unknown";
}

function isPublicSchool(tags: Record<string, string>): boolean {
  const operator = (tags.operator ?? "").toLowerCase();
  const operatorType = (tags["operator:type"] ?? "").toLowerCase();
  const name = (tags.name ?? "").toLowerCase();

  if (operatorType === "private") return false;
  if (tags.religion && tags.religion !== "none") return false;
  if (
    /private|charter|lutheran|catholic|christian|montessori|prep school/.test(
      name
    ) &&
    !/public/.test(name)
  ) {
    return false;
  }
  if (/school district|unified|public schools/.test(operator)) return true;
  return true;
}

function elementCoords(el: OverpassElement): [number, number] | null {
  if (typeof el.lat === "number" && typeof el.lon === "number") {
    return [el.lon, el.lat];
  }
  if (el.center) return [el.center.lon, el.center.lat];
  return null;
}

async function queryOverpass(
  lat: number,
  lng: number,
  radiusMeters: number
): Promise<OverpassElement[]> {
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

function parseSchoolElements(elements: OverpassElement[]): ParsedSchool[] {
  const seen = new Set<string>();
  const schools: ParsedSchool[] = [];

  for (const el of elements) {
    const name = el.tags?.name?.trim();
    if (!name || !elementCoords(el)) continue;

    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    schools.push({
      name,
      level: classifyLevel(el.tags ?? {}),
      isPublic: isPublicSchool(el.tags ?? {}),
    });
  }

  return schools;
}

export function aggregateSchoolsData(schools: ParsedSchool[]): SchoolsData {
  const elementaryCount = schools.filter((s) => s.level === "elementary").length;
  const middleCount = schools.filter((s) => s.level === "middle").length;
  const highCount = schools.filter((s) => s.level === "high").length;

  const ranked = [...schools].sort((a, b) => {
    const publicDiff = Number(b.isPublic) - Number(a.isPublic);
    if (publicDiff !== 0) return publicDiff;
    return LEVEL_RANK[b.level] - LEVEL_RANK[a.level];
  });

  const topSchool = ranked[0]?.name ?? "No schools found nearby";

  const levelScore =
    highCount > 0 ? 8.5 : middleCount > 0 ? 7.8 : elementaryCount > 0 ? 7.2 : 7.0;
  const breadthBonus = Math.min(1.2, schools.length * 0.08);
  const avgRating = Math.min(9.5, Math.round((levelScore + breadthBonus) * 10) / 10);

  return {
    avgRating,
    elementaryCount,
    middleCount,
    highCount,
    topSchool,
  };
}

function emptySchoolsData(city?: string): SchoolsData {
  return {
    avgRating: 7.0,
    elementaryCount: 0,
    middleCount: 0,
    highCount: 0,
    topSchool: city ? `${city} area schools` : "No schools found nearby",
  };
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
