import { NextRequest, NextResponse } from "next/server";
import { withCache } from "@/lib/cache";
import {
  DEFAULT_ACS_YEAR,
  fetchTractCensus,
  SUPPORTED_ACS_YEARS,
  type AcsYear,
} from "@/lib/census";

function parseYear(request: Request): AcsYear {
  const url = new URL(request.url);
  const year = url.searchParams.get("year") ?? DEFAULT_ACS_YEAR;
  if ((SUPPORTED_ACS_YEARS as readonly string[]).includes(year)) {
    return year as AcsYear;
  }
  return DEFAULT_ACS_YEAR;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { geoid: string } }
) {
  const { geoid } = params;
  const year = parseYear(request);

  if (!/^\d{11}$/.test(geoid)) {
    return NextResponse.json({ error: "Invalid GEOID" }, { status: 400 });
  }

  const cacheKey = `${geoid}:${year}`;

  try {
    const data = await withCache(cacheKey, "demographics", () =>
      fetchTractCensus(geoid, year)
    );

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Census fetch failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
