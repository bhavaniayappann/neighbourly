"use client";

import { useState } from "react";
import {
  AddressAutocomplete,
  type AddressSuggestion,
} from "@/components/house-search/AddressAutocomplete";
import { SelectField } from "@/components/ui/SelectField";
import { loadTractGeometries, resolveTractAtPoint } from "@/lib/geocode";
import { resolveAreaSelection } from "@/lib/neighbourhood-client";
import { useHouseTracker } from "@/hooks/useHouseTracker";
import { useHouseTrackerStore } from "@/store/useHouseTrackerStore";
import type { HouseVisitStatus } from "@/types";

interface ResolvedLocation {
  address: string;
  lat: number;
  lng: number;
  geoid?: string;
  neighbourhood?: string;
  neighbourhoodId?: string | null;
}

interface AddHouseFormProps {
  onClose: () => void;
}

const inputClassName =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none ring-teal-600 focus:ring-2";

const STATUS_OPTIONS = [
  { value: "planned", label: "Planned" },
  { value: "visited", label: "Visited" },
] as const;

const RATING_OPTIONS = [
  { value: "", label: "No rating" },
  ...[1, 2, 3, 4, 5].map((value) => ({
    value: String(value),
    label: `${value} / 5`,
  })),
];

async function resolveLocation(
  suggestion: AddressSuggestion
): Promise<ResolvedLocation> {
  await loadTractGeometries();
  const tract = resolveTractAtPoint(suggestion.lng, suggestion.lat);

  let geoid: string | undefined;
  let neighbourhood: string | undefined;
  let neighbourhoodId: string | null | undefined;

  if (tract) {
    geoid = tract.geoid;
    const area = await resolveAreaSelection(tract.geoid);
    neighbourhood = area.displayName;
    neighbourhoodId = area.neighbourhoodId;
  }

  return {
    address: suggestion.label,
    lat: suggestion.lat,
    lng: suggestion.lng,
    geoid,
    neighbourhood,
    neighbourhoodId,
  };
}

export function AddHouseForm({ onClose }: AddHouseFormProps) {
  const { createHouse } = useHouseTracker();
  const selectHouse = useHouseTrackerStore((s) => s.selectHouse);

  const [step, setStep] = useState<"address" | "details">("address");
  const [addressInput, setAddressInput] = useState("");
  const [resolved, setResolved] = useState<ResolvedLocation | null>(null);
  const [status, setStatus] = useState<HouseVisitStatus>("planned");
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");
  const [sqft, setSqft] = useState("");
  const [listPrice, setListPrice] = useState("");
  const [offerPrice, setOfferPrice] = useState("");
  const [rating, setRating] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddressSelect = async (suggestion: AddressSuggestion) => {
    setLoading(true);
    setError(null);

    try {
      const result = await resolveLocation(suggestion);
      setResolved(result);
      setStep("details");
    } catch {
      setError("Failed to resolve address");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!resolved) return;

    setLoading(true);
    setError(null);

    try {
      const house = await createHouse({
        address: resolved.address,
        lat: resolved.lat,
        lng: resolved.lng,
        status,
        ...(resolved.geoid ? { geoid: resolved.geoid } : {}),
        ...(resolved.neighbourhood ? { neighbourhood: resolved.neighbourhood } : {}),
        ...(resolved.neighbourhoodId !== undefined
          ? { neighbourhoodId: resolved.neighbourhoodId }
          : {}),
        ...(beds ? { beds: Number(beds) } : {}),
        ...(baths ? { baths: Number(baths) } : {}),
        ...(sqft ? { sqft: Number(sqft) } : {}),
        ...(listPrice ? { listPrice: Number(listPrice) } : {}),
        ...(offerPrice ? { offerPrice: Number(offerPrice) } : {}),
        ...(rating ? { rating: Number(rating) } : {}),
        ...(visitDate ? { visitDate } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      selectHouse(house.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save house");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Add house</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
      </div>

      {step === "address" ? (
        <div className="space-y-3">
          <div>
            <label htmlFor="house-address" className="mb-1 block text-xs text-gray-600">
              Street address
            </label>
            <AddressAutocomplete
              value={addressInput}
              onChange={setAddressInput}
              onSelect={(suggestion) => void handleAddressSelect(suggestion)}
              disabled={loading}
            />
            <p className="mt-1 text-[11px] text-gray-500">
              Suggestions appear as you type. Pick one to continue.
            </p>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          {loading && (
            <p className="text-xs text-gray-500">Resolving neighbourhood…</p>
          )}
        </div>
      ) : (
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-3">
          <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
            <p className="text-sm font-medium text-gray-900">{resolved?.address}</p>
            {resolved?.neighbourhood && (
              <p className="mt-0.5 text-xs text-gray-500">{resolved.neighbourhood}</p>
            )}
            <button
              type="button"
              onClick={() => {
                setStep("address");
                setResolved(null);
                setError(null);
              }}
              className="mt-1 text-xs text-teal-600 hover:text-teal-700"
            >
              Change address
            </button>
          </div>

          <div>
            <label htmlFor="house-status" className="mb-1 block text-xs text-gray-600">
              Status
            </label>
            <SelectField
              id="house-status"
              value={status}
              onChange={(value) => setStatus(value as HouseVisitStatus)}
              options={[...STATUS_OPTIONS]}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="house-beds" className="mb-1 block text-xs text-gray-600">
                Beds
              </label>
              <input
                id="house-beds"
                type="number"
                min={0}
                value={beds}
                onChange={(event) => setBeds(event.target.value)}
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor="house-baths" className="mb-1 block text-xs text-gray-600">
                Baths
              </label>
              <input
                id="house-baths"
                type="number"
                min={0}
                step={0.5}
                value={baths}
                onChange={(event) => setBaths(event.target.value)}
                className={inputClassName}
              />
            </div>
          </div>

          <div>
            <label htmlFor="house-sqft" className="mb-1 block text-xs text-gray-600">
              Sq ft
            </label>
            <input
              id="house-sqft"
              type="number"
              min={0}
              value={sqft}
              onChange={(event) => setSqft(event.target.value)}
              className={inputClassName}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="house-list-price" className="mb-1 block text-xs text-gray-600">
                List price
              </label>
              <input
                id="house-list-price"
                type="number"
                min={0}
                value={listPrice}
                onChange={(event) => setListPrice(event.target.value)}
                placeholder="USD"
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor="house-offer-price" className="mb-1 block text-xs text-gray-600">
                Offer price
              </label>
              <input
                id="house-offer-price"
                type="number"
                min={0}
                value={offerPrice}
                onChange={(event) => setOfferPrice(event.target.value)}
                placeholder="USD"
                className={inputClassName}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="house-rating" className="mb-1 block text-xs text-gray-600">
                Rating
              </label>
              <SelectField
                id="house-rating"
                value={rating}
                onChange={setRating}
                options={RATING_OPTIONS}
                placeholder="No rating"
              />
            </div>
            <div>
              <label htmlFor="house-visit-date" className="mb-1 block text-xs text-gray-600">
                Visit date
              </label>
              <input
                id="house-visit-date"
                type="date"
                value={visitDate}
                onChange={(event) => setVisitDate(event.target.value)}
                className={inputClassName}
              />
            </div>
          </div>

          <div>
            <label htmlFor="house-notes" className="mb-1 block text-xs text-gray-600">
              Notes
            </label>
            <textarea
              id="house-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              className={`${inputClassName} resize-none`}
              placeholder="First impressions, pros/cons…"
            />
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
          >
            {loading ? "Saving…" : "Save house"}
          </button>
        </form>
      )}
    </div>
  );
}
