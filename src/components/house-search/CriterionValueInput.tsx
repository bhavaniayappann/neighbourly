"use client";

import type { ComparisonCriterion, HouseCriterionValue } from "@/types";
import { SelectField } from "@/components/ui/SelectField";

const inputClassName =
  "w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-900 outline-none ring-teal-600 focus:ring-2";

const RATING_OPTIONS = [
  { value: "", label: "—" },
  ...[1, 2, 3, 4, 5].map((rating) => ({
    value: String(rating),
    label: `${rating} / 5`,
  })),
];

const BOOLEAN_OPTIONS = [
  { value: "", label: "—" },
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

interface CriterionValueInputProps {
  criterion: ComparisonCriterion;
  value: HouseCriterionValue | undefined;
  onChange: (value: HouseCriterionValue) => void;
  compact?: boolean;
}

export function CriterionValueInput({
  criterion,
  value,
  onChange,
}: CriterionValueInputProps) {
  const criterionId = criterion.id;

  switch (criterion.valueType) {
    case "text":
      return (
        <input
          type="text"
          value={value?.valueText ?? ""}
          onChange={(event) =>
            onChange({
              criterionId,
              valueText: event.target.value,
            })
          }
          className={inputClassName}
          placeholder="—"
        />
      );
    case "number":
      return (
        <input
          type="number"
          value={value?.valueNumber ?? ""}
          onChange={(event) =>
            onChange({
              criterionId,
              valueNumber: event.target.value ? Number(event.target.value) : undefined,
            })
          }
          className={inputClassName}
          placeholder="—"
        />
      );
    case "rating":
      return (
        <SelectField
          value={value?.valueRating != null ? String(value.valueRating) : ""}
          onChange={(selected) =>
            onChange({
              criterionId,
              valueRating: selected ? Number(selected) : undefined,
            })
          }
          options={RATING_OPTIONS}
          placeholder="—"
        />
      );
    case "boolean":
      return (
        <SelectField
          value={
            value?.valueBoolean === true
              ? "yes"
              : value?.valueBoolean === false
                ? "no"
                : ""
          }
          onChange={(selected) =>
            onChange({
              criterionId,
              valueBoolean:
                selected === "yes" ? true : selected === "no" ? false : undefined,
            })
          }
          options={BOOLEAN_OPTIONS}
          placeholder="—"
        />
      );
    default:
      return null;
  }
}

export function getCriterionValueFromMap(
  values: Record<string, HouseCriterionValue> | undefined,
  criterionId: string
): HouseCriterionValue | undefined {
  return values?.[criterionId];
}

export function mergeCriterionValue(
  values: Record<string, HouseCriterionValue>,
  next: HouseCriterionValue
): Record<string, HouseCriterionValue> {
  return {
    ...values,
    [next.criterionId]: next,
  };
}

export function valuesMapToArray(
  values: Record<string, HouseCriterionValue>
): HouseCriterionValue[] {
  return Object.values(values);
}
