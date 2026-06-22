import type { CensusTractData } from "@/types";
import {
  getFallbackTractCensus,
  getFallbackTractsByGeoids,
  isCensusConfigured,
} from "./census-fallback";

export const DEFAULT_ACS_YEAR = "2022";
export const SUPPORTED_ACS_YEARS = ["2022", "2021", "2020"] as const;
export type AcsYear = (typeof SUPPORTED_ACS_YEARS)[number];

function acsBaseUrl(year: AcsYear): string {
  return `https://api.census.gov/data/${year}/acs/acs5`;
}

const CENSUS_VARS = [
  "NAME",
  "B01003_001E",
  "B19013_001E",
  "B25064_001E",
  "B15003_001E",
  "B15003_022E",
  "B15003_023E",
  "B15003_024E",
  "B15003_025E",
] as const;

const NULL_SENTINELS = new Set([-666666666, -888888888, -999999999]);

/** Display names for demo tracts (Census NAME is not neighbourhood-friendly). */
export const NEIGHBOURHOOD_NAMES: Record<string, string> = {
  "06075020800": "Mission District",
  "06075010102": "Castro",
  "06075022802": "Noe Valley",
  "06075020300": "Haight-Ashbury",
  "06075002601": "SOMA",
  "06075040100": "North Beach",
  "06075011901": "Pacific Heights",
  "06075015301": "Richmond",
};

function parseCensusNumber(raw: string): number {
  const n = parseInt(raw, 10);
  if (Number.isNaN(n) || NULL_SENTINELS.has(n)) return 0;
  return n;
}

function computeBachelorsPlus(row: Record<string, string>): number {
  const total = parseCensusNumber(row.B15003_001E);
  if (total === 0) return 0;

  const bachelors =
    parseCensusNumber(row.B15003_022E) +
    parseCensusNumber(row.B15003_023E) +
    parseCensusNumber(row.B15003_024E) +
    parseCensusNumber(row.B15003_025E);

  return Math.round((bachelors / total) * 100);
}

export function parseGeoid(geoid: string): {
  state: string;
  county: string;
  tract: string;
} {
  return {
    state: geoid.slice(0, 2),
    county: geoid.slice(2, 5),
    tract: geoid.slice(5),
  };
}

export function rowToTractData(
  row: Record<string, string>,
  geoid?: string
): CensusTractData {
  const state = row.state ?? geoid?.slice(0, 2) ?? "";
  const county = row.county ?? geoid?.slice(2, 5) ?? "";
  const tract = row.tract ?? geoid?.slice(5) ?? "";
  const resolvedGeoid = geoid ?? `${state}${county}${tract}`;

  return {
    geoid: resolvedGeoid,
    name:
      NEIGHBOURHOOD_NAMES[resolvedGeoid] ??
      row.NAME?.split(",")[0]?.trim() ??
      "Unknown",
    population: parseCensusNumber(row.B01003_001E),
    medianIncome: parseCensusNumber(row.B19013_001E),
    medianRent: parseCensusNumber(row.B25064_001E),
    bachelorsPlus: computeBachelorsPlus(row),
  };
}

function censusApiUrl(
  params: Record<string, string>,
  year: AcsYear = DEFAULT_ACS_YEAR
): string {
  const search = new URLSearchParams({
    get: CENSUS_VARS.join(","),
    ...params,
  });

  const key = process.env.CENSUS_API_KEY?.trim();
  if (key) search.set("key", key);

  return `${acsBaseUrl(year)}?${search.toString()}`;
}

async function parseCensusResponse(res: Response): Promise<string[][]> {
  const text = await res.text();

  if (res.status === 204 || !text.trim()) {
    return [];
  }

  if (text.trimStart().startsWith("<")) {
    if (text.includes("Missing Key") || text.includes("missing_key")) {
      throw new Error(
        "Invalid or missing CENSUS_API_KEY — sign up at https://api.census.gov/data/key_signup.html"
      );
    }
    throw new Error("Census API returned an unexpected HTML response");
  }

  try {
    return JSON.parse(text) as string[][];
  } catch {
    throw new Error("Census API returned an invalid JSON response");
  }
}

async function fetchTractFromApi(
  geoid: string,
  year: AcsYear = DEFAULT_ACS_YEAR
): Promise<CensusTractData | null> {
  const { state, county, tract } = parseGeoid(geoid);

  const url = censusApiUrl(
    {
      for: `tract:${tract}`,
      in: `state:${state} county:${county}`,
    },
    year
  );

  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) {
    throw new Error(`Census API error: ${res.status} ${res.statusText}`);
  }

  const json = await parseCensusResponse(res);
  if (json.length === 0) return null;

  const [headers, ...rows] = json;
  if (rows.length === 0) return null;

  const row = Object.fromEntries(
    headers.map((h, i) => [h, rows[0][i]])
  ) as Record<string, string>;

  return rowToTractData(row, geoid);
}

export async function fetchTractCensus(
  geoid: string,
  year: AcsYear = DEFAULT_ACS_YEAR
): Promise<CensusTractData> {
  if (!isCensusConfigured()) {
    return getFallbackTractCensus(geoid);
  }

  try {
    const data = await fetchTractFromApi(geoid, year);
    if (data) return data;
  } catch (err) {
    console.warn(`Census fetch failed for ${geoid} (${year}):`, err);
  }

  return getFallbackTractCensus(geoid);
}

export async function fetchCountyCensus(
  countyFips: string,
  year: AcsYear = DEFAULT_ACS_YEAR
): Promise<CensusTractData[]> {
  const state = countyFips.slice(0, 2);
  const county = countyFips.slice(2, 5);

  if (!isCensusConfigured()) {
    return [];
  }

  try {
    return await fetchCountyTractsFromApi(state, county, year);
  } catch (err) {
    console.warn(`County census fetch failed for ${countyFips}:`, err);
    return [];
  }
}

async function fetchCountyTractsFromApi(
  state: string,
  county: string,
  year: AcsYear = DEFAULT_ACS_YEAR
): Promise<CensusTractData[]> {
  const url = censusApiUrl(
    {
      for: "tract:*",
      in: `state:${state} county:${county}`,
    },
    year
  );

  const res = await fetch(url, { next: { revalidate: 86400 } });
  if (!res.ok) {
    throw new Error(`Census API error: ${res.status} ${res.statusText}`);
  }

  const json = await parseCensusResponse(res);
  if (json.length === 0) return [];

  const [headers, ...rows] = json;

  return rows.map((rowValues) => {
    const row = Object.fromEntries(
      headers.map((h, i) => [h, rowValues[i]])
    ) as Record<string, string>;
    return rowToTractData(row);
  });
}

export async function fetchTractsByGeoids(
  geoids: string[],
  year: AcsYear = DEFAULT_ACS_YEAR
): Promise<CensusTractData[]> {
  if (geoids.length === 0) return [];

  if (!isCensusConfigured()) {
    return getFallbackTractsByGeoids(geoids);
  }

  const byCounty = new Map<string, string[]>();
  for (const geoid of geoids) {
    const { state, county } = parseGeoid(geoid);
    const key = `${state}${county}`;
    const list = byCounty.get(key) ?? [];
    list.push(geoid);
    byCounty.set(key, list);
  }

  const geoidSet = new Set(geoids);
  const fromApi = new Map<string, CensusTractData>();

  for (const countyFips of Array.from(byCounty.keys())) {
    try {
      const state = countyFips.slice(0, 2);
      const county = countyFips.slice(2, 5);
      const tracts = await fetchCountyTractsFromApi(state, county, year);
      for (const tract of tracts) {
        if (geoidSet.has(tract.geoid)) {
          fromApi.set(tract.geoid, tract);
        }
      }
    } catch (err) {
      console.warn(`County census fetch failed for ${countyFips}:`, err);
    }
  }

  return geoids.map(
    (geoid) => fromApi.get(geoid) ?? getFallbackTractCensus(geoid)
  );
}
