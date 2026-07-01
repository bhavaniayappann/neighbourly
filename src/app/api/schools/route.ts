import { NextRequest, NextResponse } from "next/server";
import { getSchoolsForGeoid, getSchoolsForNeighbourhood } from "@/lib/schools";

export async function GET(request: NextRequest) {
  const neighbourhoodId = request.nextUrl.searchParams.get("neighbourhood")?.trim();
  const geoid = request.nextUrl.searchParams.get("geoid")?.trim();

  if (!neighbourhoodId && !geoid) {
    return NextResponse.json(
      { error: "geoid or neighbourhood query param required" },
      { status: 400 }
    );
  }

  if (geoid && !/^\d{11}$/.test(geoid)) {
    return NextResponse.json({ error: "Invalid GEOID" }, { status: 400 });
  }

  try {
    const data = neighbourhoodId
      ? await getSchoolsForNeighbourhood(neighbourhoodId)
      : await getSchoolsForGeoid(geoid!);

    return NextResponse.json(data);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "School data fetch failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
