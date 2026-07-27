"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { TopNav } from "@/components/layout/TopNav";
import { CustomCriteriaEditor } from "@/components/house-search/CustomCriteriaEditor";
import {
  CriterionValueInput,
  getCriterionValueFromMap,
  mergeCriterionValue,
  valuesMapToArray,
} from "@/components/house-search/CriterionValueInput";
import { SignInPrompt } from "@/components/house-search/SignInPrompt";
import { useAuth } from "@/hooks/useAuth";
import {
  type CriterionValuesMap,
  useComparisonCriteria,
} from "@/hooks/useComparisonCriteria";
import { useHouseTracker } from "@/hooks/useHouseTracker";
import { getNumericCriterionValue } from "@/lib/criteria";
import { useHouseTrackerStore } from "@/store/useHouseTrackerStore";
import type { ComparisonCriterion, HouseVisitStatus, SavedHouse } from "@/types";

function formatCurrency(value: number | undefined): string {
  if (value == null) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | undefined): string {
  if (!value) return "—";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: HouseVisitStatus }) {
  const styles =
    status === "visited"
      ? "bg-amber-50 text-amber-800 ring-amber-200"
      : "bg-teal-50 text-teal-800 ring-teal-200";

  return (
    <span
      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ring-1 ring-inset ${styles}`}
    >
      {status}
    </span>
  );
}

interface CompareRow {
  key: string;
  label: string;
  getDisplay: (house: SavedHouse) => string;
  getNumeric?: (house: SavedHouse) => number | null;
  higherIsBetter?: boolean;
}

const FIXED_ROWS: CompareRow[] = [
  {
    key: "status",
    label: "Status",
    getDisplay: (house) => house.status,
  },
  {
    key: "beds",
    label: "Beds",
    getDisplay: (house) => (house.beds != null ? String(house.beds) : "—"),
    getNumeric: (house) => house.beds ?? null,
    higherIsBetter: true,
  },
  {
    key: "baths",
    label: "Baths",
    getDisplay: (house) => (house.baths != null ? String(house.baths) : "—"),
    getNumeric: (house) => house.baths ?? null,
    higherIsBetter: true,
  },
  {
    key: "sqft",
    label: "Sq ft",
    getDisplay: (house) => (house.sqft != null ? house.sqft.toLocaleString() : "—"),
    getNumeric: (house) => house.sqft ?? null,
    higherIsBetter: true,
  },
  {
    key: "listPrice",
    label: "List price",
    getDisplay: (house) => formatCurrency(house.listPrice),
    getNumeric: (house) => house.listPrice ?? null,
    higherIsBetter: false,
  },
  {
    key: "offerPrice",
    label: "Offer price",
    getDisplay: (house) => formatCurrency(house.offerPrice),
    getNumeric: (house) => house.offerPrice ?? null,
    higherIsBetter: false,
  },
  {
    key: "rating",
    label: "Rating",
    getDisplay: (house) => (house.rating != null ? `${house.rating} / 5` : "—"),
    getNumeric: (house) => house.rating ?? null,
    higherIsBetter: true,
  },
  {
    key: "visitDate",
    label: "Visit date",
    getDisplay: (house) => formatDate(house.visitDate),
  },
  {
    key: "notes",
    label: "Notes",
    getDisplay: (house) => house.notes?.trim() || "—",
  },
];

function getBestHouseIds(
  houses: SavedHouse[],
  getNumeric: (house: SavedHouse) => number | null,
  higherIsBetter: boolean
): Set<string> {
  const numericValues = houses
    .map((house) => ({ id: house.id, value: getNumeric(house) }))
    .filter((item): item is { id: string; value: number } => item.value != null);

  if (numericValues.length < 2) return new Set();

  const target = higherIsBetter
    ? Math.max(...numericValues.map((item) => item.value))
    : Math.min(...numericValues.map((item) => item.value));

  return new Set(
    numericValues.filter((item) => item.value === target).map((item) => item.id)
  );
}

function getBestCriterionHouseIds(
  houses: SavedHouse[],
  criterion: ComparisonCriterion,
  valuesByHouseId: Record<string, CriterionValuesMap>
): Set<string> {
  const numericValues = houses
    .map((house) => ({
      id: house.id,
      value: getNumericCriterionValue(
        criterion,
        getCriterionValueFromMap(valuesByHouseId[house.id], criterion.id)
      ),
    }))
    .filter((item): item is { id: string; value: number } => item.value != null);

  if (numericValues.length < 2) return new Set();

  const target = Math.max(...numericValues.map((item) => item.value));
  return new Set(
    numericValues.filter((item) => item.value === target).map((item) => item.id)
  );
}

interface HouseCompareViewProps {
  houseIds: string[];
}

export function HouseCompareView({ houseIds }: HouseCompareViewProps) {
  const { user, loading: authLoading } = useAuth();
  useHouseTracker();

  const houses = useHouseTrackerStore((s) => s.houses);
  const housesLoading = useHouseTrackerStore((s) => s.loading);

  const { criteria, loadCriteria, saveHouseValues } = useComparisonCriteria();
  const [valuesByHouseId, setValuesByHouseId] = useState<
    Record<string, CriterionValuesMap>
  >({});
  const [criteriaLoading, setCriteriaLoading] = useState(false);
  const [savingHouseId, setSavingHouseId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const compareHouses = useMemo(
    () =>
      houseIds
        .map((id) => houses.find((house) => house.id === id))
        .filter((house): house is SavedHouse => house != null),
    [houseIds, houses]
  );

  const loadCompareData = useCallback(async () => {
    if (!user || compareHouses.length === 0) return;

    setCriteriaLoading(true);
    setError(null);

    try {
      const data = await loadCriteria(compareHouses.map((house) => house.id));
      setValuesByHouseId(data.valuesByHouseId ?? {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load comparison data");
    } finally {
      setCriteriaLoading(false);
    }
  }, [user, compareHouses, loadCriteria]);

  useEffect(() => {
    void loadCompareData();
  }, [loadCompareData]);

  const handleCriterionChange = async (
    houseId: string,
    nextValue: Parameters<typeof mergeCriterionValue>[1]
  ) => {
    const previous = valuesByHouseId[houseId] ?? {};
    const nextMap = mergeCriterionValue(previous, nextValue);

    setValuesByHouseId((current) => ({
      ...current,
      [houseId]: nextMap,
    }));

    setSavingHouseId(houseId);
    setError(null);

    try {
      await saveHouseValues(houseId, valuesMapToArray(nextMap));
    } catch (err) {
      setValuesByHouseId((current) => ({
        ...current,
        [houseId]: previous,
      }));
      setError(err instanceof Error ? err.message : "Failed to save value");
    } finally {
      setSavingHouseId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="flex h-screen flex-col bg-white">
        <TopNav />
        <div className="flex flex-1 items-center justify-center text-sm text-gray-500">
          Loading…
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen flex-col bg-white">
        <TopNav />
        <SignInPrompt />
      </div>
    );
  }

  const invalidSelection = houseIds.length < 2 || houseIds.length > 4;
  const missingHouses = compareHouses.length !== houseIds.length;

  return (
    <div className="flex h-screen flex-col bg-white">
      <TopNav />

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto max-w-6xl px-4 py-6">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <Link
                href="/my-house-search"
                className="text-sm font-medium text-teal-600 hover:text-teal-700"
              >
                ← Back to My House Search
              </Link>
              <h1 className="mt-2 text-xl font-semibold text-gray-900">
                Compare homes
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Side-by-side comparison of {compareHouses.length} home
                {compareHouses.length === 1 ? "" : "s"}
              </p>
            </div>
          </div>

          {(invalidSelection || missingHouses) && (
            <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {invalidSelection
                ? "Select 2 to 4 homes from My House Search to compare."
                : "Some selected homes could not be found. They may have been deleted."}
            </div>
          )}

          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {compareHouses.length >= 2 && (
            <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
              <table className="min-w-full divide-y divide-gray-200 text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Field
                    </th>
                    {compareHouses.map((house) => (
                      <th
                        key={house.id}
                        className="min-w-[180px] px-4 py-3 text-left text-xs font-semibold text-gray-900"
                      >
                        <p className="line-clamp-2">{house.address}</p>
                        {house.neighbourhood && (
                          <p className="mt-1 text-[11px] font-normal text-gray-500">
                            {house.neighbourhood}
                          </p>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {FIXED_ROWS.map((row) => {
                    const bestIds =
                      row.getNumeric && row.higherIsBetter != null
                        ? getBestHouseIds(
                            compareHouses,
                            row.getNumeric,
                            row.higherIsBetter
                          )
                        : new Set<string>();

                    return (
                      <tr key={row.key}>
                        <td className="sticky left-0 z-10 bg-white px-4 py-3 text-xs font-medium text-gray-600">
                          {row.label}
                        </td>
                        {compareHouses.map((house) => {
                          const highlight = bestIds.has(house.id);
                          const display = row.getDisplay(house);

                          return (
                            <td
                              key={house.id}
                              className={`px-4 py-3 align-top text-gray-900 ${
                                highlight ? "bg-teal-50 font-medium text-teal-900" : ""
                              }`}
                            >
                              {row.key === "status" ? (
                                <StatusBadge status={house.status} />
                              ) : row.key === "notes" ? (
                                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                                  {display}
                                </p>
                              ) : (
                                display
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}

                  {criteria.length > 0 && (
                    <tr>
                      <td
                        colSpan={compareHouses.length + 1}
                        className="bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500"
                      >
                        Custom criteria
                      </td>
                    </tr>
                  )}

                  {criteria.map((criterion) => {
                    const bestIds = getBestCriterionHouseIds(
                      compareHouses,
                      criterion,
                      valuesByHouseId
                    );

                    return (
                      <tr key={criterion.id}>
                        <td className="sticky left-0 z-10 bg-white px-4 py-3 text-xs font-medium text-gray-600">
                          {criterion.label}
                        </td>
                        {compareHouses.map((house) => {
                          const houseValues = valuesByHouseId[house.id];
                          const value = getCriterionValueFromMap(
                            houseValues,
                            criterion.id
                          );
                          const highlight = bestIds.has(house.id);
                          const saving = savingHouseId === house.id;

                          return (
                            <td
                              key={house.id}
                              className={`px-4 py-3 align-top ${
                                highlight ? "bg-teal-50" : ""
                              }`}
                            >
                              <CriterionValueInput
                                criterion={criterion}
                                value={value}
                                onChange={(next) =>
                                  void handleCriterionChange(house.id, next)
                                }
                                compact
                              />
                              {saving && (
                                <p className="mt-1 text-[11px] text-gray-400">Saving…</p>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {(housesLoading || criteriaLoading) && compareHouses.length >= 2 && (
            <p className="mt-4 text-sm text-gray-500">Loading comparison data…</p>
          )}

          <div className="mt-8 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <CustomCriteriaEditor />
          </div>
        </div>
      </div>
    </div>
  );
}
