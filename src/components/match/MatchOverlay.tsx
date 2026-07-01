"use client";

import { useState } from "react";
import type { MatchPriority, MatchResult } from "@/types";
import { MATCH_PRIORITY_OPTIONS } from "@/lib/match-priorities";
import { useAppStore } from "@/store/useAppStore";
import {
  DEFAULT_MATCH_FORM,
  formToPreferences,
  formatFormBudgetSummary,
  useMatch,
  type MatchFormState,
  type MatchWizardStep,
} from "@/hooks/useMatch";
import { MatchResultCard } from "./MatchResultCard";

export function MatchOverlay({ onClose }: { onClose: () => void }) {
  const flyToArea = useAppStore((s) => s.flyToArea);
  const { loading, error, results, runMatch, reset } = useMatch();
  const [step, setStep] = useState<MatchWizardStep>("budget");
  const [form, setForm] = useState<MatchFormState>(DEFAULT_MATCH_FORM);

  async function handleSubmit() {
    const matchResults = await runMatch(formToPreferences(form));
    if (matchResults) setStep("results");
  }

  function togglePriority(priority: MatchPriority) {
    setForm((prev) => ({
      ...prev,
      priorities: prev.priorities.includes(priority)
        ? prev.priorities.filter((p) => p !== priority)
        : [...prev.priorities, priority],
    }));
  }

  function handleSelectResult(result: MatchResult) {
    flyToArea(
      {
        neighbourhoodId: result.neighbourhoodId,
        geoid: result.geoid,
        displayName: result.displayName,
        city: result.city,
        county: result.county,
      },
      result.bbox,
      result.centroid
    );
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-label="Close match wizard"
      />
      <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              Find your match
            </h2>
            <p className="text-xs text-gray-500">
              Bay Area neighbourhoods ranked to your preferences
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-gray-500 hover:bg-gray-100"
          >
            Close
          </button>
        </div>

        <div className="space-y-5 p-5">
          {step !== "results" && (
            <div className="flex gap-2">
              {(["budget", "preferences"] as const).map((s, i) => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full ${
                    step === s || (step === "preferences" && i === 0)
                      ? "bg-teal-500"
                      : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
          )}

          {step === "budget" && (
            <div className="space-y-4">
              <fieldset>
                <legend className="text-sm font-medium text-gray-700">
                  Housing goal
                </legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(
                    [
                      { id: "buy", label: "Buying" },
                      { id: "rent", label: "Renting" },
                      { id: "both", label: "Both" },
                    ] as const
                  ).map(({ id, label }) => {
                    const active = form.housingGoal === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() =>
                          setForm((f) => ({ ...f, housingGoal: id }))
                        }
                        className={`rounded-full px-3 py-1.5 text-sm ${
                          active
                            ? "bg-teal-100 text-teal-800 ring-1 ring-teal-300"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              {form.housingGoal !== "rent" && (
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">
                    Home budget
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-sm text-gray-500">$</span>
                    <input
                      type="number"
                      min={200000}
                      step={50000}
                      value={form.budgetHome}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          budgetHome: Number(e.target.value),
                        }))
                      }
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    ${(form.budgetHome / 1_000_000).toFixed(2)}M
                  </p>
                </label>
              )}

              {form.housingGoal !== "buy" && (
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">
                    Rent budget (monthly)
                  </span>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-sm text-gray-500">$</span>
                    <input
                      type="number"
                      min={500}
                      step={100}
                      value={form.budgetRent}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          budgetRent: Number(e.target.value),
                        }))
                      }
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                    />
                    <span className="text-sm text-gray-500">/mo</span>
                  </div>
                </label>
              )}

              <button
                type="button"
                onClick={() => setStep("preferences")}
                className="w-full rounded-lg bg-teal-600 py-2.5 text-sm font-medium text-white hover:bg-teal-700"
              >
                Next
              </button>
            </div>
          )}

          {step === "preferences" && (
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  Commute destination
                </span>
                <input
                  type="text"
                  value={form.commuteDestination}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      commuteDestination: e.target.value,
                    }))
                  }
                  placeholder="e.g. Sunnyvale"
                  className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm"
                />
              </label>

              <fieldset>
                <legend className="text-sm font-medium text-gray-700">
                  What matters to you?
                </legend>
                <p className="mt-1 text-xs text-gray-500">
                  Pick any that apply — we&apos;ll weight your matches
                  accordingly.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {MATCH_PRIORITY_OPTIONS.map(({ id, label, description }) => {
                    const active = form.priorities.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        title={description}
                        onClick={() => togglePriority(id)}
                        className={`rounded-full px-3 py-1.5 text-sm ${
                          active
                            ? "bg-teal-100 text-teal-800 ring-1 ring-teal-300"
                            : "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <fieldset className="rounded-lg border border-gray-100 bg-gray-50/80 p-3">
                <legend className="px-1 text-sm font-medium text-gray-700">
                  Kids (optional)
                </legend>
                <label className="mt-2 flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.hasKids}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, hasKids: e.target.checked }))
                    }
                    className="rounded border-gray-300 text-teal-600"
                  />
                  I have kids
                </label>
                {form.hasKids && (
                  <label className="mt-3 block">
                    <span className="text-xs text-gray-500">How many?</span>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={form.kidsCount}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          kidsCount: Number(e.target.value),
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm"
                    />
                  </label>
                )}
              </fieldset>

              {loading && (
                <p className="text-xs text-gray-500">
                  Scoring neighbourhoods — first run may take up to a minute…
                </p>
              )}

              {error && (
                <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setStep("budget")}
                  className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700"
                >
                  Back
                </button>
                <button
                  type="button"
                  disabled={loading || !form.commuteDestination.trim()}
                  onClick={() => void handleSubmit()}
                  className="flex-1 rounded-lg bg-teal-600 py-2.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                >
                  {loading ? "Finding matches…" : "Find matches"}
                </button>
              </div>
            </div>
          )}

          {step === "results" && results && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Top matches for {formatFormBudgetSummary(form)}, commute to{" "}
                {form.commuteDestination}
                {form.hasKids ? `, ${form.kidsCount} kids` : ""}.
              </p>
              {results.map((result, i) => (
                <MatchResultCard
                  key={result.id}
                  result={result}
                  rank={i + 1}
                  priorities={form.priorities}
                  onSelect={() => handleSelectResult(result)}
                />
              ))}
              <button
                type="button"
                onClick={() => {
                  reset();
                  setStep("budget");
                }}
                className="w-full rounded-lg border border-gray-200 py-2.5 text-sm font-medium text-gray-700"
              >
                Start over
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
