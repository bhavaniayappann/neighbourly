import type { HousingData } from "@/types";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

export function HousingSection({ data }: { data: HousingData }) {
  return (
    <div className="space-y-0.5">
      <Stat label="Median Rent" value={`$${data.medianRent.toLocaleString()}/mo`} />
      <Stat
        label="Median Home Value"
        value={`$${(data.medianHomeValue / 1000000).toFixed(2)}M`}
      />
      <Stat label="Vacancy Rate" value={`${data.vacancyRate}%`} />
      <Stat label="Owner Occupied" value={`${data.ownerOccupied}%`} />
      <Stat label="Renter Occupied" value={`${data.renterOccupied}%`} />
    </div>
  );
}
