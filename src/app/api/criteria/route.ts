import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import {
  mapCriterionInsert,
  mapCriterionRow,
  parseCreateCriterionInput,
  type CriterionRow,
} from "@/lib/criteria";
import type { CriterionValuesMap } from "@/types";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const houseIdsParam = request.nextUrl.searchParams.get("houseIds");
  const houseIds = houseIdsParam
    ? houseIdsParam.split(",").map((id) => id.trim()).filter(Boolean)
    : [];

  const { data: criteriaData, error: criteriaError } = await auth.supabase
    .from("comparison_criteria")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (criteriaError) {
    return NextResponse.json({ error: criteriaError.message }, { status: 500 });
  }

  const criteria = (criteriaData as CriterionRow[]).map(mapCriterionRow);

  if (houseIds.length === 0) {
    return NextResponse.json({ criteria });
  }

  const { data: valuesData, error: valuesError } = await auth.supabase
    .from("house_criterion_values")
    .select("*")
    .in("house_id", houseIds);

  if (valuesError) {
    return NextResponse.json({ error: valuesError.message }, { status: 500 });
  }

  const valuesByHouseId: Record<string, CriterionValuesMap> = {};
  for (const houseId of houseIds) {
    valuesByHouseId[houseId] = {};
  }

  for (const row of valuesData ?? []) {
    const houseId = row.house_id as string;
    const criterionId = row.criterion_id as string;
    if (!valuesByHouseId[houseId]) valuesByHouseId[houseId] = {};
    valuesByHouseId[houseId][criterionId] = {
      criterionId,
      ...(row.value_text != null ? { valueText: row.value_text as string } : {}),
      ...(row.value_number != null
        ? { valueNumber: Number(row.value_number) }
        : {}),
      ...(row.value_rating != null ? { valueRating: row.value_rating as number } : {}),
      ...(row.value_boolean != null
        ? { valueBoolean: row.value_boolean as boolean }
        : {}),
    };
  }

  return NextResponse.json({ criteria, valuesByHouseId });
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseCreateCriterionInput(body);
  if (typeof parsed === "string") {
    return NextResponse.json({ error: parsed }, { status: 400 });
  }

  const { data: maxOrderData } = await auth.supabase
    .from("comparison_criteria")
    .select("sort_order")
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextSortOrder =
    parsed.sortOrder ?? ((maxOrderData?.sort_order as number | undefined) ?? -1) + 1;

  const { data, error } = await auth.supabase
    .from("comparison_criteria")
    .insert(
      mapCriterionInsert({ ...parsed, sortOrder: nextSortOrder }, auth.user.id)
    )
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { criterion: mapCriterionRow(data as CriterionRow) },
    { status: 201 }
  );
}
