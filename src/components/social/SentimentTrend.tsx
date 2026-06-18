"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";

interface SentimentTrendProps {
  data: number[];
}

export function SentimentTrend({ data }: SentimentTrendProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const width = 240;
    const height = 48;
    const margin = { top: 4, right: 4, bottom: 4, left: 4 };

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const x = d3
      .scaleLinear()
      .domain([0, data.length - 1])
      .range([margin.left, width - margin.right]);

    const y = d3
      .scaleLinear()
      .domain([d3.min(data)! - 5, d3.max(data)! + 5])
      .range([height - margin.bottom, margin.top]);

    const line = d3
      .line<number>()
      .x((_, i) => x(i))
      .y((d) => y(d))
      .curve(d3.curveMonotoneX);

    svg
      .append("path")
      .datum(data)
      .attr("fill", "none")
      .attr("stroke", "#0D9488")
      .attr("stroke-width", 2)
      .attr("d", line);

    svg
      .selectAll("circle")
      .data(data)
      .join("circle")
      .attr("cx", (_, i) => x(i))
      .attr("cy", (d) => y(d))
      .attr("r", 3)
      .attr("fill", "#0D9488");
  }, [data]);

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 240 48"
      className="w-full"
      role="img"
      aria-label="Sentiment trend over 6 months"
    />
  );
}
