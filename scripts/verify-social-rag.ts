/**
 * Quick smoke test for social RAG retrieval.
 * Usage: tsx scripts/verify-social-rag.ts
 */

import fs from "node:fs";
import path from "node:path";

import { chatAboutNeighbourhoodRag } from "../src/lib/ai";
import { retrieveSocialChunks } from "../src/lib/social-rag";
import type { ChatSource } from "../src/types";

const ROOT = path.resolve(__dirname, "..");
const NILES_GEOID = "06001441928";

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

async function main(): Promise<void> {
  loadEnvLocal();

  const query = "What do residents say about schools?";
  const chunks = await retrieveSocialChunks(
    NILES_GEOID,
    "Fremont",
    "Alameda",
    query
  );

  console.log(`Retrieved ${chunks.length} chunks for Niles`);
  if (chunks.length === 0) {
    console.log("No chunks — run npm run ingest:social first");
    process.exit(1);
  }

  const top = chunks[0];
  console.log(`Top match: ${top.source} (similarity ${top.similarity.toFixed(3)})`);
  console.log(`Excerpt: ${top.content.slice(0, 120)}…`);

  const sources: ChatSource[] = chunks.map((chunk, i) => ({
    index: i + 1,
    source: chunk.source,
    excerpt: chunk.content.slice(0, 200),
    permalink: chunk.permalink,
    similarity: chunk.similarity,
  }));

  const reply = await chatAboutNeighbourhoodRag(
    "Niles",
    "Alameda",
    { displayName: "Niles", city: "Fremont" },
    [{ role: "user", content: query }],
    sources
  );

  console.log("\nRAG reply preview:");
  console.log(reply.slice(0, 400) + (reply.length > 400 ? "…" : ""));
  console.log("\nVerification passed.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
