"use client";

import { useState } from "react";
import type { MatchPreferences, MatchPriority, MatchResult, HousingGoal } from "@/types";

export function useMatch() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<MatchResult[] | null>(null);

  async function runMatch(preferences: MatchPreferences) {
    setLoading(true);
    setError(null);
    setResults(null);

    try {
      const res = await fetch("/api/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(preferences),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Match failed (${res.status})`);
      }

      const json = (await res.json()) as { results: MatchResult[] };
      setResults(json.results);
      return json.results;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Match request failed";
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setResults(null);
    setError(null);
  }

  return { loading, error, results, runMatch, reset };
}

export type MatchWizardStep = "budget" | "preferences" | "results";

export interface MatchFormState {
  housingGoal: HousingGoal;
  budgetHome: number;
  budgetRent: number;
  hasKids: boolean;
  kidsCount: number;
  commuteDestination: string;
  priorities: MatchPriority[];
}

export const DEFAULT_MATCH_FORM: MatchFormState = {
  housingGoal: "buy",
  budgetHome: 1_500_000,
  budgetRent: 3_500,
  hasKids: false,
  kidsCount: 2,
  commuteDestination: "Sunnyvale",
  priorities: ["schools", "parks"],
};

export function formToPreferences(form: MatchFormState): MatchPreferences {
  const goal = form.housingGoal;
  return {
    housingGoal: goal,
    budgetHome: goal === "rent" ? null : form.budgetHome,
    budgetRent: goal === "buy" ? null : form.budgetRent,
    kids: form.hasKids ? Math.max(0, form.kidsCount) : null,
    commuteDestination: form.commuteDestination,
    priorities: form.priorities,
  };
}

export function formatFormBudgetSummary(form: MatchFormState): string {
  const parts: string[] = [];
  if (form.housingGoal !== "rent") {
    parts.push(`$${(form.budgetHome / 1_000_000).toFixed(2)}M buy`);
  }
  if (form.housingGoal !== "buy") {
    parts.push(`$${form.budgetRent.toLocaleString()}/mo rent`);
  }
  return parts.join(" · ");
}
