import type { WalkabilityData } from "@/types";

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="py-1">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-sm font-medium text-gray-900">{score}</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
        <div
          className="h-full rounded-full bg-teal-600"
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

export function WalkabilitySection({ data }: { data: WalkabilityData }) {
  return (
    <div className="space-y-1">
      <ScoreBar label="Walk Score" score={data.walkScore} />
      <ScoreBar label="Transit Score" score={data.transitScore} />
      <ScoreBar label="Bike Score" score={data.bikeScore} />
    </div>
  );
}
