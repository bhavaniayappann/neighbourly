import { NextRequest, NextResponse } from "next/server";
import { withCache } from "@/lib/cache";
import {
  DEFAULT_ACS_YEAR,
  fetchTractsByGeoids,
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
  const geoidsParam = request.nextUrl.searchParams.get("geoids");
  const year = parseYear(request);

  if (!geoidsParam) {
    return NextResponse.json({ error: "geoids query param required" }, { status: 400 });
  }

  const geoids = geoidsParam.split(",").filter((g) => /^\d{11}$/.test(g));

  if (geoids.length === 0) {
    return NextResponse.json({ error: "No valid GEOIDs provided" }, { status: 400 });
  }

  const cacheKey = `${geoids.slice().sort().join(",")}:${year}`;

  try {
    const tracts = await withCache(cacheKey, "county_demographics", () =>
      fetchTractsByGeoids(geoids, year)
    );

    const map: TractCensusMap = Object.fromEntries(
      tracts.map((t) => [t.geoid, t])
    );

    return NextResponse.json(map);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Census bulk fetch failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
