"use client";

import { useEffect, useState } from "react";
import type { SchoolsData } from "@/types";
import { GENERIC_MOCK } from "@/lib/mock-data";

interface UseSchoolsDataResult {
  data: SchoolsData;
  loading: boolean;
  error: string | null;
}

export function useSchoolsData(
  geoid: string,
  neighbourhoodId: string | null
): UseSchoolsDataResult {
  const [data, setData] = useState<SchoolsData>(GENERIC_MOCK.schools);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      if (neighbourhoodId) {
        params.set("neighbourhood", neighbourhoodId);
      } else {
        params.set("geoid", geoid);
      }

      try {
        const res = await fetch(`/api/schools?${params.toString()}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }
        const json = (await res.json()) as SchoolsData;
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load school data"
          );
          setData(GENERIC_MOCK.schools);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [geoid, neighbourhoodId]);

  return { data, loading, error };
}
