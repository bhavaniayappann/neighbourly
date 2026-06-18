import type { CommuteData } from "@/types";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

export function CommuteSection({ data }: { data: CommuteData }) {
  return (
    <div className="space-y-0.5">
      <Stat label="Avg Commute" value={`${data.avgCommuteMins} min`} />
      <Stat label="Transit" value={`${data.transitPct}%`} />
      <Stat label="Walk" value={`${data.walkPct}%`} />
      <Stat label="Drive" value={`${data.drivePct}%`} />
      <Stat label="Work from Home" value={`${data.workFromHomePct}%`} />
    </div>
  );
}
