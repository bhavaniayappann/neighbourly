"use client";

import { useCallback, useMemo } from "react";
import Map, { Layer, Source } from "react-map-gl/maplibre";
import type { MapLayerMouseEvent } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

import neighbourhoods from "@/data/sf-neighbourhoods";
import { useAppStore } from "@/store/useAppStore";
import { scoreToColor } from "@/lib/colors";
import type { NeighbourhoodProperties } from "@/types";

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

const SF_CENTER = { longitude: -122.435, latitude: 37.775, zoom: 12.2 };

export function NeighbourhoodMap() {
  const selectedGeoid = useAppStore((s) => s.selectedGeoid);
  const setSelectedNeighbourhood = useAppStore((s) => s.setSelectedNeighbourhood);

  const colouredGeoJSON = useMemo(() => {
    return {
      ...neighbourhoods,
      features: neighbourhoods.features.map((feature) => {
        const props = feature.properties as NeighbourhoodProperties;
        return {
          ...feature,
          properties: {
            ...props,
            fillColor: scoreToColor(props.score),
          },
        };
      }),
    };
  }, []);

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
          Neighbourhood Score
        </p>
        <div className="mt-1 flex items-center gap-2">
          <div
            className="h-2 w-24 rounded-full"
            style={{
              background: "linear-gradient(to right, #FECACA, #99F6E4, #2DD4BF, #0D9488)",
            }}
          />
          <div className="flex gap-2 text-[10px] text-gray-500">
            <span>Low</span>
            <span>High</span>
          </div>
        </div>
      </div>
    </Map>
  );
}
