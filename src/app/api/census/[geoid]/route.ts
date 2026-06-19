import { NextResponse } from "next/server";
import { withCache } from "@/lib/cache";
import { fetchTractCensus } from "@/lib/census";

export async function GET(
  _request: Request,
  { params }: { params: { geoid: string } }
) {
  const { geoid } = params;

  if (!/^\d{11}$/.test(geoid)) {
    return NextResponse.json({ error: "Invalid GEOID" }, { status: 400 });
  }

  try {
    const data = await withCache(geoid, "demographics", () =>
      fetchTractCensus(geoid)
    );

    return NextResponse.json(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Census fetch failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
