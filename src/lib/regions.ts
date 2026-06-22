export const BAY_AREA_COUNTIES = [
  { fips: "06001", name: "Alameda" },
  { fips: "06013", name: "Contra Costa" },
  { fips: "06041", name: "Marin" },
  { fips: "06075", name: "San Francisco" },
  { fips: "06081", name: "San Mateo" },
  { fips: "06085", name: "Santa Clara" },
] as const;

export const BAY_AREA_COUNTY_FIPS = BAY_AREA_COUNTIES.map((c) => c.fips);

export const BAY_AREA_BOUNDS = {
  west: -123.05,
  south: 36.9,
  east: -121.2,
  north: 38.45,
} as const;

export const BAY_AREA_CENTER = {
  longitude: -122.15,
  latitude: 37.65,
  zoom: 9,
} as const;

const COUNTY_FIPS_TO_NAME: Record<string, string> = Object.fromEntries(
  BAY_AREA_COUNTIES.map((c) => [c.fips.slice(2), c.name])
);

export function countyNameFromGeoid(geoid: string): string {
  const countyFips = geoid.slice(2, 5);
  return COUNTY_FIPS_TO_NAME[countyFips] ?? "Bay Area";
}
