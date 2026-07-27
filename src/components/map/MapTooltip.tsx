"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { CensusTractData, SchoolsData } from "@/types";
import { getNeighbourhoodData } from "@/lib/mock-data";
import { formatLayerValue, getLayerValue } from "@/lib/colors";
import type { ActiveLayer } from "@/types";

export interface TooltipData {
  geoid: string;
  name: string;
  score: number;
  x: number;
  y: number;
}

interface MapTooltipProps {
  data: TooltipData | null;
  census?: CensusTractData;
  schools?: SchoolsData;
  activeLayer: ActiveLayer;
  containerWidth?: number;
}

const TOOLTIP_WIDTH = 200;
const TOOLTIP_OFFSET = 12;

interface Bucket {
  label: string;
  value: number;
}

function deriveIncomeBuckets(medianIncome: number): Bucket[] {
  const base = medianIncome / 1000;
  return [
    { label: "<$50k", value: Math.max(5, Math.round(35 - base * 0.08)) },
    { label: "$50–100k", value: Math.max(8, Math.round(30 - base * 0.04)) },
    { label: "$100–150k", value: Math.max(10, Math.round(20 + base * 0.06)) },
    { label: "$150k+", value: Math.max(12, Math.round(15 + base * 0.06)) },
  ];
}

function deriveAgeBuckets(medianAge: number): Bucket[] {
  const shift = (medianAge - 35) / 10;
  return [
    { label: "<25", value: Math.max(5, Math.round(18 - shift * 4)) },
    { label: "25–34", value: Math.max(10, Math.round(28 + shift * 2)) },
    { label: "35–44", value: Math.max(8, Math.round(22 - shift)) },
    { label: "45–54", value: Math.max(6, Math.round(16 + shift)) },
    { label: "55+", value: Math.max(5, Math.round(16 + shift * 2)) },
  ];
}

function MiniBarChart({
  title,
  buckets,
  color,
}: {
  title: string;
  buckets: Bucket[];
  color: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 168;
    const height = 52;
    const margin = { top: 4, right: 4, bottom: 16, left: 4 };
    const innerW = width - margin.left - margin.right;
    const innerH = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg
      .attr("viewBox", `0 0 ${width} ${height}`)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    const x = d3
      .scaleBand<string>()
      .domain(buckets.map((b) => b.label))
      .range([0, innerW])
      .padding(0.15);

    const y = d3
      .scaleLinear()
      .domain([0, d3.max(buckets, (b) => b.value) ?? 1])
      .nice()
      .range([innerH, 0]);

    g.selectAll("rect")
      .data(buckets)
      .join("rect")
      .attr("x", (d) => x(d.label) ?? 0)
      .attr("y", (d) => y(d.value))
      .attr("width", x.bandwidth())
      .attr("height", (d) => innerH - y(d.value))
      .attr("fill", color)
      .attr("rx", 2);

    g.selectAll("text.label")
      .data(buckets)
      .join("text")
      .attr("class", "label")
      .attr("x", (d) => (x(d.label) ?? 0) + x.bandwidth() / 2)
      .attr("y", innerH + 12)
      .attr("text-anchor", "middle")
      .attr("fill", "#9CA3AF")
      .attr("font-size", "7px")
      .text((d) => d.label);
  }, [buckets, color]);

  return (
    <div>
      <p className="mb-0.5 text-[10px] font-medium text-gray-500">{title}</p>
      <svg ref={svgRef} className="h-[52px] w-full" />
    </div>
  );
}

export function MapTooltip({
  data,
  census,
  schools,
  activeLayer,
  containerWidth,
}: MapTooltipProps) {
  if (!data) return null;

  const mock = getNeighbourhoodData(data.geoid);
  const medianIncome = census?.medianIncome ?? mock.demographics.medianIncome;
  const medianAge = mock.demographics.medianAge;
  const layerValue = getLayerValue(activeLayer, census, data.score, schools);

  const incomeBuckets = deriveIncomeBuckets(medianIncome);
  const ageBuckets = deriveAgeBuckets(medianAge);

  const maxRight =
    containerWidth != null
      ? containerWidth - TOOLTIP_WIDTH - 8
      : typeof window !== "undefined"
        ? window.innerWidth - TOOLTIP_WIDTH - 8
        : 9999;

  let offsetX = data.x + TOOLTIP_OFFSET;
  if (offsetX > maxRight) {
    offsetX = data.x - TOOLTIP_WIDTH - TOOLTIP_OFFSET;
  }
  offsetX = Math.max(8, offsetX);

  const offsetY = Math.max(data.y - 10, 8);

  return (
    <div
      className="pointer-events-none absolute z-20 w-[200px] rounded-lg border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur-sm"
      style={{ left: offsetX, top: offsetY }}
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-gray-900">{data.name}</p>
          <p className="text-[10px] text-gray-500">
            {activeLayer === "schools" ? (
              layerValue > 0 ? (
                <>School rating {formatLayerValue(activeLayer, layerValue)}</>
              ) : (
                "School ranking unavailable"
              )
            ) : (
              <>
                Score {data.score} · {formatLayerValue(activeLayer, layerValue)}
              </>
            )}
          </p>
        </div>
      </div>

      {activeLayer === "schools" ? (
        schools ? (
          <div className="space-y-2 border-t border-gray-100 pt-2">
            <div className="grid grid-cols-3 gap-1 text-center">
              {[
                ["Elementary", schools.elementaryCount],
                ["Middle", schools.middleCount],
                ["High", schools.highCount],
              ].map(([label, count]) => (
                <div key={label} className="rounded bg-gray-50 px-1 py-1.5">
                  <p className="text-sm font-semibold text-gray-800">{count}</p>
                  <p className="text-[8px] text-gray-500">{label}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-[9px] font-medium uppercase tracking-wide text-gray-400">
                Top nearby school
              </p>
              <p className="text-xs text-gray-700">{schools.topSchool}</p>
            </div>
          </div>
        ) : (
          <p className="border-t border-gray-100 pt-2 text-xs text-gray-500">
            No generated ranking for this tract.
          </p>
        )
      ) : (
        <div className="space-y-2 border-t border-gray-100 pt-2">
          <MiniBarChart
            title="Income distribution"
            buckets={incomeBuckets}
            color="#0D9488"
          />
          <MiniBarChart
            title="Age profile"
            buckets={ageBuckets}
            color="#6366F1"
          />
        </div>
      )}
    </div>
  );
}
