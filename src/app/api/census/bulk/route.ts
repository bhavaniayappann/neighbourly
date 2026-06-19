import { NextRequest, NextResponse } from "next/server";
import { withCache } from "@/lib/cache";
import { fetchTractsByGeoids } from "@/lib/census";
import type { TractCensusMap } from "@/types";

export async function GET(request: NextRequest) {
  const geoidsParam = request.nextUrl.searchParams.get("geoids");

  if (!geoidsParam) {
    return NextResponse.json({ error: "geoids query param required" }, { status: 400 });
  }

  const geoids = geoidsParam.split(",").filter((g) => /^\d{11}$/.test(g));

  if (geoids.length === 0) {
    return NextResponse.json({ error: "No valid GEOIDs provided" }, { status: 400 });
  }

  const cacheKey = geoids.slice().sort().join(",");

  try {
    const tracts = await withCache(cacheKey, "county_demographics", () =>
      fetchTractsByGeoids(geoids)
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
