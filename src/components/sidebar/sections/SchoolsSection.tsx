import type { SchoolsData } from "@/types";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

export function SchoolsSection({ data }: { data: SchoolsData }) {
  return (
    <div className="space-y-0.5">
      <Stat label="Avg Rating" value={`${data.avgRating}/10`} />
      <Stat label="Elementary" value={`${data.elementaryCount} schools`} />
      <Stat label="Middle" value={`${data.middleCount} schools`} />
      <Stat label="High" value={`${data.highCount} schools`} />
      <Stat label="Top School" value={data.topSchool} />
    </div>
  );
}
