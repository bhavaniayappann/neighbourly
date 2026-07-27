"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, { Layer, Source } from "react-map-gl/maplibre";
import type { FeatureCollection, Point } from "geojson";
import type { MapLayerMouseEvent, MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

import { HouseMapTooltip } from "@/components/house-search/HouseMapTooltip";
import { BAY_AREA_BOUNDS, BAY_AREA_CENTER } from "@/lib/regions";
import { useHouseTrackerStore } from "@/store/useHouseTrackerStore";
import type { SavedHouse } from "@/types";

const MAP_STYLE = "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

const MAX_BOUNDS: [[number, number], [number, number]] = [
  [BAY_AREA_BOUNDS.west, BAY_AREA_BOUNDS.south],
  [BAY_AREA_BOUNDS.east, BAY_AREA_BOUNDS.north],
];

interface TooltipState {
  house: SavedHouse;
  x: number;
  y: number;
}

function housesToGeoJSON(houses: SavedHouse[]): FeatureCollection<Point> {
  return {
    type: "FeatureCollection",
    features: houses.map((house) => ({
      type: "Feature",
      properties: {
        id: house.id,
        status: house.status,
      },
      geometry: {
        type: "Point",
        coordinates: [house.lng, house.lat],
      },
    })),
  };
}

export function HouseSearchMap() {
  const houses = useHouseTrackerStore((s) => s.houses);
  const selectedHouseId = useHouseTrackerStore((s) => s.selectedHouseId);
  const selectHouse = useHouseTrackerStore((s) => s.selectHouse);

  const mapRef = useRef<MapRef>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [hasFitBounds, setHasFitBounds] = useState(false);
  const [cursor, setCursor] = useState("grab");

  const geojson = useMemo(() => housesToGeoJSON(houses), [houses]);
  const houseById = useMemo(() => {
    const lookup: Record<string, SavedHouse> = {};
    for (const house of houses) {
      lookup[house.id] = house;
    }
    return lookup;
  }, [houses]);

  const clearTooltip = useCallback(() => setTooltip(null), []);

  useEffect(() => {
    const map = mapRef.current?.getMap();
    if (!map || houses.length === 0 || hasFitBounds) return;

    const lngs = houses.map((house) => house.lng);
    const lats = houses.map((house) => house.lat);
    const west = Math.min(...lngs);
    const east = Math.max(...lngs);
    const south = Math.min(...lats);
    const north = Math.max(...lats);

    map.fitBounds(
      [
        [west, south],
        [east, north],
      ],
      { padding: 80, maxZoom: 14, duration: 0 }
    );
    setHasFitBounds(true);
  }, [houses, hasFitBounds]);

  useEffect(() => {
    if (houses.length === 0) {
      setHasFitBounds(false);
    }
  }, [houses.length]);

  useEffect(() => {
    if (!selectedHouseId) return;
    const house = houseById[selectedHouseId];
    const map = mapRef.current?.getMap();
    if (!house || !map) return;

    map.flyTo({
      center: [house.lng, house.lat],
      zoom: Math.max(map.getZoom(), 13),
      duration: 800,
    });
  }, [selectedHouseId, houseById]);

  const handleClick = useCallback(
    (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const id = feature?.properties?.id;
      if (typeof id === "string") {
        selectHouse(id);
      }
    },
    [selectHouse]
  );

  const handleMouseMove = useCallback(
    (event: MapLayerMouseEvent) => {
      const feature = event.features?.[0];
      const id = feature?.properties?.id;
      if (typeof id !== "string") {
        clearTooltip();
        setCursor("grab");
        return;
      }

      setCursor("pointer");

      const house = houseById[id];
      if (!house) {
        clearTooltip();
        return;
      }

      setTooltip({
        house,
        x: event.point.x,
        y: event.point.y,
      });
    },
    [houseById, clearTooltip]
  );

  return (
    <div className="relative h-full w-full" onPointerLeave={clearTooltip}>
      <Map
        ref={mapRef}
        initialViewState={BAY_AREA_CENTER}
        maxBounds={MAX_BOUNDS}
        mapStyle={MAP_STYLE}
        style={{ width: "100%", height: "100%" }}
        interactiveLayerIds={houses.length > 0 ? ["house-pins"] : []}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => {
          clearTooltip();
          setCursor("grab");
        }}
        cursor={cursor}
      >
        {houses.length > 0 && (
          <Source id="houses" type="geojson" data={geojson}>
            <Layer
              id="house-pins"
              type="circle"
              paint={{
                "circle-radius": [
                  "case",
                  ["==", ["get", "id"], selectedHouseId ?? ""],
                  10,
                  8,
                ],
                "circle-color": [
                  "match",
                  ["get", "status"],
                  "visited",
                  "#F59E0B",
                  "#0D9488",
                ],
                "circle-stroke-width": [
                  "case",
                  ["==", ["get", "id"], selectedHouseId ?? ""],
                  3,
                  2,
                ],
                "circle-stroke-color": "#ffffff",
              }}
            />
          </Source>
        )}
      </Map>

      {houses.length === 0 && (
        <div className="pointer-events-none absolute left-1/2 top-16 z-10 -translate-x-1/2 rounded-lg border border-gray-200 bg-white/95 px-4 py-2 text-xs text-gray-500 shadow-sm backdrop-blur-sm">
          Add a house to see it on the map
        </div>
      )}

      {tooltip && <HouseMapTooltip house={tooltip.house} x={tooltip.x} y={tooltip.y} />}
    </div>
  );
}
