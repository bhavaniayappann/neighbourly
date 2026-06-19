import * as d3 from "d3";
import type { ActiveLayer, CensusTractData, TractCensusMap } from "@/types";

const CHOROPLETH_RANGE = ["#FECACA", "#99F6E4", "#2DD4BF", "#2DD4BF", "#0D9488"] as const;

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

export function getLayerValue(
  layer: ActiveLayer,
  census: CensusTractData | undefined,
  score: number
): number {
  if (!census) return layer === "overview" ? score : 0;

  switch (layer) {
    case "income":
      return census.medianIncome;
    case "rent":
      return census.medianRent;
    case "overview":
      return score;
    default:
      return score;
  }
}

export function getColorScale(
  layer: ActiveLayer,
  censusMap: TractCensusMap,
  scores: Record<string, number>
): (geoid: string, score: number) => string {
  if (layer === "overview" || layer === "schools" || layer === "walk") {
    return (_geoid, score) => scoreToColor(score);
  }

  const values = Object.keys(censusMap)
    .map((geoid) => getLayerValue(layer, censusMap[geoid], scores[geoid] ?? 0))
    .filter((v) => v > 0);

  if (values.length === 0) {
    return () => "#E5E7EB";
  }

  const scale = d3
    .scaleQuantile<string>()
    .domain(values)
    .range([...CHOROPLETH_RANGE]);

  return (geoid, score) => {
    const value = getLayerValue(layer, censusMap[geoid], score);
    if (value <= 0) return "#E5E7EB";
    return scale(value);
  };
}

export function formatLayerValue(layer: ActiveLayer, value: number): string {
  switch (layer) {
    case "income":
      return `$${Math.round(value / 1000)}k`;
    case "rent":
      return `$${Math.round(value / 100)}00`;
    default:
      return String(Math.round(value));
  }
}

export function getLegendStops(
  layer: ActiveLayer,
  censusMap: TractCensusMap,
  scores: Record<string, number>
): { label: string; color: string }[] {
  if (layer === "overview" || layer === "schools" || layer === "walk") {
    return [
      { label: "Low", color: "#FECACA" },
      { label: "Mid", color: "#2DD4BF" },
      { label: "High", color: "#0D9488" },
    ];
  }

  const values = Object.keys(censusMap)
    .map((geoid) => getLayerValue(layer, censusMap[geoid], scores[geoid] ?? 0))
    .filter((v) => v > 0)
    .sort(d3.ascending);

  if (values.length === 0) {
    return [{ label: "No data", color: "#E5E7EB" }];
  }

  const scale = d3.scaleQuantile<number>().domain(values).range([0, 1, 2, 3, 4]);
  const quantiles = scale.quantiles();

  const colorScale = d3
    .scaleQuantile<string>()
    .domain(values)
    .range([...CHOROPLETH_RANGE]);

  const labels =
    layer === "income"
      ? quantiles.map((q) => `$${Math.round(q / 1000)}k`)
      : quantiles.map((q) => `$${q.toLocaleString()}`);

  return [
    { label: labels[0] ?? "Low", color: colorScale(values[0]) },
    { label: labels[2] ?? "Mid", color: colorScale(quantiles[1] ?? values[Math.floor(values.length / 2)]) },
    { label: labels[labels.length - 1] ?? "High", color: colorScale(values[values.length - 1]) },
  ];
}
