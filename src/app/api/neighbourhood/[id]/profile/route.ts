import { NextResponse } from "next/server";
import { getNeighbourhoodProfile } from "@/lib/neighbourhood";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const { id } = params;

  if (!id?.trim()) {
    return NextResponse.json(
      { error: "Neighbourhood id required" },
      { status: 400 }
    );
  }

  try {
    const profile = await getNeighbourhoodProfile(id);
    if (!profile) {
      return NextResponse.json(
        { error: "Neighbourhood not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(profile);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Neighbourhood profile fetch failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
