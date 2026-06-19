import { MOCK_NEIGHBOURHOODS } from "./mock-data";
import type { CensusTractData } from "@/types";

const EXTRA_FALLBACK: Record<string, CensusTractData> = {
  "06075011901": {
    geoid: "06075011901",
    name: "Pacific Heights",
    population: 21400,
    medianIncome: 245000,
    medianRent: 4500,
    bachelorsPlus: 78,
  },
  "06075015301": {
    geoid: "06075015301",
    name: "Richmond",
    population: 67200,
    medianIncome: 118300,
    medianRent: 2800,
    bachelorsPlus: 54,
  },
};

function mockToCensus(geoid: string): CensusTractData | null {
  const mock = MOCK_NEIGHBOURHOODS[geoid];
  if (!mock) return EXTRA_FALLBACK[geoid] ?? null;

  return {
    geoid: mock.geoid,
    name: mock.name,
    population: mock.demographics.population,
    medianIncome: mock.demographics.medianIncome,
    medianRent: mock.housing.medianRent,
    bachelorsPlus: mock.demographics.bachelorsPlus,
  };
}

export function isCensusConfigured(): boolean {
  return Boolean(process.env.CENSUS_API_KEY?.trim());
}

export function getFallbackTractCensus(geoid: string): CensusTractData {
  const data = mockToCensus(geoid);
  if (data) return data;

  return {
    geoid,
    name: "Unknown",
    population: 0,
    medianIncome: 0,
    medianRent: 0,
    bachelorsPlus: 0,
  };
}

export function getFallbackTractsByGeoids(geoids: string[]): CensusTractData[] {
  return geoids.map(getFallbackTractCensus);
}
