"use client";

import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { MOCK_NEIGHBOURHOODS } from "@/lib/mock-data";

const neighbourhoods = Object.values(MOCK_NEIGHBOURHOODS);

export function SearchBar() {
  const [query, setQuery] = useState("");
  const setSelectedNeighbourhood = useAppStore((s) => s.setSelectedNeighbourhood);

  const filtered =
    query.length > 0
      ? neighbourhoods.filter((n) =>
          n.name.toLowerCase().includes(query.toLowerCase())
        )
      : [];

  const handleSelect = (geoid: string, name: string) => {
    setSelectedNeighbourhood(geoid, name);
    setQuery("");
  };

  return (
    <div className="relative">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search neighbourhoods..."
          className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      {filtered.length > 0 && (
        <ul className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          {filtered.map((n) => (
            <li key={n.geoid}>
              <button
                type="button"
                onClick={() => handleSelect(n.geoid, n.name)}
                className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-teal-50 hover:text-teal-700"
              >
                {n.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
