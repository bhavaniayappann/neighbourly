"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface AddressSuggestion {
  id: string;
  label: string;
  lat: number;
  lng: number;
}

interface AddressAutocompleteProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  onSelect: (suggestion: AddressSuggestion) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const inputClassName =
  "w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 outline-none transition-colors focus:border-teal-500 focus:ring-2 focus:ring-teal-600";

export function AddressAutocomplete({
  id = "house-address",
  value,
  onChange,
  onSelect,
  placeholder = "Start typing an address…",
  disabled = false,
  className = "",
}: AddressAutocompleteProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [loading, setLoading] = useState(false);

  const runSearch = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(
        `/api/geocode/suggest?q=${encodeURIComponent(trimmed)}`
      );
      if (!res.ok) {
        setSuggestions([]);
        return;
      }

      const data = (await res.json()) as { suggestions: AddressSuggestion[] };
      setSuggestions(data.suggestions ?? []);
      setHighlight(0);
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      void runSearch(value);
    }, 220);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value, runSearch]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function pickSuggestion(suggestion: AddressSuggestion) {
    onChange(suggestion.label);
    setOpen(false);
    onSelect(suggestion);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (event.key === "ArrowDown" || event.key === "Enter")) {
      setOpen(true);
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlight((current) =>
        Math.min(current + 1, Math.max(0, suggestions.length - 1))
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlight((current) => Math.max(current - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const suggestion = suggestions[highlight];
      if (suggestion) {
        pickSuggestion(suggestion);
      }
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  const showDropdown = open && value.trim().length >= 3;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        id={id}
        type="search"
        value={value}
        disabled={disabled}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        className={inputClassName}
      />

      {showDropdown && (
        <ul
          role="listbox"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-auto rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
        >
          {loading ? (
            <li className="px-3 py-2 text-sm text-gray-500">Searching addresses…</li>
          ) : suggestions.length === 0 ? (
            <li className="px-3 py-2 text-sm text-gray-500">
              No Bay Area addresses found. Keep typing a street address.
            </li>
          ) : (
            suggestions.map((suggestion, index) => (
              <li key={suggestion.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={index === highlight}
                  onMouseEnter={() => setHighlight(index)}
                  onClick={() => pickSuggestion(suggestion)}
                  className={`block w-full px-3 py-2 text-left text-sm ${
                    index === highlight
                      ? "bg-teal-50 text-teal-900"
                      : "text-gray-800"
                  }`}
                >
                  <span className="line-clamp-2">{suggestion.label}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
