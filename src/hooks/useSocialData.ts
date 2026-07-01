"use client";

import { useEffect, useState } from "react";
import type { SocialPulseData } from "@/types";
import { getSocialData } from "@/lib/mock-data";

const FETCH_TIMEOUT_MS = 28_000;

interface UseSocialDataResult {
  data: SocialPulseData | null;
  loading: boolean;
  error: string | null;
}

export function useSocialData(geoid: string): UseSocialDataResult {
  const [data, setData] = useState<SocialPulseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    async function load() {
      setLoading(true);
      setError(null);
      setData(null);

      try {
        const res = await fetch(`/api/social/${geoid}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`Request failed (${res.status})`);
        const json = (await res.json()) as SocialPulseData;
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) {
          const message =
            err instanceof Error && err.name === "AbortError"
              ? "Social feeds timed out — showing sample data"
              : err instanceof Error
                ? err.message
                : "Failed to load social data";
          setError(message);
          setData({ ...getSocialData(geoid), dataSource: "mock" });
        }
      } finally {
        clearTimeout(timer);
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      controller.abort();
    };
  }, [geoid]);

  return { data, loading, error };
}

export function socialSourceLabel(data: SocialPulseData | null): string | null {
  if (!data?.dataSource) return null;
  if (data.dataSource === "live") return "Live community & news";
  if (data.dataSource === "estimates") return "Real headlines · estimated sentiment";
  if (data.dataSource === "mock") return "Sample data · feeds unavailable";
  return null;
}
