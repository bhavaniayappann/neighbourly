"use client";

import { useCallback, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { buildShareUrl } from "@/hooks/useUrlSync";

export function TopNav() {
  const selectedNeighbourhoodId = useAppStore((s) => s.selectedNeighbourhoodId);
  const selectedGeoid = useAppStore((s) => s.selectedGeoid);
  const selectedName = useAppStore((s) => s.selectedName);
  const selectedCity = useAppStore((s) => s.selectedCity);
  const selectedCounty = useAppStore((s) => s.selectedCounty);
  const [copied, setCopied] = useState(false);

  const locationLabel =
    selectedCity && selectedName.toLowerCase() !== selectedCity.toLowerCase()
      ? `${selectedName}, ${selectedCity}`
      : selectedCity
        ? selectedCity
        : `${selectedName}, ${selectedCounty} County`;

  const handleShare = useCallback(async () => {
    const url = buildShareUrl(selectedNeighbourhoodId, selectedGeoid, selectedName);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }, [selectedNeighbourhoodId, selectedGeoid, selectedName]);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-teal-600">
            <svg
              className="h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <span className="text-lg font-semibold text-gray-900">Neighbourly</span>
        </div>
        <span className="hidden text-gray-300 sm:inline">|</span>
        <span className="truncate text-sm text-gray-600">{locationLabel}</span>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={handleShare}
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          {copied ? "Copied!" : "Share"}
        </button>
        <button
          type="button"
          disabled
          title="Coming in V2"
          className="hidden cursor-not-allowed rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-400 sm:inline-block"
        >
          Compare
        </button>
      </div>
    </header>
  );
}
