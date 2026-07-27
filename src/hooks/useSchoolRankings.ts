"use client";

import { useEffect, useState } from "react";

import type { TractSchoolsMap } from "@/types";

interface UseSchoolRankingsResult {
  data: TractSchoolsMap;
  loading: boolean;
  error: string | null;
}

let cachedRankings: TractSchoolsMap | null = null;
let rankingsRequest: Promise<TractSchoolsMap> | null = null;

async function fetchSchoolRankings(): Promise<TractSchoolsMap> {
  if (cachedRankings) return cachedRankings;

  rankingsRequest ??= fetch("/data/bay-area-schools.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load school rankings (${response.status})`);
      }
      return response.json() as Promise<TractSchoolsMap>;
    })
    .then((rankings) => {
      cachedRankings = rankings;
      return rankings;
    })
    .catch((error) => {
      rankingsRequest = null;
      throw error;
    });

  return rankingsRequest;
}

export function useSchoolRankings(enabled: boolean): UseSchoolRankingsResult {
  const [data, setData] = useState<TractSchoolsMap>(cachedRankings ?? {});
  const [loading, setLoading] = useState(enabled && !cachedRankings);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(!cachedRankings);
    setError(null);

    void fetchSchoolRankings()
      .then((rankings) => {
        if (!cancelled) setData(rankings);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load school rankings"
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { data, loading, error };
}
