"use client";

import { useEffect } from "react";
import { useMap } from "react-map-gl/maplibre";
import { useAppStore } from "@/store/useAppStore";

export function MapFlyHandler() {
  const mapFlyTarget = useAppStore((s) => s.mapFlyTarget);
  const { current: mapRef } = useMap();

  useEffect(() => {
    if (!mapFlyTarget || !mapRef) return;

    if (mapFlyTarget.centroid) {
      mapRef.flyTo({
        center: mapFlyTarget.centroid,
        zoom: 13,
        duration: 1200,
      });
      return;
    }

    const [west, south, east, north] = mapFlyTarget.bounds;
    mapRef.fitBounds(
      [
        [west, south],
        [east, north],
      ],
      { padding: 48, duration: 1200 }
    );
  }, [mapFlyTarget, mapRef]);

  return null;
}
