import type { SchoolsData } from "@/types";

export type SchoolLevel = "elementary" | "middle" | "high" | "unknown";

export interface RankedSchool {
  name: string;
  level: SchoolLevel;
  isPublic: boolean;
}

export interface LocatedSchool extends RankedSchool {
  id: string;
  lng: number;
  lat: number;
}

export interface OsmSchoolElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

const LEVEL_RANK: Record<SchoolLevel, number> = {
  high: 3,
  middle: 2,
  elementary: 1,
  unknown: 0,
};

export function classifySchoolLevel(tags: Record<string, string>): SchoolLevel {
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

export function isPublicSchool(tags: Record<string, string>): boolean {
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

export function schoolElementCoordinates(
  element: OsmSchoolElement
): [number, number] | null {
  if (typeof element.lat === "number" && typeof element.lon === "number") {
    return [element.lon, element.lat];
  }
  if (element.center) return [element.center.lon, element.center.lat];
  return null;
}

export function parseSchoolElements(elements: OsmSchoolElement[]): LocatedSchool[] {
  const schools = new Map<string, LocatedSchool>();

  for (const element of elements) {
    const name = element.tags?.name?.trim();
    const coordinates = schoolElementCoordinates(element);
    if (!name || !coordinates) continue;

    const id = `${element.type}:${element.id}`;
    if (schools.has(id)) continue;

    schools.set(id, {
      id,
      name,
      level: classifySchoolLevel(element.tags ?? {}),
      isPublic: isPublicSchool(element.tags ?? {}),
      lng: coordinates[0],
      lat: coordinates[1],
    });
  }

  return Array.from(schools.values());
}

export function aggregateSchoolsData(schools: RankedSchool[]): SchoolsData {
  const elementaryCount = schools.filter((s) => s.level === "elementary").length;
  const middleCount = schools.filter((s) => s.level === "middle").length;
  const highCount = schools.filter((s) => s.level === "high").length;

  const ranked = [...schools].sort((a, b) => {
    const publicDiff = Number(b.isPublic) - Number(a.isPublic);
    if (publicDiff !== 0) return publicDiff;
    return LEVEL_RANK[b.level] - LEVEL_RANK[a.level];
  });

  const levelScore =
    highCount > 0 ? 8.5 : middleCount > 0 ? 7.8 : elementaryCount > 0 ? 7.2 : 7.0;
  const breadthBonus = Math.min(1.2, schools.length * 0.08);

  return {
    avgRating: Math.min(9.5, Math.round((levelScore + breadthBonus) * 10) / 10),
    elementaryCount,
    middleCount,
    highCount,
    topSchool: ranked[0]?.name ?? "No schools found nearby",
  };
}

export function emptySchoolsData(city?: string): SchoolsData {
  return {
    avgRating: 7.0,
    elementaryCount: 0,
    middleCount: 0,
    highCount: 0,
    topSchool: city ? `${city} area schools` : "No schools found nearby",
  };
}

export function haversineDistanceKm(
  lng1: number,
  lat1: number,
  lng2: number,
  lat2: number
): number {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = toRadians(lat2 - lat1);
  const longitudeDelta = toRadians(lng2 - lng1);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(longitudeDelta / 2) ** 2;

  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
