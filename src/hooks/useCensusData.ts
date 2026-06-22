"use client";

import { useEffect, useState } from "react";
import type { AcsYear } from "@/lib/census";
import { BAY_AREA_COUNTY_FIPS } from "@/lib/regions";
import type { CensusTractData } from "@/types";

interface UseCensusDataResult {
  data: CensusTractData | null;
  loading: boolean;
  error: string | null;
}

export function useCensusData(
  geoid: string | null,
  year: AcsYear
): UseCensusDataResult {
  const [data, setData] = useState<CensusTractData | null>(null);
  const [loading, setLoading] = useState(Boolean(geoid));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!geoid) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch(
          `/api/census/${geoid}?year=${encodeURIComponent(year)}`
        );
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
  }, [geoid, year]);

  return { data, loading, error };
}

interface UseCensusBulkResult {
  data: Record<string, CensusTractData>;
  loading: boolean;
  error: string | null;
}

export function useCensusBulk(
  geoids: string[],
  year: AcsYear
): UseCensusBulkResult {
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
          `/api/census/bulk?geoids=${encodeURIComponent(geoidsKey)}&year=${encodeURIComponent(year)}`
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
  }, [geoidsKey, geoids.length, year]);

  return { data, loading, error };
}

interface UseBayAreaCensusResult {
  data: Record<string, CensusTractData>;
  loading: boolean;
  error: string | null;
}

export function useBayAreaCensus(
  year: AcsYear,
  enabled = true
): UseBayAreaCensusResult {
  const [data, setData] = useState<Record<string, CensusTractData>>({});
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setData({});
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const counties = BAY_AREA_COUNTY_FIPS.join(",");
        const res = await fetch(
          `/api/census/county?counties=${encodeURIComponent(counties)}&year=${encodeURIComponent(year)}`
        );
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error ?? `Request failed (${res.status})`);
        }
        const json = (await res.json()) as Record<string, CensusTractData>;
        if (!cancelled) setData(json);
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Failed to load census data"
          );
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
  }, [year, enabled]);

  return { data, loading, error };
}
