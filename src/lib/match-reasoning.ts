import type { MatchCandidate, MatchCandidateMetrics, MatchPreferences } from "@/types";
import { formatBudgetSummary, scoreHousingBreakdown } from "./match-housing";

export function templateReasoning(
  candidate: MatchCandidate,
  metrics: MatchCandidateMetrics,
  preferences: MatchPreferences
): string {
  const label =
    candidate.source === "city"
      ? `${candidate.displayName} (city overview)`
      : `${candidate.displayName}, ${candidate.city}`;

  const parts: string[] = [];
  const housing = scoreHousingBreakdown(metrics, preferences);

  if (housing.home !== null && preferences.budgetHome) {
    const homeM = (metrics.medianHomeValue / 1_000_000).toFixed(2);
    const budgetM = (preferences.budgetHome / 1_000_000).toFixed(2);
    parts.push(
      `Median home values around $${homeM}M vs your $${budgetM}M buy budget.`
    );
  }

  if (housing.rent !== null && preferences.budgetRent) {
    parts.push(
      `Median rent around $${metrics.medianRent.toLocaleString()}/mo vs your $${preferences.budgetRent.toLocaleString()}/mo budget.`
    );
  }

  if (parts.length === 0) {
    parts.push(`Housing costs compared to ${formatBudgetSummary(preferences)}.`);
  }

  if (preferences.priorities.includes("schools")) {
    parts.push(
      `${metrics.highSchoolCount} high school(s) nearby; top nearby: ${metrics.topSchool}.`
    );
  }

  if (preferences.priorities.includes("parks")) {
    parts.push(`${metrics.parkCount} park(s) within ~2 km.`);
  }

  if (preferences.priorities.includes("dogFriendly")) {
    parts.push(
      `${metrics.dogParkCount} dog-friendly spot(s) (dog parks & pet-friendly parks) within ~2.5 km.`
    );
  }

  parts.push(
    `Estimated commute to ${preferences.commuteDestination}: ~${metrics.commuteMinutes} min.`
  );

  return `${label}: ${parts.join(" ")}`;
}
