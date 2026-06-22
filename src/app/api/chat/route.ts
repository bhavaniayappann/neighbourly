import { NextResponse } from "next/server";
import { fetchTractCensus } from "@/lib/census";
import { chatAboutNeighbourhood } from "@/lib/ai";
import { getNeighbourhoodData, getSocialData } from "@/lib/mock-data";
import { resolveNeighbourhoodForTract } from "@/lib/neighbourhood";
import { getTractByGeoid } from "@/lib/tracts";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      geoid: string;
      messages: { role: "user" | "assistant"; content: string }[];
    };

    const { geoid, messages } = body;
    if (!geoid || !messages?.length) {
      return NextResponse.json({ error: "geoid and messages required" }, { status: 400 });
    }

    const resolved = await resolveNeighbourhoodForTract(geoid);
    const tract = getTractByGeoid(geoid);
    const displayName = resolved.displayName;
    const city = resolved.city;
    const county = resolved.county ?? tract?.county ?? "Bay Area";
    const census = await fetchTractCensus(geoid);
    const mock = getNeighbourhoodData(geoid);
    const social = getSocialData(geoid);

    const context = {
      displayName,
      city,
      county,
      census,
      demographics: mock.demographics,
      housing: mock.housing,
      schools: mock.schools,
      commute: mock.commute,
      walkability: mock.walkability,
      socialSentiment: {
        positive: social.positive,
        neutral: social.neutral,
        negative: social.negative,
        topKeywords: social.keywords.slice(0, 5),
      },
    };

    const reply = await chatAboutNeighbourhood(displayName, county, context, messages);
    return NextResponse.json({ reply });
  } catch (err) {
    console.error("Chat API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Chat failed" },
      { status: 500 }
    );
  }
}
