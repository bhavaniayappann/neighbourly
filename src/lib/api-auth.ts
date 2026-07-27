import { NextResponse } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createServerSupabaseClient, getAuthUser } from "@/lib/supabase-server";

type AuthResult =
  | { error: NextResponse; user: null; supabase: null }
  | { error: null; user: User; supabase: SupabaseClient };

export async function requireAuth(): Promise<AuthResult> {
  const user = await getAuthUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      user: null,
      supabase: null,
    };
  }

  const supabase = createServerSupabaseClient();
  if (!supabase) {
    return {
      error: NextResponse.json(
        { error: "Authentication is not configured" },
        { status: 503 }
      ),
      user: null,
      supabase: null,
    };
  }

  return { error: null, user, supabase };
}
