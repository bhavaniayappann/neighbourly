import { NextResponse } from "next/server";
import { withCache } from "@/lib/cache";
import { fetchTractCensus } from "@/lib/census";
import { generateNeighbourhoodSummary } from "@/lib/ai";
import { getNeighbourhoodData } from "@/lib/mock-data";
import { resolveNeighbourhoodForTract } from "@/lib/neighbourhood";
import { getTractByGeoid } from "@/lib/tracts";

export async function GET(
  _request: Request,
  { params }: { params: { geoid: string } }
) {
  const geoid = params.geoid;
  const resolved = await resolveNeighbourhoodForTract(geoid);
  const tract = getTractByGeoid(geoid);
  const displayName = resolved.displayName;
  const city = resolved.city;
  const county = resolved.county ?? tract?.county ?? "Bay Area";

  try {
    const summary = await withCache<string>(geoid, "summary", async () => {
      const census = await fetchTractCensus(geoid);
      const mock = getNeighbourhoodData(geoid);
      return generateNeighbourhoodSummary(displayName, county, {
        census,
        demographics: mock.demographics,
        housing: mock.housing,
        walkability: mock.walkability,
        city,
        county,
      });
    });

    return NextResponse.json({ summary });
  } catch (err) {
    console.warn("Summary API error:", err);
    const label =
      city && displayName.toLowerCase() !== city.toLowerCase()
        ? `${displayName}, ${city}`
        : displayName;
    return NextResponse.json({
      summary: `${label} in ${county} County is a Bay Area neighbourhood. Explore demographics, housing, and walkability data in the sidebar.`,
    });
  }
}
