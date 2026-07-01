import { getSupabaseAdmin } from "./supabase";
import { withTimeout } from "./fetch-timeout";

export type CacheCategory =
  | "demographics"
  | "housing"
  | "social"
  | "summary"
  | "county_demographics"
  | "schools"
  | "parks"
  | "dog-friendly"
  | "match";

const TTL_DAYS: Record<CacheCategory, number> = {
  demographics: 365,
  housing: 365,
  social: 1,
  summary: 365,
  county_demographics: 365,
  schools: 90,
  parks: 90,
  "dog-friendly": 90,
  match: 7,
};

function ttlToExpiresAt(category: CacheCategory): string {
  const days = TTL_DAYS[category];
  const expires = new Date();
  expires.setDate(expires.getDate() + days);
  return expires.toISOString();
}

export async function getCached<T>(
  geoid: string,
  category: CacheCategory
): Promise<T | null> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("api_cache")
    .select("data, expires_at")
    .eq("geoid", geoid)
    .eq("category", category)
    .maybeSingle();

  if (error || !data) return null;

  if (new Date(data.expires_at) <= new Date()) return null;

  return data.data as T;
}

export async function setCache<T>(
  geoid: string,
  category: CacheCategory,
  data: T
): Promise<void> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return;

  const expires_at = ttlToExpiresAt(category);

  const { error } = await supabase.from("api_cache").upsert(
    {
      geoid,
      category,
      data,
      fetched_at: new Date().toISOString(),
      expires_at,
    },
    { onConflict: "geoid,category" }
  );

  if (error) {
    console.warn(`Supabase cache write failed (${category}/${geoid}):`, error.message);
  }
}

export async function withCache<T>(
  geoid: string,
  category: CacheCategory,
  fetcher: () => Promise<T>
): Promise<T> {
  const cached = await withTimeout(getCached<T>(geoid, category), 3_000, null);
  if (cached !== null) return cached;

  const fresh = await fetcher();
  void setCache(geoid, category, fresh);
  return fresh;
}
