"use client";

import { useAppStore } from "@/store/useAppStore";
import type { ActiveLayer } from "@/types";

const LAYERS: { id: ActiveLayer; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "income", label: "Income" },
  { id: "schools", label: "Schools" },
  { id: "walk", label: "Walk" },
  { id: "rent", label: "Rent" },
];

export function LayerToggle() {
  const activeLayer = useAppStore((s) => s.activeLayer);
  const setActiveLayer = useAppStore((s) => s.setActiveLayer);

  return (
    <div
      className="absolute left-1/2 top-4 z-10 flex -translate-x-1/2 rounded-lg border border-gray-200 bg-white/95 p-1 shadow-sm backdrop-blur-sm"
      role="tablist"
      aria-label="Map data layers"
    >
      {LAYERS.map(({ id, label }) => {
        const active = activeLayer === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setActiveLayer(active ? null : id)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              active
                ? "bg-teal-600 text-white shadow-sm"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}
