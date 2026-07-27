import { create } from "zustand";
import type { ComparisonCriterion } from "@/types";

interface ComparisonCriteriaState {
  criteria: ComparisonCriterion[];
  loading: boolean;
  error: string | null;
  setCriteria: (criteria: ComparisonCriterion[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  upsertCriterion: (criterion: ComparisonCriterion) => void;
  removeCriterion: (id: string) => void;
  reset: () => void;
}

const initialState = {
  criteria: [] as ComparisonCriterion[],
  loading: false,
  error: null as string | null,
};

export const useComparisonCriteriaStore = create<ComparisonCriteriaState>((set) => ({
  ...initialState,
  setCriteria: (criteria) => set({ criteria }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  upsertCriterion: (criterion) =>
    set((state) => {
      const index = state.criteria.findIndex((item) => item.id === criterion.id);
      if (index === -1) {
        return { criteria: [...state.criteria, criterion] };
      }
      const criteria = [...state.criteria];
      criteria[index] = criterion;
      return { criteria };
    }),
  removeCriterion: (id) =>
    set((state) => ({
      criteria: state.criteria.filter((item) => item.id !== id),
    })),
  reset: () => set(initialState),
}));
