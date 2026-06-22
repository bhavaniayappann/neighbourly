"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, { Layer, Source } from "react-map-gl/maplibre";
import type { FeatureCollection } from "geojson";
import type { MapLayerMouseEvent } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

import { useBayAreaCensus } from "@/hooks/useCensusData";
import { resolveAreaSelection } from "@/lib/neighbourhood-client";
import { computeAreaScores, getColorScale } from "@/lib/colors";
import { BAY_AREA_BOUNDS, BAY_AREA_CENTER } from "@/lib/regions";
import { useAppStore } from "@/store/useAppStore";
import type { NeighbourhoodProperties } from "@/types";
import { LayerToggle } from "@/components/map/LayerToggle";
import { MapFlyHandler } from "@/components/map/MapFlyHandler";
import { MapLegend } from "@/components/map/MapLegend";
import { MapTooltip, type TooltipData } from "@/components/map/MapTooltip";

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

const MAX_BOUNDS: [[number, number], [number, number]] = [
  [BAY_AREA_BOUNDS.west, BAY_AREA_BOUNDS.south],
  [BAY_AREA_BOUNDS.east, BAY_AREA_BOUNDS.north],
];

export function NeighbourhoodMap() {
  const selectedGeoid = useAppStore((s) => s.selectedGeoid);
  const activeLayer = useAppStore((s) => s.activeLayer);
  const acsYear = useAppStore((s) => s.acsYear);
  const selectArea = useAppStore((s) => s.selectArea);

  const layerActive = activeLayer !== null;

  const [tracts, setTracts] = useState<FeatureCollection | null>(null);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [tooltip, setTooltip] = useState<TooltipData | null>(null);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!layerActive) return;

    let cancelled = false;
    if (tracts) return;

    fetch("/data/bay-area-tracts.geojson")
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to load area boundaries (${res.status})`);
        return res.json() as Promise<FeatureCollection>;
      })
      .then((data) => {
        if (!cancelled) setTracts(data);
      })
      .catch((err) => {
        if (!cancelled) {
          setGeoError(err instanceof Error ? err.message : "Failed to load map data");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [layerActive, tracts]);

  const { data: censusMap, loading: censusLoading } = useBayAreaCensus(
    acsYear,
    layerActive
  );

  const scores = useMemo(
    () => (layerActive ? computeAreaScores(censusMap) : {}),
    [layerActive, censusMap]
  );

  const colorForTract = useMemo(() => {
    if (!layerActive || !activeLayer) {
      return () => "#E5E7EB";
    }
    return getColorScale(activeLayer, censusMap, scores);
  }, [layerActive, activeLayer, censusMap, scores]);

  const colouredGeoJSON = useMemo(() => {
    if (!tracts || !layerActive) return null;
    return {
      ...tracts,
      features: tracts.features.map((feature) => {
        const props = feature.properties as NeighbourhoodProperties;
        return {
          ...feature,
          properties: {
            ...props,
            fillColor: colorForTract(props.geoid),
          },
        };
      }),
    };
  }, [tracts, layerActive, colorForTract]);

  const handleClick = useCallback(
    (e: MapLayerMouseEvent) => {
      if (!layerActive) return;
      const feature = e.features?.[0];
      if (!feature?.properties) return;
      const geoid = feature.properties.geoid as string;

      void (async () => {
        selectArea(await resolveAreaSelection(geoid));
      })();
    },
    [layerActive, selectArea]
  );

  const handleMouseMove = useCallback(
    (e: MapLayerMouseEvent) => {
      if (!layerActive) return;
      const feature = e.features?.[0];
      if (hoverTimeout.current) clearTimeout(hoverTimeout.current);

      if (!feature?.properties) {
        hoverTimeout.current = setTimeout(() => setTooltip(null), 80);
        return;
      }

      const geoid = feature.properties.geoid as string;
      const name = feature.properties.name as string;
      const score = scores[geoid] ?? 0;

      hoverTimeout.current = setTimeout(() => {
        setTooltip({
          geoid,
          name,
          score,
          x: e.point.x,
          y: e.point.y,
        });
      }, 60);
    },
    [layerActive, scores]
  );

  const handleMouseLeave = useCallback(() => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setTooltip(null);
  }, []);

  return (
    <div className="relative h-full w-full">
      <Map
        initialViewState={BAY_AREA_CENTER}
        maxBounds={MAX_BOUNDS}
        mapStyle={MAP_STYLE}
        style={{ width: "100%", height: "100%" }}
        interactiveLayerIds={
          colouredGeoJSON ? ["neighbourhood-fill"] : []
        }
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        cursor={layerActive ? "pointer" : "grab"}
      >
        <MapFlyHandler />
        <LayerToggle />
        {colouredGeoJSON && (
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
        )}
      </Map>

      {!layerActive && (
        <div className="pointer-events-none absolute left-1/2 top-16 z-10 -translate-x-1/2 rounded-lg border border-gray-200 bg-white/95 px-4 py-2 text-xs text-gray-500 shadow-sm backdrop-blur-sm">
          Select a layer above to view area data
        </div>
      )}

      {layerActive && !tracts && !geoError && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/40">
          <p className="rounded-lg bg-white px-4 py-2 text-sm text-gray-600 shadow">
            Loading area boundaries…
          </p>
        </div>
      )}

      {geoError && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/60">
          <p className="rounded-lg bg-white px-4 py-2 text-sm text-red-600 shadow">
            {geoError}
          </p>
        </div>
      )}

      {layerActive && censusLoading && (
        <div className="pointer-events-none absolute right-4 top-16 rounded-lg border border-gray-200 bg-white/95 px-3 py-1.5 text-xs text-gray-500 shadow-sm">
          Loading census data…
        </div>
      )}

      {layerActive && activeLayer && (
        <>
          <MapTooltip
            data={tooltip}
            census={tooltip ? censusMap[tooltip.geoid] : undefined}
            activeLayer={activeLayer}
          />
          <MapLegend
            activeLayer={activeLayer}
            censusMap={censusMap}
            scores={scores}
            loading={censusLoading}
          />
        </>
      )}
    </div>
  );
}
