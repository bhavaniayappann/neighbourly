import * as d3 from "d3";
import type { ActiveLayer } from "@/types";

const SCORE_COLOR = d3
  .scaleLinear<string>()
  .domain([70, 80, 90, 100])
  .range(["#FECACA", "#99F6E4", "#2DD4BF", "#0D9488"])
  .clamp(true);

export function scoreToColor(score: number): string {
  return SCORE_COLOR(score);
}

export function getLayerLabel(layer: ActiveLayer): string {
  const labels: Record<ActiveLayer, string> = {
    overview: "Neighbourhood Score",
    income: "Median Income",
    schools: "School Rating",
    walk: "Walk Score",
    rent: "Median Rent",
  };
  return labels[layer];
}
