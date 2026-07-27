import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import {
  mapCriterionRow,
  mapCriterionUpdate,
  parseUpdateCriterionInput,
  type CriterionRow,
} from "@/lib/criteria";

interface RouteParams {
  params: { id: string };
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Criterion id required" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseUpdateCriterionInput(body);
  if (typeof parsed === "string") {
    return NextResponse.json({ error: parsed }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("comparison_criteria")
    .update(mapCriterionUpdate(parsed))
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Criterion not found" }, { status: 404 });
  }

  return NextResponse.json({ criterion: mapCriterionRow(data as CriterionRow) });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "Criterion id required" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("comparison_criteria")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "Criterion not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
