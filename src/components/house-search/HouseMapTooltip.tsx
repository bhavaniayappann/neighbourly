import type { SavedHouse } from "@/types";

const NOTES_PREVIEW_LENGTH = 80;

interface HouseMapTooltipProps {
  house: SavedHouse;
  x: number;
  y: number;
}

function formatBedsBaths(house: SavedHouse): string | null {
  const parts: string[] = [];
  if (house.beds != null) parts.push(`${house.beds} bd`);
  if (house.baths != null) parts.push(`${house.baths} ba`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function HouseMapTooltip({ house, x, y }: HouseMapTooltipProps) {
  const bedsBaths = formatBedsBaths(house);
  const notesPreview =
    house.notes && house.notes.length > NOTES_PREVIEW_LENGTH
      ? `${house.notes.slice(0, NOTES_PREVIEW_LENGTH)}…`
      : house.notes;

  return (
    <div
      className="pointer-events-none absolute z-20 max-w-xs rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg"
      style={{ left: x + 12, top: y + 12 }}
    >
      <p className="font-medium text-gray-900">{house.address}</p>
      <p className="mt-0.5 capitalize text-gray-500">{house.status}</p>
      {bedsBaths && <p className="mt-1 text-gray-600">{bedsBaths}</p>}
      {house.neighbourhood && (
        <p className="mt-1 text-gray-600">{house.neighbourhood}</p>
      )}
      {notesPreview && (
        <p className="mt-1 text-gray-500 italic">&ldquo;{notesPreview}&rdquo;</p>
      )}
    </div>
  );
}
