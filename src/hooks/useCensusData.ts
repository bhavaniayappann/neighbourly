"use client";

import { useEffect, useState } from "react";
import type { CensusTractData } from "@/types";

interface UseCensusDataResult {
  data: CensusTractData | null;
  loading: boolean;
  error: string | null;
}

export function useCensusData(geoid: string): UseCensusDataResult {
  const [data, setData] = useState<CensusTractData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(`/api/census/${geoid}`);
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }
        const json = (await res.json()) as CensusTractData;
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load census data");
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
  }, [geoid]);

  return { data, loading, error };
}

interface UseCensusBulkResult {
  data: Record<string, CensusTractData>;
  loading: boolean;
  error: string | null;
}

export function useCensusBulk(geoids: string[]): UseCensusBulkResult {
  const [data, setData] = useState<Record<string, CensusTractData>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const geoidsKey = geoids.slice().sort().join(",");

  useEffect(() => {
    if (geoids.length === 0) {
      setData({});
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/census/bulk?geoids=${encodeURIComponent(geoidsKey)}`
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }
        const json = (await res.json()) as Record<string, CensusTractData>;
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load census data");
          setData({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [geoidsKey, geoids.length]);

  return { data, loading, error };
}
