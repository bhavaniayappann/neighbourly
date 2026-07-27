import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import {
  mapCriterionValueRow,
  mapCriterionValueUpsert,
  parseHouseCriterionValuesInput,
  type CriterionValueRow,
} from "@/lib/criteria";

interface RouteParams {
  params: { id: string };
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id: houseId } = params;
  if (!houseId?.trim()) {
    return NextResponse.json({ error: "House id required" }, { status: 400 });
  }

  const { data: house, error: houseError } = await auth.supabase
    .from("houses")
    .select("id")
    .eq("id", houseId)
    .maybeSingle();

  if (houseError) {
    return NextResponse.json({ error: houseError.message }, { status: 500 });
  }

  if (!house) {
    return NextResponse.json({ error: "House not found" }, { status: 404 });
  }

  const { data, error } = await auth.supabase
    .from("house_criterion_values")
    .select("*")
    .eq("house_id", houseId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const values = (data as CriterionValueRow[]).map(mapCriterionValueRow);
  return NextResponse.json({ values });
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id: houseId } = params;
  if (!houseId?.trim()) {
    return NextResponse.json({ error: "House id required" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseHouseCriterionValuesInput(body);
  if (typeof parsed === "string") {
    return NextResponse.json({ error: parsed }, { status: 400 });
  }

  const { data: house, error: houseError } = await auth.supabase
    .from("houses")
    .select("id")
    .eq("id", houseId)
    .maybeSingle();

  if (houseError) {
    return NextResponse.json({ error: houseError.message }, { status: 500 });
  }

  if (!house) {
    return NextResponse.json({ error: "House not found" }, { status: 404 });
  }

  if (parsed.length === 0) {
    return NextResponse.json({ values: [] });
  }

  const rows = parsed.map((value) => mapCriterionValueUpsert(houseId, value));

  const { data, error } = await auth.supabase
    .from("house_criterion_values")
    .upsert(rows, { onConflict: "house_id,criterion_id" })
    .select("*");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const values = (data as CriterionValueRow[]).map(mapCriterionValueRow);
  return NextResponse.json({ values });
}
