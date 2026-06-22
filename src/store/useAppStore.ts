import { create } from "zustand";
import type { BBox } from "geojson";
import type { ActiveLayer } from "@/types";
import { DEFAULT_ACS_YEAR, type AcsYear } from "@/lib/census";
import { getTractByGeoid } from "@/lib/tracts";

export type Granularity = "tract" | "zip";

export interface MapFlyTarget {
  bounds: BBox;
  geoid: string;
  name: string;
  city?: string;
  county?: string;
  centroid?: [number, number];
  token: number;
}

export interface AreaSelection {
  neighbourhoodId: string | null;
  geoid: string;
  displayName: string;
  city: string;
  county: string;
}

interface AppState {
  selectedNeighbourhoodId: string | null;
  selectedGeoid: string;
  selectedName: string;
  selectedCity: string;
  selectedCounty: string;
  activeLayer: ActiveLayer | null;
  acsYear: AcsYear;
  granularity: Granularity;
  mapFlyTarget: MapFlyTarget | null;
  selectArea: (selection: AreaSelection) => void;
  setActiveLayer: (layer: ActiveLayer | null) => void;
  setAcsYear: (year: AcsYear) => void;
  setGranularity: (granularity: Granularity) => void;
  flyToArea: (
    selection: AreaSelection,
    bounds: BBox,
    centroid?: [number, number]
  ) => void;
  /** @deprecated use selectArea */
  setSelectedNeighbourhood: (
    geoid: string,
    name: string,
    county?: string,
    city?: string,
    neighbourhoodId?: string | null
  ) => void;
  /** @deprecated use flyToArea */
  flyToNeighbourhood: (
    geoid: string,
    name: string,
    bounds: BBox,
    county?: string,
    city?: string,
    centroid?: [number, number],
    neighbourhoodId?: string | null
  ) => void;
}

const defaultTract = getTractByGeoid("06001400100");

let flyToken = 0;

function applySelection(
  set: (
    partial:
      | Partial<AppState>
      | ((state: AppState) => Partial<AppState>)
  ) => void,
  selection: AreaSelection,
  mapFlyTarget?: MapFlyTarget | null
) {
  set({
    selectedNeighbourhoodId: selection.neighbourhoodId,
    selectedGeoid: selection.geoid,
    selectedName: selection.displayName,
    selectedCity: selection.city,
    selectedCounty: selection.county,
    ...(mapFlyTarget !== undefined ? { mapFlyTarget } : {}),
  });
}

export const useAppStore = create<AppState>((set) => ({
  selectedNeighbourhoodId: null,
  selectedGeoid: defaultTract?.geoid ?? "06001400100",
  selectedName: defaultTract?.name ?? "Claremont",
  selectedCity: defaultTract?.city ?? "Oakland",
  selectedCounty: defaultTract?.county ?? "Alameda",
  activeLayer: null,
  acsYear: DEFAULT_ACS_YEAR,
  granularity: "tract",
  mapFlyTarget: null,
  selectArea: (selection) => applySelection(set, selection),
  setActiveLayer: (layer) => set({ activeLayer: layer }),
  setAcsYear: (year) => set({ acsYear: year }),
  setGranularity: (granularity) => set({ granularity }),
  flyToArea: (selection, bounds, centroid) => {
    flyToken += 1;
    applySelection(set, selection, {
      bounds,
      geoid: selection.geoid,
      name: selection.displayName,
      city: selection.city,
      county: selection.county,
      centroid,
      token: flyToken,
    });
  },
  setSelectedNeighbourhood: (geoid, name, county, city, neighbourhoodId = null) => {
    const tract = getTractByGeoid(geoid);
    applySelection(set, {
      neighbourhoodId: neighbourhoodId ?? null,
      geoid,
      displayName: name,
      city: city ?? tract?.city ?? "",
      county: county ?? tract?.county ?? "Bay Area",
    });
  },
  flyToNeighbourhood: (
    geoid,
    name,
    bounds,
    county,
    city,
    centroid,
    neighbourhoodId = null
  ) => {
    const tract = getTractByGeoid(geoid);
    flyToken += 1;
    applySelection(set, {
      neighbourhoodId: neighbourhoodId ?? null,
      geoid,
      displayName: name,
      city: city ?? tract?.city ?? "",
      county: county ?? tract?.county ?? "Bay Area",
    }, {
      bounds,
      geoid,
      name,
      city: city ?? tract?.city,
      county: county ?? tract?.county,
      centroid,
      token: flyToken,
    });
  },
}));
