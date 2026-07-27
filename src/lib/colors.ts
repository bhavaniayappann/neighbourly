import * as d3 from "d3";
import { GENERIC_MOCK } from "@/lib/mock-data";
import type {
  ActiveLayer,
  CensusTractData,
  SchoolsData,
  TractCensusMap,
  TractSchoolsMap,
} from "@/types";

const CHOROPLETH_RANGE = ["#FECACA", "#99F6E4", "#2DD4BF", "#2DD4BF", "#0D9488"] as const;

const SCORE_COLOR = d3
  .scaleLinear<string>()
  .domain([70, 80, 90, 100])
  .range(["#FECACA", "#99F6E4", "#2DD4BF", "#0D9488"])
  .clamp(true);

export function scoreToColor(score: number): string {
  return SCORE_COLOR(score);
}

/** Income-based composite score (70–100) from loaded census tracts. */
export function computeAreaScores(censusMap: TractCensusMap): Record<string, number> {
  const entries = Object.entries(censusMap)
    .filter(([, d]) => d.medianIncome > 0)
    .sort((a, b) => a[1].medianIncome - b[1].medianIncome);

  const scores: Record<string, number> = {};
  const n = entries.length;
  if (n === 0) return scores;

  entries.forEach(([geoid], i) => {
    scores[geoid] = Math.round(70 + (i / Math.max(n - 1, 1)) * 30);
  });
  return scores;
}

export function getLayerLabel(layer: ActiveLayer): string {
  const labels: Record<ActiveLayer, string> = {
    overview: "Area Score",
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
  score: number,
  schools?: SchoolsData
): number {
  switch (layer) {
    case "income":
      return census?.medianIncome ?? 0;
    case "rent":
      return census?.medianRent ?? 0;
    case "schools":
      return schools?.avgRating ?? 0;
    case "walk":
      return GENERIC_MOCK.walkability.walkScore;
    case "overview":
      return score;
    default:
      return score;
  }
}

export function getColorScale(
  layer: ActiveLayer,
  censusMap: TractCensusMap,
  scores: Record<string, number>,
  schoolsMap: TractSchoolsMap = {}
): (geoid: string) => string {
  if (layer === "overview") {
    return (geoid) => {
      const score = scores[geoid];
      if (score === undefined) return "#E5E7EB";
      return scoreToColor(score);
    };
  }

  const geoids = layer === "schools" ? Object.keys(schoolsMap) : Object.keys(scores);
  const values = geoids
    .map((geoid) =>
      getLayerValue(
        layer,
        censusMap[geoid],
        scores[geoid] ?? 0,
        schoolsMap[geoid]
      )
    )
    .filter((v) => v > 0);

  if (values.length === 0) {
    return () => "#E5E7EB";
  }

  const scale = d3
    .scaleQuantile<string>()
    .domain(values)
    .range([...CHOROPLETH_RANGE]);

  return (geoid) => {
    const value = getLayerValue(
      layer,
      censusMap[geoid],
      scores[geoid] ?? 0,
      schoolsMap[geoid]
    );
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
    case "schools":
      return `${value.toFixed(1)}/10`;
    case "walk":
      return String(Math.round(value));
    default:
      return String(Math.round(value));
  }
}

export function getLegendStops(
  layer: ActiveLayer,
  censusMap: TractCensusMap,
  scores: Record<string, number>,
  schoolsMap: TractSchoolsMap = {}
): { label: string; color: string }[] {
  if (layer === "overview") {
    return [
      { label: "Low", color: "#FECACA" },
      { label: "Mid", color: "#2DD4BF" },
      { label: "High", color: "#0D9488" },
    ];
  }

  const geoids = layer === "schools" ? Object.keys(schoolsMap) : Object.keys(scores);
  const values = geoids
    .map((geoid) =>
      getLayerValue(
        layer,
        censusMap[geoid],
        scores[geoid] ?? 0,
        schoolsMap[geoid]
      )
    )
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

  const formatValue = (q: number) => {
    if (layer === "income") return `$${Math.round(q / 1000)}k`;
    if (layer === "rent") return `$${q.toLocaleString()}`;
    if (layer === "schools") return `${q.toFixed(1)}`;
    if (layer === "walk") return String(Math.round(q));
    return String(Math.round(q));
  };

  return [
    { label: formatValue(values[0]), color: colorScale(values[0]) },
    {
      label: formatValue(quantiles[1] ?? values[Math.floor(values.length / 2)]),
      color: colorScale(quantiles[1] ?? values[Math.floor(values.length / 2)]),
    },
    {
      label: formatValue(values[values.length - 1]),
      color: colorScale(values[values.length - 1]),
    },
  ];
}
