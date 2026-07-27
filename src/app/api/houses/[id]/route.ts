import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import {
  mapHouseRow,
  mapHouseUpdate,
  parseUpdateHouseInput,
  type HouseRow,
} from "@/lib/houses";

interface RouteParams {
  params: { id: string };
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "House id required" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = parseUpdateHouseInput(body);
  if (typeof parsed === "string") {
    return NextResponse.json({ error: parsed }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("houses")
    .update(mapHouseUpdate(parsed))
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "House not found" }, { status: 404 });
  }

  return NextResponse.json({ house: mapHouseRow(data as HouseRow) });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = params;
  if (!id?.trim()) {
    return NextResponse.json({ error: "House id required" }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from("houses")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: "House not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
