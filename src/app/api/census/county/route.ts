import { NextRequest, NextResponse } from "next/server";
import { withCache } from "@/lib/cache";
import {
  DEFAULT_ACS_YEAR,
  fetchCountyCensus,
  SUPPORTED_ACS_YEARS,
  type AcsYear,
} from "@/lib/census";
import type { TractCensusMap } from "@/types";

function parseYear(request: NextRequest): AcsYear {
  const year = request.nextUrl.searchParams.get("year") ?? DEFAULT_ACS_YEAR;
  if ((SUPPORTED_ACS_YEARS as readonly string[]).includes(year)) {
    return year as AcsYear;
  }
  return DEFAULT_ACS_YEAR;
}

export async function GET(request: NextRequest) {
  const countiesParam = request.nextUrl.searchParams.get("counties");
  const year = parseYear(request);

  if (!countiesParam) {
    return NextResponse.json(
      { error: "counties query param required" },
      { status: 400 }
    );
  }

  const counties = countiesParam
    .split(",")
    .map((c) => c.trim())
    .filter((c) => /^\d{5}$/.test(c));

  if (counties.length === 0) {
    return NextResponse.json(
      { error: "No valid 5-digit county FIPS codes provided" },
      { status: 400 }
    );
  }

  const cacheKey = `county:${counties.slice().sort().join(",")}:${year}`;

  try {
    const map = await withCache<TractCensusMap>(
      cacheKey,
      "county_demographics",
      async () => {
        const results = await Promise.all(
          counties.map((fips) => fetchCountyCensus(fips, year))
        );
        const merged: TractCensusMap = {};
        for (const tracts of results) {
          for (const tract of tracts) {
            merged[tract.geoid] = tract;
          }
        }
        return merged;
      }
    );

    return NextResponse.json(map);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "County census fetch failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
