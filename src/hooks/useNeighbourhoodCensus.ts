"use client";

import { useEffect, useState } from "react";
import type { AcsYear } from "@/lib/census";
import type { NeighbourhoodCensusData } from "@/lib/neighbourhood";
import { fetchNeighbourhoodCensus } from "@/lib/neighbourhood-client";

interface UseNeighbourhoodCensusResult {
  data: NeighbourhoodCensusData | null;
  loading: boolean;
  error: string | null;
}

export function useNeighbourhoodCensus(
  neighbourhoodId: string | null,
  year: AcsYear
): UseNeighbourhoodCensusResult {
  const [data, setData] = useState<NeighbourhoodCensusData | null>(null);
  const [loading, setLoading] = useState(Boolean(neighbourhoodId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!neighbourhoodId) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    const id = neighbourhoodId;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const json = await fetchNeighbourhoodCensus(id, year);
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load area data"
          );
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [neighbourhoodId, year]);

  return { data, loading, error };
}
