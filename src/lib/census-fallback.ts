import type { CensusTractData } from "@/types";
import { NEIGHBOURHOOD_NAMES } from "./census";
import { getTractByGeoid } from "./tracts";

const COUNTY_MEDIANS: Record<string, { income: number; rent: number }> = {
  Alameda: { income: 104000, rent: 2100 },
  "Contra Costa": { income: 108000, rent: 2200 },
  Marin: { income: 126000, rent: 2600 },
  "San Francisco": { income: 126000, rent: 2400 },
  "San Mateo": { income: 138000, rent: 2800 },
  "Santa Clara": { income: 142000, rent: 2700 },
};

const DEFAULT_MEDIAN = { income: 115000, rent: 2300 };

export function isCensusConfigured(): boolean {
  return Boolean(process.env.CENSUS_API_KEY?.trim());
}

export function getFallbackTractCensus(geoid: string): CensusTractData {
  const tract = getTractByGeoid(geoid);
  const name =
    NEIGHBOURHOOD_NAMES[geoid] ?? tract?.name ?? "Unknown tract";
  const medians = COUNTY_MEDIANS[tract?.county ?? ""] ?? DEFAULT_MEDIAN;

  return {
    geoid,
    name,
    population: 0,
    medianIncome: medians.income,
    medianRent: medians.rent,
    bachelorsPlus: 0,
  };
}

export function getFallbackTractsByGeoids(geoids: string[]): CensusTractData[] {
  return geoids.map(getFallbackTractCensus);
}
