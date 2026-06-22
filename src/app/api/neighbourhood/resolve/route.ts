import { NextRequest, NextResponse } from "next/server";
import { resolveNeighbourhoodForTract } from "@/lib/neighbourhood";

export async function GET(request: NextRequest) {
  const geoid = request.nextUrl.searchParams.get("geoid")?.trim();
  if (!geoid) {
    return NextResponse.json(
      { error: "geoid query param required" },
      { status: 400 }
    );
  }

  if (!/^\d{11}$/.test(geoid)) {
    return NextResponse.json({ error: "Invalid GEOID" }, { status: 400 });
  }

  try {
    const result = await resolveNeighbourhoodForTract(geoid);
    return NextResponse.json(result);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Neighbourhood resolve failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
