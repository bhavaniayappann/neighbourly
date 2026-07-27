import type {
  ComparisonCriterion,
  CriterionValueType,
  HouseCriterionValue,
} from "@/types";

export interface CriterionRow {
  id: string;
  user_id: string;
  label: string;
  value_type: CriterionValueType;
  sort_order: number;
  created_at: string;
}

export interface CriterionValueRow {
  house_id: string;
  criterion_id: string;
  value_text: string | null;
  value_number: number | null;
  value_rating: number | null;
  value_boolean: boolean | null;
}

export interface CreateCriterionInput {
  label: string;
  valueType?: CriterionValueType;
  sortOrder?: number;
}

export type UpdateCriterionInput = Partial<CreateCriterionInput>;

const CRITERION_VALUE_TYPES: CriterionValueType[] = [
  "text",
  "number",
  "rating",
  "boolean",
];

export function isCriterionValueType(value: unknown): value is CriterionValueType {
  return (
    typeof value === "string" &&
    CRITERION_VALUE_TYPES.includes(value as CriterionValueType)
  );
}

export function mapCriterionRow(row: CriterionRow): ComparisonCriterion {
  return {
    id: row.id,
    label: row.label,
    valueType: row.value_type,
    sortOrder: row.sort_order,
  };
}

export function mapCriterionValueRow(row: CriterionValueRow): HouseCriterionValue {
  return {
    criterionId: row.criterion_id,
    ...(row.value_text != null ? { valueText: row.value_text } : {}),
    ...(row.value_number != null ? { valueNumber: Number(row.value_number) } : {}),
    ...(row.value_rating != null ? { valueRating: row.value_rating } : {}),
    ...(row.value_boolean != null ? { valueBoolean: row.value_boolean } : {}),
  };
}

export function mapCriterionInsert(
  input: CreateCriterionInput,
  userId: string
): Record<string, unknown> {
  return {
    user_id: userId,
    label: input.label.trim(),
    value_type: input.valueType ?? "text",
    sort_order: input.sortOrder ?? 0,
  };
}

export function mapCriterionUpdate(input: UpdateCriterionInput): Record<string, unknown> {
  const fields: Record<string, unknown> = {};

  if (input.label !== undefined) fields.label = input.label.trim();
  if (input.valueType !== undefined) fields.value_type = input.valueType;
  if (input.sortOrder !== undefined) fields.sort_order = input.sortOrder;

  return fields;
}

export function parseCreateCriterionInput(body: unknown): CreateCriterionInput | string {
  if (!body || typeof body !== "object") {
    return "Invalid request body";
  }

  const data = body as Record<string, unknown>;

  if (typeof data.label !== "string" || !data.label.trim()) {
    return "label is required";
  }
  if (data.valueType !== undefined && !isCriterionValueType(data.valueType)) {
    return "valueType must be text, number, rating, or boolean";
  }
  if (
    data.sortOrder !== undefined &&
    (typeof data.sortOrder !== "number" || !Number.isInteger(data.sortOrder))
  ) {
    return "sortOrder must be an integer";
  }

  return {
    label: data.label.trim(),
    ...(isCriterionValueType(data.valueType) ? { valueType: data.valueType } : {}),
    ...(typeof data.sortOrder === "number" ? { sortOrder: data.sortOrder } : {}),
  };
}

export function parseUpdateCriterionInput(body: unknown): UpdateCriterionInput | string {
  if (!body || typeof body !== "object") {
    return "Invalid request body";
  }

  const data = body as Record<string, unknown>;
  const input: UpdateCriterionInput = {};

  if (typeof data.label === "string") {
    if (!data.label.trim()) return "label cannot be empty";
    input.label = data.label.trim();
  }
  if (data.valueType !== undefined) {
    if (!isCriterionValueType(data.valueType)) {
      return "valueType must be text, number, rating, or boolean";
    }
    input.valueType = data.valueType;
  }
  if (data.sortOrder !== undefined) {
    if (typeof data.sortOrder !== "number" || !Number.isInteger(data.sortOrder)) {
      return "sortOrder must be an integer";
    }
    input.sortOrder = data.sortOrder;
  }

  if (Object.keys(input).length === 0) {
    return "No valid fields to update";
  }

  return input;
}

export function mapCriterionValueUpsert(
  houseId: string,
  value: HouseCriterionValue
): Record<string, unknown> {
  return {
    house_id: houseId,
    criterion_id: value.criterionId,
    value_text: value.valueText ?? null,
    value_number: value.valueNumber ?? null,
    value_rating: value.valueRating ?? null,
    value_boolean: value.valueBoolean ?? null,
  };
}

export function parseHouseCriterionValuesInput(
  body: unknown
): HouseCriterionValue[] | string {
  if (!body || typeof body !== "object") {
    return "Invalid request body";
  }

  const data = body as Record<string, unknown>;
  if (!Array.isArray(data.values)) {
    return "values array is required";
  }

  const values: HouseCriterionValue[] = [];

  for (const item of data.values) {
    if (!item || typeof item !== "object") {
      return "Each value must be an object";
    }

    const entry = item as Record<string, unknown>;
    if (typeof entry.criterionId !== "string" || !entry.criterionId.trim()) {
      return "Each value must include criterionId";
    }

    const value: HouseCriterionValue = { criterionId: entry.criterionId };

    if (entry.valueText !== undefined) {
      if (entry.valueText !== null && typeof entry.valueText !== "string") {
        return "valueText must be a string";
      }
      if (typeof entry.valueText === "string") value.valueText = entry.valueText;
    }
    if (entry.valueNumber !== undefined) {
      if (entry.valueNumber !== null && typeof entry.valueNumber !== "number") {
        return "valueNumber must be a number";
      }
      if (typeof entry.valueNumber === "number") value.valueNumber = entry.valueNumber;
    }
    if (entry.valueRating !== undefined) {
      if (
        entry.valueRating !== null &&
        (typeof entry.valueRating !== "number" ||
          entry.valueRating < 1 ||
          entry.valueRating > 5)
      ) {
        return "valueRating must be between 1 and 5";
      }
      if (typeof entry.valueRating === "number") value.valueRating = entry.valueRating;
    }
    if (entry.valueBoolean !== undefined) {
      if (entry.valueBoolean !== null && typeof entry.valueBoolean !== "boolean") {
        return "valueBoolean must be a boolean";
      }
      if (typeof entry.valueBoolean === "boolean") value.valueBoolean = entry.valueBoolean;
    }

    values.push(value);
  }

  return values;
}

export function formatCriterionValue(
  criterion: ComparisonCriterion,
  value: HouseCriterionValue | undefined
): string {
  if (!value) return "—";

  switch (criterion.valueType) {
    case "text":
      return value.valueText?.trim() || "—";
    case "number":
      return value.valueNumber != null ? String(value.valueNumber) : "—";
    case "rating":
      return value.valueRating != null ? `${value.valueRating} / 5` : "—";
    case "boolean":
      if (value.valueBoolean == null) return "—";
      return value.valueBoolean ? "Yes" : "No";
    default:
      return "—";
  }
}

export function getNumericCriterionValue(
  criterion: ComparisonCriterion,
  value: HouseCriterionValue | undefined
): number | null {
  if (!value) return null;

  switch (criterion.valueType) {
    case "number":
      return value.valueNumber ?? null;
    case "rating":
      return value.valueRating ?? null;
    default:
      return null;
  }
}
