"use client";

import { useEffect, useState } from "react";
import type { SocialPulseData } from "@/types";
import { getSocialData } from "@/lib/mock-data";

interface UseSocialDataResult {
  data: SocialPulseData;
  loading: boolean;
  error: string | null;
}

export function useSocialData(geoid: string): UseSocialDataResult {
  const [data, setData] = useState<SocialPulseData>(() => getSocialData(geoid));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/social/${geoid}`);
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const json = (await res.json()) as SocialPulseData;
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load social data");
          setData(getSocialData(geoid));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [geoid]);

  return { data, loading, error };
}
