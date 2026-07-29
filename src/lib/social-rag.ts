import { embedText, embedTexts } from "./embeddings";
import type { RedditPost } from "./reddit";
import { getSupabaseAdmin } from "./supabase";

const CHUNK_CHARS = 2000;
const CHUNK_OVERLAP_CHARS = 200;
const MIN_GEOID_RESULTS = 3;
const DEFAULT_MATCH_COUNT = 8;

export interface SocialRagArea {
  geoid: string;
  displayName: string;
  city: string;
  county: string;
}

export interface SocialChunkResult {
  content: string;
  source: string;
  permalink?: string;
  similarity: number;
  postId: string;
}

interface RpcChunkRow {
  id: string;
  post_id: string;
  geoid: string;
  city: string;
  county: string;
  chunk_index: number;
  content: string;
  source: string;
  permalink: string | null;
  similarity: number;
}

function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

function postBody(post: RedditPost): string {
  return normalizeWhitespace(`${post.title}\n\n${post.selftext}`);
}

function chunkText(text: string): string[] {
  const normalized = normalizeWhitespace(text);
  if (!normalized) return [];

  const chunks: string[] = [];
  const seen = new Set<string>();
  let start = 0;

  while (start < normalized.length) {
    const end = Math.min(start + CHUNK_CHARS, normalized.length);
    const chunk = normalized.slice(start, end).trim();
    if (chunk && !seen.has(chunk)) {
      seen.add(chunk);
      chunks.push(chunk);
    }
    if (end >= normalized.length) break;
    start = Math.max(end - CHUNK_OVERLAP_CHARS, start + 1);
  }

  return chunks;
}

function formatSource(post: RedditPost): string {
  if (post.subreddit.startsWith("r/")) return post.subreddit;
  return `r/${post.subreddit}`;
}

function rowToResult(row: RpcChunkRow): SocialChunkResult {
  return {
    content: row.content,
    source: row.source,
    permalink: row.permalink ?? undefined,
    similarity: row.similarity,
    postId: row.post_id,
  };
}

async function searchChunks(
  queryEmbedding: number[],
  filters: {
    geoid: string | null;
    city: string | null;
    county: string | null;
  },
  matchCount: number
): Promise<SocialChunkResult[]> {
  const supabase = getSupabaseAdmin();
  if (!supabase) return [];

  const { data, error } = await supabase.rpc("match_social_chunks", {
    query_embedding: queryEmbedding,
    match_geoid: filters.geoid,
    match_city: filters.city,
    match_county: filters.county,
    match_count: matchCount,
  });

  if (error) {
    console.warn("match_social_chunks failed:", error.message);
    return [];
  }

  return ((data ?? []) as RpcChunkRow[]).map(rowToResult);
}

export async function retrieveSocialChunks(
  geoid: string,
  city: string,
  county: string,
  userMessage: string,
  matchCount = DEFAULT_MATCH_COUNT
): Promise<SocialChunkResult[]> {
  const queryEmbedding = await embedText(userMessage);
  if (!queryEmbedding) return [];

  const byGeoid = await searchChunks(
    queryEmbedding,
    { geoid, city: null, county: null },
    matchCount
  );

  if (byGeoid.length >= MIN_GEOID_RESULTS || !city || !county) {
    return byGeoid;
  }

  const byCityCounty = await searchChunks(
    queryEmbedding,
    { geoid: null, city, county },
    matchCount
  );

  const seen = new Set(byGeoid.map((chunk) => `${chunk.postId}:${chunk.content}`));
  const merged = [...byGeoid];

  for (const chunk of byCityCounty) {
    const key = `${chunk.postId}:${chunk.content}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(chunk);
    if (merged.length >= matchCount) break;
  }

  return merged
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, matchCount);
}

export async function upsertSocialPosts(
  area: SocialRagArea,
  posts: RedditPost[]
): Promise<{ postsUpserted: number; chunksInserted: number }> {
  const supabase = getSupabaseAdmin();
  if (!supabase) {
    throw new Error("Supabase is not configured");
  }

  let postsUpserted = 0;
  let chunksInserted = 0;

  for (const post of posts) {
    const body = postBody(post);
    const chunks = chunkText(body);
    if (chunks.length === 0) continue;

    const postedAt = new Date(post.createdUtc * 1000).toISOString();
    const source = formatSource(post);

    const { error: postError } = await supabase.from("social_posts").upsert(
      {
        id: post.id,
        geoid: area.geoid,
        display_name: area.displayName,
        city: area.city,
        county: area.county,
        title: post.title,
        source,
        permalink: post.permalink,
        posted_at: postedAt,
        ingested_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

    if (postError) {
      console.warn(`social_posts upsert failed for ${post.id}:`, postError.message);
      continue;
    }

    postsUpserted += 1;

    const { error: deleteError } = await supabase
      .from("social_post_chunks")
      .delete()
      .eq("post_id", post.id);

    if (deleteError) {
      console.warn(`social_post_chunks delete failed for ${post.id}:`, deleteError.message);
      continue;
    }

    const embeddings = await embedTexts(chunks);
    if (!embeddings || embeddings.length !== chunks.length) {
      console.warn(`embedding failed for post ${post.id}`);
      continue;
    }

    const rows = chunks.map((content, chunkIndex) => ({
      post_id: post.id,
      geoid: area.geoid,
      city: area.city,
      county: area.county,
      chunk_index: chunkIndex,
      content,
      embedding: embeddings[chunkIndex],
    }));

    const { error: insertError } = await supabase
      .from("social_post_chunks")
      .insert(rows);

    if (insertError) {
      console.warn(`social_post_chunks insert failed for ${post.id}:`, insertError.message);
      continue;
    }

    chunksInserted += rows.length;
  }

  return { postsUpserted, chunksInserted };
}
