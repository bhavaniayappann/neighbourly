"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AddHouseForm } from "@/components/house-search/AddHouseForm";
import { useHouseTrackerStore } from "@/store/useHouseTrackerStore";
import type { HouseVisitStatus } from "@/types";

const STATUS_FILTERS = [
  { value: "all", label: "All" },
  { value: "planned", label: "Planned" },
  { value: "visited", label: "Visited" },
] as const;

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

interface HouseListPanelProps {
  className?: string;
}

export function HouseListPanel({ className = "" }: HouseListPanelProps) {
  const houses = useHouseTrackerStore((s) => s.houses);
  const selectedHouseId = useHouseTrackerStore((s) => s.selectedHouseId);
  const statusFilter = useHouseTrackerStore((s) => s.statusFilter);
  const loading = useHouseTrackerStore((s) => s.loading);
  const error = useHouseTrackerStore((s) => s.error);
  const selectHouse = useHouseTrackerStore((s) => s.selectHouse);
  const setStatusFilter = useHouseTrackerStore((s) => s.setStatusFilter);
  const compareIds = useHouseTrackerStore((s) => s.compareIds);
  const toggleCompareId = useHouseTrackerStore((s) => s.toggleCompareId);
  const clearCompareIds = useHouseTrackerStore((s) => s.clearCompareIds);

  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);

  const filteredHouses = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return houses.filter((house) => {
      if (statusFilter !== "all" && house.status !== statusFilter) {
        return false;
      }
      if (!normalizedQuery) return true;

      return (
        house.address.toLowerCase().includes(normalizedQuery) ||
        house.neighbourhood?.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [houses, statusFilter, query]);

  return (
    <aside
      className={`flex w-[260px] shrink-0 flex-col border-r border-gray-200 bg-white ${className}`}
    >
      <div className="border-b border-gray-100 px-4 py-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Saved homes</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              {houses.length === 0
                ? "No houses yet"
                : `${houses.length} house${houses.length === 1 ? "" : "s"}`}
            </p>
          </div>
          {!adding && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="shrink-0 rounded-lg bg-teal-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
            >
              Add
            </button>
          )}
        </div>
      </div>

      {adding && <AddHouseForm onClose={() => setAdding(false)} />}

      <div className="space-y-3 border-b border-gray-100 px-4 py-3">
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search addresses…"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none ring-teal-600 focus:ring-2"
        />

        <div className="flex gap-1">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              onClick={() => setStatusFilter(filter.value)}
              className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                statusFilter === filter.value
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {loading && (
          <p className="px-4 py-6 text-center text-sm text-gray-500">
            Loading houses…
          </p>
        )}

        {error && (
          <p className="px-4 py-6 text-center text-sm text-red-600">{error}</p>
        )}

        {!loading && !error && filteredHouses.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-gray-500">
            {houses.length === 0
              ? "Your saved homes will appear here."
              : "No houses match your filters."}
          </p>
        )}

        <ul className="divide-y divide-gray-100">
          {filteredHouses.map((house) => {
            const selected = house.id === selectedHouseId;
            const comparing = compareIds.includes(house.id);
            return (
              <li key={house.id}>
                <div
                  className={`flex items-start gap-2 px-4 py-3 transition-colors ${
                    selected ? "bg-teal-50" : "hover:bg-gray-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={comparing}
                    onChange={() => toggleCompareId(house.id)}
                    disabled={!comparing && compareIds.length >= 4}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-600"
                    aria-label={`Compare ${house.address}`}
                  />
                  <button
                    type="button"
                    onClick={() => selectHouse(house.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-gray-900">
                        {house.address}
                      </p>
                      <StatusBadge status={house.status} />
                    </div>
                    {house.neighbourhood && (
                      <p className="mt-1 text-xs text-gray-500">
                        {house.neighbourhood}
                      </p>
                    )}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

      {compareIds.length > 0 && (
        <div className="border-t border-gray-100 px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-gray-500">
              {compareIds.length} selected
              {compareIds.length < 2 ? " (need 2+)" : ""}
            </p>
            <button
              type="button"
              onClick={() => clearCompareIds()}
              className="text-xs text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          </div>
          {compareIds.length >= 2 && (
            <Link
              href={`/my-house-search/compare?ids=${encodeURIComponent(compareIds.join(","))}`}
              className="mt-2 block rounded-lg bg-gray-900 px-3 py-2 text-center text-sm font-medium text-white hover:bg-gray-800"
            >
              Compare {compareIds.length} homes
            </Link>
          )}
        </div>
      )}
    </aside>
  );
}
