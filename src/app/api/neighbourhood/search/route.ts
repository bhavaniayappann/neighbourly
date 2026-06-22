import { NextRequest, NextResponse } from "next/server";
import { searchNeighbourhoods } from "@/lib/neighbourhood";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json(
      { error: "q query param required" },
      { status: 400 }
    );
  }

  try {
    const results = await searchNeighbourhoods(q);
    return NextResponse.json({ results });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Neighbourhood search failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
