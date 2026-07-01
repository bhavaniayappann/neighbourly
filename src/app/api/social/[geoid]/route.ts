import { NextResponse } from "next/server";
import { withCache } from "@/lib/cache";
import { analyzeSocialSentiment, buildPulseFromPosts } from "@/lib/ai";
import { withTimeout } from "@/lib/fetch-timeout";
import { getSocialData } from "@/lib/mock-data";
import { resolveNeighbourhoodForTract } from "@/lib/neighbourhood";
import { searchNeighbourhoodPosts } from "@/lib/reddit";
import { getTractByGeoid } from "@/lib/tracts";
import type { SocialPulseData } from "@/types";
import type { NeighbourhoodResolveResult } from "@/lib/neighbourhood";

const CACHE_VERSION = "v3";
const SOCIAL_ROUTE_TIMEOUT_MS = 25_000;

function tractFallback(geoid: string): NeighbourhoodResolveResult {
  const tract = getTractByGeoid(geoid);
  return {
    id: null,
    displayName: tract?.name ?? "Bay Area",
    city: tract?.city ?? "",
    county: tract?.county ?? "Bay Area",
  };
}

export async function GET(
  _request: Request,
  { params }: { params: { geoid: string } }
) {
  const geoid = params.geoid;
  const tract = getTractByGeoid(geoid);

  const resolved = await withTimeout(
    resolveNeighbourhoodForTract(geoid),
    4_000,
    tractFallback(geoid)
  );
  const displayName = resolved.displayName;
  const city = resolved.city ?? tract?.city ?? "";
  const county = resolved.county ?? tract?.county ?? "Bay Area";
  const searchLabel =
    city && displayName.toLowerCase() !== city.toLowerCase()
      ? `${displayName} ${city}`
      : displayName;

  try {
    const cacheKey = `${geoid}:${CACHE_VERSION}`;
    const data = await withTimeout(
      withCache<SocialPulseData>(cacheKey, "social", async () => {
        const searchQuery = `${searchLabel} ${county} County California`;
        const { posts, subredditCounts } = await searchNeighbourhoodPosts(
          searchQuery,
          25,
          { searchLabel, city, county }
        );

        const analyzed = await withTimeout(
          analyzeSocialSentiment(geoid, displayName, county, posts),
          15_000,
          null
        );

        const pulse: SocialPulseData =
          analyzed ?? (posts.length > 0 ? buildPulseFromPosts(posts) : { ...getSocialData(geoid), dataSource: "mock" });

        return {
          ...pulse,
          subreddits: subredditCounts.map((s) => ({
            name: s.subreddit,
            count: s.count,
          })),
        };
      }),
      SOCIAL_ROUTE_TIMEOUT_MS,
      null
    );

    if (data) return NextResponse.json(data);
  } catch (err) {
    console.warn("Social API error:", err);
  }

  return NextResponse.json({ ...getSocialData(geoid), dataSource: "mock" });
}
