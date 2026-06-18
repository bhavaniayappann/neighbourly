import { create } from "zustand";
import type { ActiveLayer } from "@/types";

interface AppState {
  selectedGeoid: string;
  selectedName: string;
  activeLayer: ActiveLayer;
  setSelectedNeighbourhood: (geoid: string, name: string) => void;
  setActiveLayer: (layer: ActiveLayer) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedGeoid: "06075061500",
  selectedName: "Mission District",
  activeLayer: "overview",
  setSelectedNeighbourhood: (geoid, name) =>
    set({ selectedGeoid: geoid, selectedName: name }),
  setActiveLayer: (layer) => set({ activeLayer: layer }),
}));
