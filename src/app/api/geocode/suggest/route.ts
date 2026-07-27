import { NextRequest, NextResponse } from "next/server";
import { searchAddressSuggestions } from "@/lib/geocode-places";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ suggestions: [] });
  }

  if (q.length < 3) {
    return NextResponse.json({ suggestions: [] });
  }

  try {
    const suggestions = await searchAddressSuggestions(q);
    return NextResponse.json({ suggestions });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Suggest failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
