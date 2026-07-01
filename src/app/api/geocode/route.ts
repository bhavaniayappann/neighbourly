import { NextRequest, NextResponse } from "next/server";
import { geocodePlace } from "@/lib/geocode-places";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "q query param required" }, { status: 400 });
  }

  try {
    const point = await geocodePlace(q);
    if (!point) {
      return NextResponse.json({ error: "No match found" }, { status: 404 });
    }

    return NextResponse.json({
      lng: point.lng,
      lat: point.lat,
      matchType: /^\d{5}$/.test(q) ? "zip" : "geocoder",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Geocode failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
