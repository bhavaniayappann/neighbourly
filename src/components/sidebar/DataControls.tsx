"use client";

import { SUPPORTED_ACS_YEARS } from "@/lib/census";
import { useAppStore } from "@/store/useAppStore";
import type { Granularity } from "@/store/useAppStore";

export function DataControls() {
  const acsYear = useAppStore((s) => s.acsYear);
  const setAcsYear = useAppStore((s) => s.setAcsYear);
  const granularity = useAppStore((s) => s.granularity);
  const setGranularity = useAppStore((s) => s.setGranularity);

  return (
    <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-2">
      <label className="flex flex-1 items-center gap-1.5">
        <span className="shrink-0 text-[10px] font-medium uppercase tracking-wide text-gray-500">
          ACS
        </span>
        <select
          value={acsYear}
          onChange={(e) =>
            setAcsYear(e.target.value as (typeof SUPPORTED_ACS_YEARS)[number])
          }
          className="w-full rounded-md border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-800 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          aria-label="ACS data year"
        >
          {SUPPORTED_ACS_YEARS.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </label>

      <div
        className="flex shrink-0 rounded-md border border-gray-200 bg-gray-50 p-0.5"
        role="group"
        aria-label="Geography granularity"
      >
        {(["tract", "zip"] as Granularity[]).map((value) => {
          const active = granularity === value;
          const disabled = value === "zip";
          const label = value === "tract" ? "Area" : "ZIP";
          return (
            <button
              key={value}
              type="button"
              disabled={disabled}
              title={disabled ? "ZIP boundaries coming post-MVP" : undefined}
              onClick={() => setGranularity(value)}
              className={`rounded px-2 py-1 text-[10px] font-medium uppercase tracking-wide transition-colors ${
                disabled
                  ? "cursor-not-allowed text-gray-300"
                  : active
                    ? "bg-white text-teal-700 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
