import { NextRequest, NextResponse } from "next/server";

const CENSUS_GEOCODER =
  "https://geocoding.geo.census.gov/geocoder/locations/onelineaddress";

interface CensusGeocoderResponse {
  result?: {
    addressMatches?: Array<{
      coordinates: { x: number; y: number };
    }>;
  };
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "q query param required" }, { status: 400 });
  }

  const address = /^\d{5}$/.test(q) ? `${q}, CA` : `${q}, Bay Area, CA`;
  const params = new URLSearchParams({
    address,
    benchmark: "Public_AR_Current",
    format: "json",
  });

  try {
    const res = await fetch(`${CENSUS_GEOCODER}?${params.toString()}`, {
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Geocoder request failed" },
        { status: 502 }
      );
    }

    const json = (await res.json()) as CensusGeocoderResponse;
    const match = json.result?.addressMatches?.[0];
    if (!match) {
      return NextResponse.json({ error: "No match found" }, { status: 404 });
    }

    return NextResponse.json({
      lng: match.coordinates.x,
      lat: match.coordinates.y,
      matchType: /^\d{5}$/.test(q) ? "zip" : "geocoder",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Geocode failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
