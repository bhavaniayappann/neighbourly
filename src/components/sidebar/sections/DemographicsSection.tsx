import type { DemographicsData } from "@/types";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

export function DemographicsSection({ data }: { data: DemographicsData }) {
  return (
    <div className="space-y-0.5">
      <Stat label="Population" value={data.population.toLocaleString()} />
      <Stat label="Median Age" value={`${data.medianAge} yrs`} />
      <Stat label="Median Income" value={`$${data.medianIncome.toLocaleString()}`} />
      <Stat label="Bachelor's+" value={`${data.bachelorsPlus}%`} />
      <Stat label="Household Size" value={`${data.householdSize}`} />
    </div>
  );
}
