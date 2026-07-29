/**
 * Fetches community posts for demo neighbourhoods, chunks them, embeds via OpenAI,
 * and upserts into Supabase social_posts / social_post_chunks.
 *
 * Usage: npm run ingest:social
 */

import fs from "node:fs";
import path from "node:path";

import { getMatchCandidates } from "../src/lib/match-catalog";
import { resolveNeighbourhoodForTract } from "../src/lib/neighbourhood";
import { searchNeighbourhoodPosts } from "../src/lib/reddit";
import { upsertSocialPosts } from "../src/lib/social-rag";
import { getTractByGeoid } from "../src/lib/tracts";

const ROOT = path.resolve(__dirname, "..");
const POST_LIMIT = 25;
const EMBED_RATE_LIMIT_MS = 350;

const EXTRA_DEMO_GEOIDS = [
  "06001400200", // Rockridge, Oakland
  "06001401100", // Temescal, Oakland
  "06001421500", // Berkeley Hills, Berkeley
  "06075016200", // Hayes Valley, San Francisco
  "06075021000", // Noe Valley, San Francisco
  "06085506804", // Los Gatos, Santa Clara
];

function loadEnvLocal(): void {
  const envPath = path.join(ROOT, ".env.local");
  if (!fs.existsSync(envPath)) return;

  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key]) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function demoGeoids(): string[] {
  const curated = getMatchCandidates()
    .filter((candidate) => candidate.source === "curated")
    .map((candidate) => candidate.primaryGeoid)
    .filter(Boolean);

  const geoids = [...new Set([...curated, ...EXTRA_DEMO_GEOIDS])];
  return geoids.slice(0, 12);
}

async function ingestArea(geoid: string): Promise<void> {
  const tract = getTractByGeoid(geoid);
  const resolved = await resolveNeighbourhoodForTract(geoid);

  const displayName = resolved.displayName;
  const city = resolved.city || tract?.city || "";
  const county = resolved.county || tract?.county || "Bay Area";
  const searchLabel =
    city && displayName.toLowerCase() !== city.toLowerCase()
      ? `${displayName} ${city}`
      : displayName;

  console.log(`\n→ ${searchLabel}, ${county} County (${geoid})`);

  const searchQuery = `${searchLabel} ${county} County California`;
  const { posts } = await searchNeighbourhoodPosts(searchQuery, POST_LIMIT, {
    searchLabel,
    city,
    county,
  });

  if (posts.length === 0) {
    console.log("  No posts found — skipped");
    return;
  }

  const { postsUpserted, chunksInserted } = await upsertSocialPosts(
    {
      geoid,
      displayName,
      city,
      county,
    },
    posts
  );

  console.log(
    `  Fetched ${posts.length} posts → upserted ${postsUpserted}, ${chunksInserted} chunks`
  );

  await sleep(EMBED_RATE_LIMIT_MS);
}

async function main(): Promise<void> {
  loadEnvLocal();

  if (!process.env.OPENAI_API_KEY?.trim()) {
    throw new Error("OPENAI_API_KEY is required for embeddings");
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  ) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required"
    );
  }

  const geoids = demoGeoids();
  console.log(`Ingesting social embeddings for ${geoids.length} demo areas…`);

  for (const geoid of geoids) {
    try {
      await ingestArea(geoid);
    } catch (err) {
      console.warn(
        `  Failed for ${geoid}:`,
        err instanceof Error ? err.message : err
      );
    }
  }

  console.log("\nDone.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
