"use client";

import type { MatchPriority, MatchResult } from "@/types";
import { combinedHousingScore } from "@/lib/match-housing";

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-[10px] text-gray-500">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-teal-500"
          style={{ width: `${Math.min(100, value)}%` }}
        />
      </div>
    </div>
  );
}

const PRIORITY_LABELS: Record<MatchPriority, string> = {
  schools: "Schools",
  parks: "Parks",
  dogFriendly: "Dog friendly",
};

export function MatchResultCard({
  result,
  rank,
  priorities,
  compact = false,
  onSelect,
}: {
  result: MatchResult;
  rank: number;
  priorities: MatchPriority[];
  compact?: boolean;
  onSelect: () => void;
}) {
  const title =
    result.source === "city"
      ? `${result.displayName} (city overview)`
      : `${result.displayName}, ${result.city}`;

  const housingScore = combinedHousingScore(result.breakdown);
  const showHome = result.breakdown.home !== null;
  const showRent = result.breakdown.rent !== null;

  return (
    <article
      className={`rounded-xl border border-gray-200 bg-white shadow-sm ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <div className={`flex items-start justify-between gap-2 ${compact ? "mb-1.5" : "mb-2"}`}>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wide text-teal-600">
            #{rank} · {result.score}/100
          </p>
          <h3
            className={`font-semibold text-gray-900 ${
              compact ? "text-sm leading-snug" : "text-base"
            }`}
          >
            {title}
          </h3>
          {!compact && (
            <p className="text-xs text-gray-500">{result.county} County</p>
          )}
        </div>
      </div>

      {!compact && (
        <p className="mb-3 text-sm leading-relaxed text-gray-600">
          {result.reasoning}
        </p>
      )}

      {compact ? (
        <p className="mb-2 line-clamp-2 text-[11px] leading-relaxed text-gray-500">
          {result.reasoning}
        </p>
      ) : (
        <div className="mb-3 grid grid-cols-2 gap-2">
          {showHome && showRent ? (
            <>
              <ScoreBar label="Home" value={result.breakdown.home!} />
              <ScoreBar label="Rent" value={result.breakdown.rent!} />
            </>
          ) : showHome ? (
            <ScoreBar label="Home" value={result.breakdown.home!} />
          ) : showRent ? (
            <ScoreBar label="Rent" value={result.breakdown.rent!} />
          ) : (
            <ScoreBar label="Housing" value={housingScore} />
          )}
          {priorities.includes("schools") && (
            <ScoreBar label="Schools" value={result.breakdown.schools} />
          )}
          {priorities.includes("parks") && (
            <ScoreBar label="Parks" value={result.breakdown.parks} />
          )}
          {priorities.includes("dogFriendly") && (
            <ScoreBar
              label={PRIORITY_LABELS.dogFriendly}
              value={result.breakdown.dogFriendly}
            />
          )}
          <ScoreBar label="Commute" value={result.breakdown.commute} />
        </div>
      )}

      <button
        type="button"
        onClick={onSelect}
        className={`w-full rounded-lg bg-teal-600 font-medium text-white hover:bg-teal-700 ${
          compact ? "px-2.5 py-1.5 text-xs" : "px-3 py-2 text-sm"
        }`}
      >
        View on map
      </button>
    </article>
  );
}
