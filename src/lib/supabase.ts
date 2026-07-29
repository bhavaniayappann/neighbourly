import { createClient, SupabaseClient } from "@supabase/supabase-js";
import type { SupabaseClientOptions } from "@supabase/supabase-js";

let supabaseAdmin: SupabaseClient | null = null;

function adminClientOptions(): SupabaseClientOptions<"public"> {
  const options: SupabaseClientOptions<"public"> = {
    auth: { persistSession: false, autoRefreshToken: false },
  };

  // Node < 22 scripts need an explicit WebSocket transport for Supabase Realtime.
  if (typeof window === "undefined") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ws = require("ws") as typeof import("ws");
    options.realtime = { transport: ws as never };
  }

  return options;
}

export function getSupabaseAdmin(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;

  if (!supabaseAdmin) {
    supabaseAdmin = createClient(url, key, adminClientOptions());
  }

  return supabaseAdmin;
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
