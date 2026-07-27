"use client";

import { useState } from "react";
import type { ComparisonCriterion, CriterionValueType } from "@/types";
import { useComparisonCriteria } from "@/hooks/useComparisonCriteria";
import { SelectField } from "@/components/ui/SelectField";

const VALUE_TYPE_OPTIONS: { value: CriterionValueType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "rating", label: "Rating (1–5)" },
  { value: "boolean", label: "Yes / No" },
];

const inputClassName =
  "w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-900 outline-none ring-teal-600 focus:ring-2";

interface CustomCriteriaEditorProps {
  className?: string;
}

export function CustomCriteriaEditor({ className = "" }: CustomCriteriaEditorProps) {
  const { criteria, createCriterion, updateCriterion, deleteCriterion } =
    useComparisonCriteria();

  const [newLabel, setNewLabel] = useState("");
  const [newType, setNewType] = useState<CriterionValueType>("text");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState("");

  const handleAdd = async () => {
    if (!newLabel.trim()) return;

    setAdding(true);
    setError(null);

    try {
      await createCriterion(newLabel.trim(), newType);
      setNewLabel("");
      setNewType("text");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add criterion");
    } finally {
      setAdding(false);
    }
  };

  const startEditing = (criterion: ComparisonCriterion) => {
    setEditingId(criterion.id);
    setEditLabel(criterion.label);
    setError(null);
  };

  const handleSaveEdit = async (criterion: ComparisonCriterion) => {
    const trimmed = editLabel.trim();
    if (!trimmed) {
      setError("Label cannot be empty");
      return;
    }

    setError(null);

    try {
      if (trimmed !== criterion.label) {
        await updateCriterion(criterion.id, { label: trimmed });
      }
      setEditingId(null);
      setEditLabel("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update criterion");
    }
  };

  const handleDelete = async (criterion: ComparisonCriterion) => {
    if (!window.confirm(`Remove "${criterion.label}"? Values for all houses will be deleted.`)) {
      return;
    }

    setError(null);

    try {
      await deleteCriterion(criterion.id);
      if (editingId === criterion.id) {
        setEditingId(null);
        setEditLabel("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete criterion");
    }
  };

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <h3 className="text-sm font-semibold text-gray-900">Custom criteria</h3>
        <p className="mt-1 text-xs text-gray-500">
          Define parameters to compare across all your saved homes.
        </p>
      </div>

      {criteria.length > 0 && (
        <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200">
          {criteria.map((criterion) => (
            <li
              key={criterion.id}
              className="flex items-center gap-2 px-3 py-2.5"
            >
              {editingId === criterion.id ? (
                <>
                  <input
                    type="text"
                    value={editLabel}
                    onChange={(event) => setEditLabel(event.target.value)}
                    className={`${inputClassName} min-w-0 flex-1`}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={() => void handleSaveEdit(criterion)}
                    className="shrink-0 text-xs font-medium text-teal-600 hover:text-teal-700"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setEditLabel("");
                    }}
                    className="shrink-0 text-xs text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">
                      {criterion.label}
                    </p>
                    <p className="text-xs capitalize text-gray-500">
                      {criterion.valueType === "boolean"
                        ? "Yes / No"
                        : criterion.valueType}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => startEditing(criterion)}
                    className="shrink-0 text-xs font-medium text-gray-600 hover:text-gray-900"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleDelete(criterion)}
                    className="shrink-0 text-xs font-medium text-red-600 hover:text-red-700"
                  >
                    Remove
                  </button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label htmlFor="new-criterion-label" className="mb-1 block text-xs text-gray-600">
            New criterion
          </label>
          <input
            id="new-criterion-label"
            type="text"
            value={newLabel}
            onChange={(event) => setNewLabel(event.target.value)}
            placeholder="e.g. Natural light"
            className={inputClassName}
          />
        </div>
        <div className="sm:w-40">
          <label htmlFor="new-criterion-type" className="mb-1 block text-xs text-gray-600">
            Type
          </label>
          <SelectField
            id="new-criterion-type"
            value={newType}
            onChange={(value) => setNewType(value as CriterionValueType)}
            options={VALUE_TYPE_OPTIONS}
          />
        </div>
        <button
          type="button"
          onClick={() => void handleAdd()}
          disabled={adding || !newLabel.trim()}
          className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {adding ? "Adding…" : "Add"}
        </button>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
