"use client";

import type { ActiveLayer, TractCensusMap } from "@/types";
import { getLayerLabel, getLegendStops } from "@/lib/colors";

interface MapLegendProps {
  activeLayer: ActiveLayer;
  censusMap: TractCensusMap;
  scores: Record<string, number>;
  loading?: boolean;
}

export function MapLegend({
  activeLayer,
  censusMap,
  scores,
  loading,
}: MapLegendProps) {
  const legendStops = getLegendStops(activeLayer, censusMap, scores);

  const legendGradient =
    legendStops.length >= 2
      ? `linear-gradient(to right, ${legendStops.map((s) => s.color).join(", ")})`
      : "linear-gradient(to right, #FECACA, #99F6E4, #2DD4BF, #0D9488)";

  return (
    <div className="absolute bottom-4 left-4 rounded-lg border border-gray-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur-sm">
      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
        {getLayerLabel(activeLayer)}
        {loading && (activeLayer === "income" || activeLayer === "rent") && (
          <span className="ml-1 normal-case text-gray-400">(loading…)</span>
        )}
      </p>
      <div className="mt-1 flex items-center gap-2">
        <div
          className="h-2 w-24 rounded-full"
          style={{ background: legendGradient }}
        />
        <div className="flex gap-2 text-[10px] text-gray-500">
          <span>{legendStops[0]?.label ?? "Low"}</span>
          <span>{legendStops[legendStops.length - 1]?.label ?? "High"}</span>
        </div>
      </div>
    </div>
  );
}
