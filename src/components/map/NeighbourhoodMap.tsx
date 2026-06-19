"use client";

import { useCallback, useMemo } from "react";
import Map, { Layer, Source } from "react-map-gl/maplibre";
import type { MapLayerMouseEvent } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

import neighbourhoods from "@/data/sf-neighbourhoods";
import { useCensusBulk } from "@/hooks/useCensusData";
import { getColorScale, getLayerLabel, getLegendStops } from "@/lib/colors";
import { useAppStore } from "@/store/useAppStore";
import type { NeighbourhoodProperties } from "@/types";

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

const SF_CENTER = { longitude: -122.435, latitude: 37.775, zoom: 12.2 };

export function NeighbourhoodMap() {
  const selectedGeoid = useAppStore((s) => s.selectedGeoid);
  const activeLayer = useAppStore((s) => s.activeLayer);
  const setSelectedNeighbourhood = useAppStore((s) => s.setSelectedNeighbourhood);

  const geoids = useMemo(
    () =>
      neighbourhoods.features.map(
        (f) => (f.properties as NeighbourhoodProperties).geoid
      ),
    []
  );

  const scores = useMemo(() => {
    const map: Record<string, number> = {};
    for (const feature of neighbourhoods.features) {
      const props = feature.properties as NeighbourhoodProperties;
      map[props.geoid] = props.score;
    }
    return map;
  }, []);

  const { data: censusMap, loading: censusLoading } = useCensusBulk(geoids);

  const colorForTract = useMemo(
    () => getColorScale(activeLayer, censusMap, scores),
    [activeLayer, censusMap, scores]
  );

  const colouredGeoJSON = useMemo(() => {
    return {
      ...neighbourhoods,
      features: neighbourhoods.features.map((feature) => {
        const props = feature.properties as NeighbourhoodProperties;
        return {
          ...feature,
          properties: {
            ...props,
            fillColor: colorForTract(props.geoid, props.score),
          },
        };
      }),
    };
  }, [colorForTract]);

  const legendStops = useMemo(
    () => getLegendStops(activeLayer, censusMap, scores),
    [activeLayer, censusMap, scores]
  );

  const legendGradient =
    legendStops.length >= 2
      ? `linear-gradient(to right, ${legendStops.map((s) => s.color).join(", ")})`
      : "linear-gradient(to right, #FECACA, #99F6E4, #2DD4BF, #0D9488)";

  const handleClick = useCallback(
    (e: MapLayerMouseEvent) => {
      const feature = e.features?.[0];
      if (!feature?.properties) return;
      const geoid = feature.properties.geoid as string;
      const name = feature.properties.name as string;
      setSelectedNeighbourhood(geoid, name);
    },
    [setSelectedNeighbourhood]
  );

  return (
    <Map
      initialViewState={SF_CENTER}
      mapStyle={MAP_STYLE}
      style={{ width: "100%", height: "100%" }}
      interactiveLayerIds={["neighbourhood-fill"]}
      onClick={handleClick}
      cursor="pointer"
    >
      <Source id="neighbourhoods" type="geojson" data={colouredGeoJSON}>
        <Layer
          id="neighbourhood-fill"
          type="fill"
          paint={{
            "fill-color": ["get", "fillColor"],
            "fill-opacity": [
              "case",
              ["==", ["get", "geoid"], selectedGeoid],
              0.75,
              0.45,
            ],
          }}
        />
        <Layer
          id="neighbourhood-outline"
          type="line"
          paint={{
            "line-color": [
              "case",
              ["==", ["get", "geoid"], selectedGeoid],
              "#0D9488",
              "#ffffff",
            ],
            "line-width": [
              "case",
              ["==", ["get", "geoid"], selectedGeoid],
              2.5,
              1,
            ],
          }}
        />
      </Source>

      <div className="absolute bottom-4 left-4 rounded-lg border border-gray-200 bg-white/95 px-3 py-2 shadow-sm backdrop-blur-sm">
        <p className="text-[10px] font-medium uppercase tracking-wide text-gray-500">
          {getLayerLabel(activeLayer)}
          {censusLoading && activeLayer !== "overview" && (
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
    </Map>
  );
}
