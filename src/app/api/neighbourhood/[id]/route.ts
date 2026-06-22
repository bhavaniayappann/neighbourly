import { NextRequest, NextResponse } from "next/server";
import {
  DEFAULT_ACS_YEAR,
  SUPPORTED_ACS_YEARS,
  type AcsYear,
} from "@/lib/census";
import { getNeighbourhoodCensus } from "@/lib/neighbourhood";

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
  { params }: { params: { id: string } }
) {
  const { id } = params;
  const year = parseYear(request);

  if (!id?.trim()) {
    return NextResponse.json(
      { error: "Neighbourhood id required" },
      { status: 400 }
    );
  }

  try {
    const data = await getNeighbourhoodCensus(id, year);
    if (!data) {
      return NextResponse.json(
        { error: "Neighbourhood not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Neighbourhood census fetch failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
