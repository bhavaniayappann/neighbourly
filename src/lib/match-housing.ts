import type {
  MatchCandidateMetrics,
  MatchPreferences,
  MatchScoreBreakdown,
} from "@/types";

export function scorePriceFit(actual: number, budget: number): number {
  if (budget <= 0 || actual <= 0) return 50;
  const ratio = actual / budget;
  if (ratio >= 0.75 && ratio <= 1.05) return 100;
  if (ratio > 1.05 && ratio <= 1.25) return 70 - (ratio - 1.05) * 200;
  if (ratio > 1.25) return Math.max(0, 30 - (ratio - 1.25) * 100);
  if (ratio >= 0.5) return 60 + (ratio - 0.5) * 53;
  return 40;
}

export function scoreHousingBreakdown(
  metrics: MatchCandidateMetrics,
  preferences: MatchPreferences
): Pick<MatchScoreBreakdown, "home" | "rent"> {
  const goal = preferences.housingGoal;
  const home =
    goal !== "rent" && preferences.budgetHome && preferences.budgetHome > 0
      ? Math.round(
          scorePriceFit(metrics.medianHomeValue, preferences.budgetHome)
        )
      : null;
  const rent =
    goal !== "buy" && preferences.budgetRent && preferences.budgetRent > 0
      ? Math.round(scorePriceFit(metrics.medianRent, preferences.budgetRent))
      : null;
  return { home, rent };
}

export function combinedHousingScore(
  breakdown: Pick<MatchScoreBreakdown, "home" | "rent">
): number {
  const scores = [breakdown.home, breakdown.rent].filter(
    (s): s is number => s !== null
  );
  if (scores.length === 0) return 50;
  return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
}

export function formatBudgetSummary(preferences: MatchPreferences): string {
  const parts: string[] = [];
  if (
    preferences.housingGoal !== "rent" &&
    preferences.budgetHome &&
    preferences.budgetHome > 0
  ) {
    parts.push(`$${(preferences.budgetHome / 1_000_000).toFixed(2)}M buy`);
  }
  if (
    preferences.housingGoal !== "buy" &&
    preferences.budgetRent &&
    preferences.budgetRent > 0
  ) {
    parts.push(`$${preferences.budgetRent.toLocaleString()}/mo rent`);
  }
  return parts.join(" · ") || "your budget";
}
