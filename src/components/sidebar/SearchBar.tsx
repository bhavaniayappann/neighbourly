"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { geocodeQuery, searchGeocodeSuggestions } from "@/lib/geocode";
import {
  fetchNeighbourhoodProfile,
  resolveAreaSelection,
  searchNeighbourhoodsApi,
} from "@/lib/neighbourhood-client";

type Suggestion =
  | {
      kind: "neighbourhood";
      id: string;
      displayName: string;
      city: string;
      county: string;
      bbox: [number, number, number, number];
    }
  | {
      kind: "tract";
      geoid: string;
      name: string;
      city: string;
      county: string;
      bounds: [number, number, number, number];
      centroid?: [number, number];
    };

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const flyToArea = useAppStore((s) => s.flyToArea);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runSearch = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      return;
    }

    const neighbourhoodHits = await searchNeighbourhoodsApi(trimmed);
    const tractHits =
      neighbourhoodHits.length === 0
        ? await searchGeocodeSuggestions(trimmed)
        : [];

    const nhSuggestions: Suggestion[] = neighbourhoodHits.map((hit) => ({
      kind: "neighbourhood",
      id: hit.id,
      displayName: hit.displayName,
      city: hit.city,
      county: hit.county,
      bbox: hit.bbox as [number, number, number, number],
    }));

    const tractSuggestions: Suggestion[] = tractHits.slice(0, 6).map((hit) => ({
      kind: "tract",
      geoid: hit.geoid,
      name: hit.name,
      city: hit.city,
      county: hit.county,
      bounds: hit.bounds as [number, number, number, number],
      centroid: hit.centroid,
    }));

    setSuggestions([...nhSuggestions, ...tractSuggestions]);
    setHighlight(0);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runSearch(query);
    }, 180);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, runSearch]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function pickSuggestion(suggestion: Suggestion) {
    setOpen(false);
    setQuery(
      suggestion.kind === "neighbourhood"
        ? suggestion.displayName
        : suggestion.name
    );

    if (suggestion.kind === "neighbourhood") {
      const profile = await fetchNeighbourhoodProfile(suggestion.id);
      const primaryGeoid =
        profile?.primaryGeoid ?? useAppStore.getState().selectedGeoid;

      flyToArea(
        {
          neighbourhoodId: suggestion.id,
          geoid: primaryGeoid,
          displayName: suggestion.displayName,
          city: suggestion.city,
          county: suggestion.county,
        },
        suggestion.bbox
      );
      return;
    }

    const selection = await resolveAreaSelection(suggestion.geoid);
    flyToArea(selection, suggestion.bounds, suggestion.centroid);
  }

  async function submitSearch() {
    const trimmed = query.trim();
    if (!trimmed) return;

    if (suggestions.length > 0) {
      await pickSuggestion(suggestions[highlight] ?? suggestions[0]!);
      return;
    }

    const geocoded = await geocodeQuery(trimmed);
    if (geocoded) {
      const { entry } = geocoded;
      const selection = await resolveAreaSelection(entry.geoid);
      flyToArea(selection, entry.bounds, entry.centroid);
      setOpen(false);
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, Math.max(0, suggestions.length - 1)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      void submitSearch();
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor="area-search" className="sr-only">
        Search Bay Area neighbourhoods
      </label>
      <div className="flex gap-2">
        <input
          id="area-search"
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Search neighbourhoods…"
          autoComplete="off"
          className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
        <button
          type="button"
          onClick={() => void submitSearch()}
          className="shrink-0 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700"
        >
          Go
        </button>
      </div>

      {open && query.trim().length >= 2 && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        >
          {suggestions.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-500">
              No area found in the Bay Area. Try a neighbourhood or city name.
            </li>
          ) : (
            suggestions.map((s, i) => (
              <li key={s.kind === "neighbourhood" ? s.id : s.geoid}>
                <button
                  type="button"
                  role="option"
                  aria-selected={i === highlight}
                  className={`block w-full px-3 py-2 text-left text-sm ${
                    i === highlight ? "bg-teal-50 text-teal-900" : "text-gray-800"
                  }`}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => void pickSuggestion(s)}
                >
                  <span className="font-medium">
                    {s.kind === "neighbourhood" ? s.displayName : s.name}
                  </span>
                  <span className="text-gray-500">
                    {" · "}
                    {s.city}
                    {s.county ? ` · ${s.county}` : ""}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
