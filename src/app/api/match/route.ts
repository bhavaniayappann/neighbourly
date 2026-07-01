import { NextRequest, NextResponse } from "next/server";
import { withCache } from "@/lib/cache";
import { runMatch } from "@/lib/match-score";
import { isMatchPriority } from "@/lib/match-priorities";
import type { HousingGoal, MatchPreferences, MatchPriority } from "@/types";

export const maxDuration = 120;

function parseHousingGoal(value: unknown): HousingGoal | null {
  if (value === "buy" || value === "rent" || value === "both") return value;
  return null;
}

function parsePreferences(body: unknown): MatchPreferences | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;

  const housingGoal = parseHousingGoal(b.housingGoal) ?? "buy";
  const budgetHomeRaw =
    b.budgetHome === null || b.budgetHome === undefined
      ? null
      : Number(b.budgetHome);
  const budgetRentRaw =
    b.budgetRent === null || b.budgetRent === undefined
      ? null
      : Number(b.budgetRent);
  const kidsRaw = b.kids;
  const parsedKids =
    kidsRaw === null || kidsRaw === undefined
      ? null
      : Number.isFinite(Number(kidsRaw))
        ? Math.max(0, Math.min(10, Math.round(Number(kidsRaw))))
        : null;
  const commuteDestination =
    typeof b.commuteDestination === "string" ? b.commuteDestination.trim() : "";

  const budgetHome =
    budgetHomeRaw !== null && Number.isFinite(budgetHomeRaw) && budgetHomeRaw > 0
      ? budgetHomeRaw
      : null;
  const budgetRent =
    budgetRentRaw !== null && Number.isFinite(budgetRentRaw) && budgetRentRaw > 0
      ? budgetRentRaw
      : null;

  if (!commuteDestination) return null;

  if (housingGoal === "buy" && !budgetHome) return null;
  if (housingGoal === "rent" && !budgetRent) return null;
  if (housingGoal === "both" && (!budgetHome || !budgetRent)) return null;

  const priorities = Array.isArray(b.priorities)
    ? (b.priorities.filter(isMatchPriority) as MatchPriority[])
    : [];

  return {
    housingGoal,
    budgetHome: housingGoal === "rent" ? null : budgetHome,
    budgetRent: housingGoal === "buy" ? null : budgetRent,
    kids: parsedKids,
    commuteDestination,
    priorities,
  };
}

function cacheKeyForPreferences(prefs: MatchPreferences): string {
  return `match:${prefs.housingGoal}:${prefs.budgetHome ?? 0}:${prefs.budgetRent ?? 0}:${prefs.kids ?? "na"}:${prefs.commuteDestination.toLowerCase()}:${prefs.priorities.sort().join(",")}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const preferences = parsePreferences(body);

    if (!preferences) {
      return NextResponse.json(
        {
          error:
            "Invalid body — require housingGoal (buy|rent|both), matching budget(s), and commuteDestination",
        },
        { status: 400 }
      );
    }

    const cacheKey = cacheKeyForPreferences(preferences);
    const results = await withCache(cacheKey, "match", () =>
      runMatch(preferences, 3)
    );

    return NextResponse.json({ results, preferences });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Match request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
