"use client";

import { useCallback, useEffect } from "react";
import type { CreateHouseInput, UpdateHouseInput } from "@/lib/houses";
import type { SavedHouse } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { useHouseTrackerStore } from "@/store/useHouseTrackerStore";

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error ?? "Request failed");
  }
  return data;
}

export function useHouseTracker() {
  const { user } = useAuth();
  const houses = useHouseTrackerStore((s) => s.houses);
  const loading = useHouseTrackerStore((s) => s.loading);
  const error = useHouseTrackerStore((s) => s.error);
  const setHouses = useHouseTrackerStore((s) => s.setHouses);
  const setLoading = useHouseTrackerStore((s) => s.setLoading);
  const setError = useHouseTrackerStore((s) => s.setError);
  const upsertHouse = useHouseTrackerStore((s) => s.upsertHouse);
  const removeHouse = useHouseTrackerStore((s) => s.removeHouse);
  const reset = useHouseTrackerStore((s) => s.reset);

  const loadHouses = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await parseJsonResponse<{ houses: SavedHouse[] }>(
        await fetch("/api/houses")
      );
      setHouses(data.houses);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load houses");
    } finally {
      setLoading(false);
    }
  }, [setError, setHouses, setLoading]);

  useEffect(() => {
    if (!user) {
      reset();
      return;
    }

    void loadHouses();
  }, [user, loadHouses, reset]);

  const createHouse = useCallback(
    async (input: CreateHouseInput) => {
      const data = await parseJsonResponse<{ house: SavedHouse }>(
        await fetch("/api/houses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        })
      );
      upsertHouse(data.house);
      return data.house;
    },
    [upsertHouse]
  );

  const updateHouse = useCallback(
    async (id: string, input: UpdateHouseInput) => {
      const data = await parseJsonResponse<{ house: SavedHouse }>(
        await fetch(`/api/houses/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(input),
        })
      );
      upsertHouse(data.house);
      return data.house;
    },
    [upsertHouse]
  );

  const deleteHouse = useCallback(
    async (id: string) => {
      await parseJsonResponse<{ ok: boolean }>(
        await fetch(`/api/houses/${id}`, { method: "DELETE" })
      );
      removeHouse(id);
    },
    [removeHouse]
  );

  return {
    houses,
    loading,
    error,
    loadHouses,
    createHouse,
    updateHouse,
    deleteHouse,
  };
}
