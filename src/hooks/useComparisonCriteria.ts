"use client";

import { useCallback, useEffect } from "react";
import type { CriterionValueType, CriterionValuesMap, HouseCriterionValue } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { useComparisonCriteriaStore } from "@/store/useComparisonCriteriaStore";

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Request failed");
  }
  return data;
}

export type { CriterionValuesMap } from "@/types";

export function useComparisonCriteria() {
  const { user } = useAuth();
  const criteria = useComparisonCriteriaStore((s) => s.criteria);
  const loading = useComparisonCriteriaStore((s) => s.loading);
  const error = useComparisonCriteriaStore((s) => s.error);
  const setCriteria = useComparisonCriteriaStore((s) => s.setCriteria);
  const setLoading = useComparisonCriteriaStore((s) => s.setLoading);
  const setError = useComparisonCriteriaStore((s) => s.setError);
  const upsertCriterion = useComparisonCriteriaStore((s) => s.upsertCriterion);
  const removeCriterion = useComparisonCriteriaStore((s) => s.removeCriterion);
  const reset = useComparisonCriteriaStore((s) => s.reset);

  const loadCriteria = useCallback(
    async (houseIds?: string[]) => {
      setLoading(true);
      setError(null);

      try {
        const query =
          houseIds && houseIds.length > 0
            ? `?houseIds=${encodeURIComponent(houseIds.join(","))}`
            : "";
        const data = await parseJsonResponse<{
          criteria: typeof criteria;
          valuesByHouseId?: Record<string, CriterionValuesMap>;
        }>(await fetch(`/api/criteria${query}`));
        setCriteria(data.criteria);
        return data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to load criteria";
        setError(message);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [setCriteria, setError, setLoading]
  );

  useEffect(() => {
    if (!user) {
      reset();
      return;
    }

    void loadCriteria();
  }, [user, loadCriteria, reset]);

  const createCriterion = useCallback(
    async (label: string, valueType: CriterionValueType = "text") => {
      const data = await parseJsonResponse<{ criterion: (typeof criteria)[number] }>(
        await fetch("/api/criteria", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ label, valueType }),
        })
      );
      upsertCriterion(data.criterion);
      return data.criterion;
    },
    [upsertCriterion]
  );

  const updateCriterion = useCallback(
    async (
      id: string,
      updates: { label?: string; valueType?: CriterionValueType }
    ) => {
      const data = await parseJsonResponse<{ criterion: (typeof criteria)[number] }>(
        await fetch(`/api/criteria/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updates),
        })
      );
      upsertCriterion(data.criterion);
      return data.criterion;
    },
    [upsertCriterion]
  );

  const deleteCriterion = useCallback(
    async (id: string) => {
      await parseJsonResponse<{ ok: boolean }>(
        await fetch(`/api/criteria/${id}`, { method: "DELETE" })
      );
      removeCriterion(id);
    },
    [removeCriterion]
  );

  const loadHouseValues = useCallback(async (houseId: string) => {
    const data = await parseJsonResponse<{ values: HouseCriterionValue[] }>(
      await fetch(`/api/houses/${houseId}/criteria`)
    );
    return data.values;
  }, []);

  const saveHouseValues = useCallback(
    async (houseId: string, values: HouseCriterionValue[]) => {
      const data = await parseJsonResponse<{ values: HouseCriterionValue[] }>(
        await fetch(`/api/houses/${houseId}/criteria`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ values }),
        })
      );
      return data.values;
    },
    []
  );

  return {
    criteria,
    loading,
    error,
    loadCriteria,
    createCriterion,
    updateCriterion,
    deleteCriterion,
    loadHouseValues,
    saveHouseValues,
  };
}
