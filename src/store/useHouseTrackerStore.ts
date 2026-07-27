import { create } from "zustand";
import type { HouseVisitStatus, SavedHouse } from "@/types";

export type HouseStatusFilter = "all" | HouseVisitStatus;

interface HouseTrackerState {
  houses: SavedHouse[];
  selectedHouseId: string | null;
  statusFilter: HouseStatusFilter;
  compareIds: string[];
  loading: boolean;
  error: string | null;
  setHouses: (houses: SavedHouse[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  selectHouse: (id: string | null) => void;
  setStatusFilter: (filter: HouseStatusFilter) => void;
  toggleCompareId: (id: string) => void;
  clearCompareIds: () => void;
  upsertHouse: (house: SavedHouse) => void;
  removeHouse: (id: string) => void;
  reset: () => void;
}

const initialState = {
  houses: [] as SavedHouse[],
  selectedHouseId: null as string | null,
  statusFilter: "all" as HouseStatusFilter,
  compareIds: [] as string[],
  loading: false,
  error: null as string | null,
};

export const useHouseTrackerStore = create<HouseTrackerState>((set) => ({
  ...initialState,
  setHouses: (houses) => set({ houses }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  selectHouse: (id) => set({ selectedHouseId: id }),
  setStatusFilter: (statusFilter) => set({ statusFilter }),
  toggleCompareId: (id) =>
    set((state) => {
      const exists = state.compareIds.includes(id);
      if (exists) {
        return { compareIds: state.compareIds.filter((item) => item !== id) };
      }
      if (state.compareIds.length >= 4) return state;
      return { compareIds: [...state.compareIds, id] };
    }),
  clearCompareIds: () => set({ compareIds: [] }),
  upsertHouse: (house) =>
    set((state) => {
      const index = state.houses.findIndex((item) => item.id === house.id);
      if (index === -1) {
        return { houses: [house, ...state.houses] };
      }
      const houses = [...state.houses];
      houses[index] = house;
      return { houses };
    }),
  removeHouse: (id) =>
    set((state) => ({
      houses: state.houses.filter((house) => house.id !== id),
      selectedHouseId:
        state.selectedHouseId === id ? null : state.selectedHouseId,
      compareIds: state.compareIds.filter((item) => item !== id),
    })),
  reset: () => set(initialState),
}));
