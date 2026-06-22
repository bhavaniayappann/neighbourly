import { NextResponse } from "next/server";
import { withCache } from "@/lib/cache";
import { analyzeSocialSentiment } from "@/lib/ai";
import { getSocialData } from "@/lib/mock-data";
import { resolveNeighbourhoodForTract } from "@/lib/neighbourhood";
import { searchNeighbourhoodPosts } from "@/lib/reddit";
import { getTractByGeoid } from "@/lib/tracts";
import type { SocialPulseData } from "@/types";

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
  const searchLabel =
    city && displayName.toLowerCase() !== city.toLowerCase()
      ? `${displayName} ${city}`
      : displayName;

  try {
    const data = await withCache<SocialPulseData>(geoid, "social", async () => {
      const searchQuery = `${searchLabel} ${county} County California`;
      const { posts, subredditCounts } = await searchNeighbourhoodPosts(searchQuery);
      const analyzed = await analyzeSocialSentiment(geoid, displayName, county, posts);
      return {
        ...analyzed,
        subreddits: subredditCounts.map((s) => ({
          name: `r/${s.subreddit}`,
          count: s.count,
        })),
      };
    });

    return NextResponse.json(data);
  } catch (err) {
    console.warn("Social API error:", err);
    return NextResponse.json(getSocialData(geoid));
  }
}
