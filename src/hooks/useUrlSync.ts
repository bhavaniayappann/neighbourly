"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/store/useAppStore";
import { getTractByGeoid } from "@/lib/tracts";
import {
  fetchNeighbourhoodProfile,
  resolveAreaSelection,
} from "@/lib/neighbourhood-client";

export function buildShareUrl(
  neighbourhoodId: string | null,
  geoid: string,
  name: string
): string {
  if (typeof window === "undefined") return "";
  const url = new URL(window.location.href);
  url.searchParams.delete("geoid");
  url.searchParams.delete("name");
  url.searchParams.delete("neighbourhood");

  if (neighbourhoodId) {
    url.searchParams.set("neighbourhood", neighbourhoodId);
  } else {
    url.searchParams.set("geoid", geoid);
    url.searchParams.set("name", name);
  }

  return url.toString();
}

export function useUrlSync() {
  const selectedNeighbourhoodId = useAppStore((s) => s.selectedNeighbourhoodId);
  const selectedGeoid = useAppStore((s) => s.selectedGeoid);
  const selectedName = useAppStore((s) => s.selectedName);
  const selectedCity = useAppStore((s) => s.selectedCity);
  const selectedCounty = useAppStore((s) => s.selectedCounty);
  const selectArea = useAppStore((s) => s.selectArea);
  const flyToArea = useAppStore((s) => s.flyToArea);
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const params = new URLSearchParams(window.location.search);
    const neighbourhoodParam = params.get("neighbourhood")?.trim();
    const geoidParam = params.get("geoid")?.trim();

    async function initFromNeighbourhood(id: string) {
      const profile = await fetchNeighbourhoodProfile(id);
      if (!profile) return;

      const geoid = profile.primaryGeoid ?? selectedGeoid;
      const tract = geoid ? getTractByGeoid(geoid) : null;
      const bounds = profile.bbox;
      const selection = {
        neighbourhoodId: profile.id,
        geoid,
        displayName: profile.displayName,
        city: profile.city,
        county: profile.county,
      };

      if (tract?.bounds) {
        flyToArea(selection, tract.bounds, tract.centroid);
      } else {
        flyToArea(selection, bounds);
      }
    }

    async function initFromGeoid(geoid: string) {
      const tract = getTractByGeoid(geoid);
      const selection = await resolveAreaSelection(geoid);
      const profile =
        selection.neighbourhoodId != null
          ? await fetchNeighbourhoodProfile(selection.neighbourhoodId)
          : null;

      if (tract?.bounds) {
        flyToArea(selection, tract.bounds, tract.centroid);
      } else if (profile?.bbox) {
        flyToArea(selection, profile.bbox);
      } else {
        selectArea(selection);
      }
    }

    if (neighbourhoodParam) {
      void initFromNeighbourhood(neighbourhoodParam);
      return;
    }

    if (geoidParam && /^\d{11}$/.test(geoidParam)) {
      void initFromGeoid(geoidParam);
      return;
    }

    const tract = getTractByGeoid(selectedGeoid);
    if (tract?.bounds) {
      flyToArea(
        {
          neighbourhoodId: selectedNeighbourhoodId,
          geoid: selectedGeoid,
          displayName: selectedName,
          city: selectedCity,
          county: selectedCounty,
        },
        tract.bounds,
        tract.centroid
      );
    }
  }, [
    flyToArea,
    selectArea,
    selectedCity,
    selectedCounty,
    selectedGeoid,
    selectedName,
    selectedNeighbourhoodId,
  ]);

  useEffect(() => {
    if (!initialized.current) return;

    const url = new URL(window.location.href);

    if (selectedNeighbourhoodId) {
      url.searchParams.set("neighbourhood", selectedNeighbourhoodId);
      url.searchParams.delete("geoid");
      url.searchParams.delete("name");
    } else {
      url.searchParams.delete("neighbourhood");
      url.searchParams.set("geoid", selectedGeoid);
      url.searchParams.set("name", selectedName);
    }

    const next = `${url.pathname}${url.search}`;
    if (`${window.location.pathname}${window.location.search}` !== next) {
      window.history.replaceState(null, "", next);
    }
  }, [selectedNeighbourhoodId, selectedGeoid, selectedName]);
}
