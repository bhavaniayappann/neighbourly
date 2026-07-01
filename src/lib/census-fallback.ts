import type { CensusTractData } from "@/types";
import { NEIGHBOURHOOD_NAMES } from "./census";
import { getTractByGeoid } from "./tracts";

const COUNTY_MEDIANS: Record<string, { income: number; rent: number; homeValue: number }> = {
  Alameda: { income: 104000, rent: 2100, homeValue: 950000 },
  "Contra Costa": { income: 108000, rent: 2200, homeValue: 850000 },
  Marin: { income: 126000, rent: 2600, homeValue: 1200000 },
  "San Francisco": { income: 126000, rent: 2400, homeValue: 1100000 },
  "San Mateo": { income: 138000, rent: 2800, homeValue: 1300000 },
  "Santa Clara": { income: 142000, rent: 2700, homeValue: 1400000 },
};

const DEFAULT_MEDIAN = { income: 115000, rent: 2300, homeValue: 1000000 };

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
    medianHomeValue: medians.homeValue,
    bachelorsPlus: 0,
  };
}

export function getFallbackTractsByGeoids(geoids: string[]): CensusTractData[] {
  return geoids.map(getFallbackTractCensus);
}
