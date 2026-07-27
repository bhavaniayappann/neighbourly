"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AccordionSection } from "@/components/sidebar/AccordionSection";
import { DemographicsSection } from "@/components/sidebar/sections/DemographicsSection";
import { SchoolsSection } from "@/components/sidebar/sections/SchoolsSection";
import {
  CriterionValueInput,
  getCriterionValueFromMap,
  mergeCriterionValue,
  valuesMapToArray,
} from "@/components/house-search/CriterionValueInput";
import { CustomCriteriaEditor } from "@/components/house-search/CustomCriteriaEditor";
import { SelectField } from "@/components/ui/SelectField";
import { useCensusData } from "@/hooks/useCensusData";
import { useComparisonCriteria } from "@/hooks/useComparisonCriteria";
import { useHouseTracker } from "@/hooks/useHouseTracker";
import { useSchoolsData } from "@/hooks/useSchoolsData";
import { DEFAULT_ACS_YEAR } from "@/lib/census";
import { getNeighbourhoodData } from "@/lib/mock-data";
import { useHouseTrackerStore } from "@/store/useHouseTrackerStore";
import type { HouseCriterionValue, HouseVisitStatus, SavedHouse } from "@/types";

const inputClassName =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none ring-teal-600 focus:ring-2";

const STATUS_OPTIONS = [
  { value: "planned", label: "Planned" },
  { value: "visited", label: "Visited" },
];

const RATING_OPTIONS = [
  { value: "", label: "No rating" },
  ...[1, 2, 3, 4, 5].map((value) => ({
    value: String(value),
    label: `${value} / 5`,
  })),
];

interface HouseDetailPanelProps {
  className?: string;
}

interface HouseDraft {
  status: HouseVisitStatus;
  beds: string;
  baths: string;
  sqft: string;
  listPrice: string;
  offerPrice: string;
  rating: string;
  visitDate: string;
  notes: string;
}

function houseToDraft(house: SavedHouse): HouseDraft {
  return {
    status: house.status,
    beds: house.beds != null ? String(house.beds) : "",
    baths: house.baths != null ? String(house.baths) : "",
    sqft: house.sqft != null ? String(house.sqft) : "",
    listPrice: house.listPrice != null ? String(house.listPrice) : "",
    offerPrice: house.offerPrice != null ? String(house.offerPrice) : "",
    rating: house.rating != null ? String(house.rating) : "",
    visitDate: house.visitDate ?? "",
    notes: house.notes ?? "",
  };
}

function LoadingStats() {
  return (
    <div className="animate-pulse space-y-2 py-1">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex justify-between">
          <div className="h-3 w-20 rounded bg-gray-100" />
          <div className="h-3 w-12 rounded bg-gray-100" />
        </div>
      ))}
    </div>
  );
}

export function HouseDetailPanel({ className = "" }: HouseDetailPanelProps) {
  const houses = useHouseTrackerStore((s) => s.houses);
  const selectedHouseId = useHouseTrackerStore((s) => s.selectedHouseId);
  const { updateHouse, deleteHouse } = useHouseTracker();

  const house = houses.find((item) => item.id === selectedHouseId) ?? null;

  const [draft, setDraft] = useState<HouseDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [criterionValues, setCriterionValues] = useState<
    Record<string, HouseCriterionValue>
  >({});
  const [criteriaValuesLoading, setCriteriaValuesLoading] = useState(false);
  const [savingCriteria, setSavingCriteria] = useState(false);

  const { criteria, loadHouseValues, saveHouseValues } = useComparisonCriteria();

  useEffect(() => {
    if (!house) {
      setDraft(null);
      setError(null);
      setCriterionValues({});
      return;
    }
    setDraft(houseToDraft(house));
    setError(null);

    let cancelled = false;
    setCriteriaValuesLoading(true);

    void loadHouseValues(house.id)
      .then((values) => {
        if (cancelled) return;
        const map: Record<string, HouseCriterionValue> = {};
        for (const value of values) {
          map[value.criterionId] = value;
        }
        setCriterionValues(map);
      })
      .catch(() => {
        if (!cancelled) setCriterionValues({});
      })
      .finally(() => {
        if (!cancelled) setCriteriaValuesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [house, loadHouseValues]);

  const { data: census, loading: censusLoading } = useCensusData(
    house?.geoid ?? null,
    DEFAULT_ACS_YEAR
  );
  const { data: schools, loading: schoolsLoading } = useSchoolsData(
    house?.geoid ?? "",
    house?.neighbourhoodId ?? null
  );

  const mockData = getNeighbourhoodData(house?.geoid ?? "generic");
  const demographics = useMemo(() => {
    if (!census) return mockData.demographics;
    return {
      ...mockData.demographics,
      population: census.population,
      medianIncome: census.medianIncome,
      bachelorsPlus: census.bachelorsPlus,
    };
  }, [census, mockData.demographics]);

  const handleSave = async () => {
    if (!house || !draft) return;

    setSaving(true);
    setError(null);

    try {
      await updateHouse(house.id, {
        status: draft.status,
        beds: draft.beds ? Number(draft.beds) : undefined,
        baths: draft.baths ? Number(draft.baths) : undefined,
        sqft: draft.sqft ? Number(draft.sqft) : undefined,
        listPrice: draft.listPrice ? Number(draft.listPrice) : undefined,
        offerPrice: draft.offerPrice ? Number(draft.offerPrice) : undefined,
        rating: draft.rating ? Number(draft.rating) : undefined,
        visitDate: draft.visitDate || undefined,
        notes: draft.notes.trim() || undefined,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!house) return;
    if (!window.confirm(`Delete ${house.address}?`)) return;

    setDeleting(true);
    setError(null);

    try {
      await deleteHouse(house.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete house");
    } finally {
      setDeleting(false);
    }
  };

  const handleCriterionChange = (nextValue: HouseCriterionValue) => {
    setCriterionValues((current) => mergeCriterionValue(current, nextValue));
  };

  const handleSaveCriteria = async () => {
    if (!house) return;

    setSavingCriteria(true);
    setError(null);

    try {
      const saved = await saveHouseValues(house.id, valuesMapToArray(criterionValues));
      const map: Record<string, HouseCriterionValue> = {};
      for (const value of saved) {
        map[value.criterionId] = value;
      }
      setCriterionValues(map);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save criteria");
    } finally {
      setSavingCriteria(false);
    }
  };

  if (!house || !draft) {
    return (
      <aside
        className={`flex w-[300px] shrink-0 flex-col border-l border-gray-200 bg-white ${className}`}
      >
        <div className="flex flex-1 items-center justify-center px-6 text-center">
          <div>
            <p className="text-sm font-medium text-gray-900">No house selected</p>
            <p className="mt-1 text-xs text-gray-500">
              Choose a home from the list or map to view details.
            </p>
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className={`flex w-[300px] shrink-0 flex-col border-l border-gray-200 bg-white ${className}`}
    >
      <div className="border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">House details</h2>
        <p className="mt-1 text-sm text-gray-700">{house.address}</p>
        {house.neighbourhood && (
          <p className="mt-0.5 text-xs text-gray-500">{house.neighbourhood}</p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="space-y-3 px-4 py-4">
          <div>
            <label htmlFor="detail-status" className="mb-1 block text-xs text-gray-600">
              Status
            </label>
            <SelectField
              id="detail-status"
              value={draft.status}
              onChange={(value) =>
                setDraft({ ...draft, status: value as HouseVisitStatus })
              }
              options={STATUS_OPTIONS}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="detail-beds" className="mb-1 block text-xs text-gray-600">
                Beds
              </label>
              <input
                id="detail-beds"
                type="number"
                min={0}
                value={draft.beds}
                onChange={(event) => setDraft({ ...draft, beds: event.target.value })}
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor="detail-baths" className="mb-1 block text-xs text-gray-600">
                Baths
              </label>
              <input
                id="detail-baths"
                type="number"
                min={0}
                step={0.5}
                value={draft.baths}
                onChange={(event) => setDraft({ ...draft, baths: event.target.value })}
                className={inputClassName}
              />
            </div>
          </div>

          <div>
            <label htmlFor="detail-sqft" className="mb-1 block text-xs text-gray-600">
              Sq ft
            </label>
            <input
              id="detail-sqft"
              type="number"
              min={0}
              value={draft.sqft}
              onChange={(event) => setDraft({ ...draft, sqft: event.target.value })}
              className={inputClassName}
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="detail-list-price" className="mb-1 block text-xs text-gray-600">
                List price
              </label>
              <input
                id="detail-list-price"
                type="number"
                min={0}
                value={draft.listPrice}
                onChange={(event) =>
                  setDraft({ ...draft, listPrice: event.target.value })
                }
                placeholder="USD"
                className={inputClassName}
              />
            </div>
            <div>
              <label htmlFor="detail-offer-price" className="mb-1 block text-xs text-gray-600">
                Offer price
              </label>
              <input
                id="detail-offer-price"
                type="number"
                min={0}
                value={draft.offerPrice}
                onChange={(event) =>
                  setDraft({ ...draft, offerPrice: event.target.value })
                }
                placeholder="USD"
                className={inputClassName}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="detail-rating" className="mb-1 block text-xs text-gray-600">
                Rating
              </label>
              <SelectField
                id="detail-rating"
                value={draft.rating}
                onChange={(value) => setDraft({ ...draft, rating: value })}
                options={RATING_OPTIONS}
                placeholder="No rating"
              />
            </div>
            <div>
              <label htmlFor="detail-visit-date" className="mb-1 block text-xs text-gray-600">
                Visit date
              </label>
              <input
                id="detail-visit-date"
                type="date"
                value={draft.visitDate}
                onChange={(event) =>
                  setDraft({ ...draft, visitDate: event.target.value })
                }
                className={inputClassName}
              />
            </div>
          </div>

          <div>
            <label htmlFor="detail-notes" className="mb-1 block text-xs text-gray-600">
              Notes
            </label>
            <textarea
              id="detail-notes"
              value={draft.notes}
              onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
              rows={4}
              className={`${inputClassName} resize-none`}
            />
          </div>

          {house.geoid && (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Census tract
              </p>
              <p className="mt-1 font-mono text-xs text-gray-700">{house.geoid}</p>
            </div>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || deleting}
              className="flex-1 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={saving || deleting}
              className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
            >
              {deleting ? "…" : "Delete"}
            </button>
          </div>

          {house.geoid && (
            <Link
              href={`/?geoid=${encodeURIComponent(house.geoid)}`}
              className="block text-center text-xs font-medium text-teal-600 hover:text-teal-700"
            >
              View in Explore →
            </Link>
          )}
        </div>

        <AccordionSection title="Custom criteria" defaultOpen={criteria.length > 0}>
          {criteria.length === 0 ? (
            <CustomCriteriaEditor />
          ) : (
            <div className="space-y-3">
              {criteriaValuesLoading ? (
                <LoadingStats />
              ) : (
                criteria.map((criterion) => (
                  <div key={criterion.id}>
                    <label className="mb-1 block text-xs text-gray-600">
                      {criterion.label}
                    </label>
                    <CriterionValueInput
                      criterion={criterion}
                      value={getCriterionValueFromMap(criterionValues, criterion.id)}
                      onChange={handleCriterionChange}
                    />
                  </div>
                ))
              )}
              <button
                type="button"
                onClick={() => void handleSaveCriteria()}
                disabled={savingCriteria || criteriaValuesLoading}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                {savingCriteria ? "Saving criteria…" : "Save criteria values"}
              </button>
              <CustomCriteriaEditor className="border-t border-gray-100 pt-4" />
            </div>
          )}
        </AccordionSection>

        <AccordionSection title="Demographics" defaultOpen>
          {censusLoading ? (
            <LoadingStats />
          ) : (
            <DemographicsSection data={demographics} />
          )}
        </AccordionSection>

        <AccordionSection title="Schools">
          {schoolsLoading ? (
            <LoadingStats />
          ) : (
            <SchoolsSection data={schools} />
          )}
        </AccordionSection>
      </div>
    </aside>
  );
}
