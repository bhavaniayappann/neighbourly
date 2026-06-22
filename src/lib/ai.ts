import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { SocialPulseData } from "@/types";
import type { RedditPost } from "./reddit";
import { getSocialData } from "./mock-data";

const ANTHROPIC_MODEL = "claude-sonnet-4-20250514";
const OPENAI_MODEL = process.env.OPENAI_MODEL?.trim() || "gpt-4o";

export const CHAT_GUARDRAILS = `You are Neighbourly, a neighbourhood data assistant for people relocating within the US.

Rules you MUST follow:
- Present demographic data as neutral factual context only — never as quality indicators.
- NEVER say a neighbourhood is "good" or "bad" for any group based on race, religion, national origin, age, family status, or other protected characteristics.
- NEVER use race or ethnicity data as a recommendation signal.
- Do not steer users toward or away from neighbourhoods.
- When comparing areas, focus on objective metrics: housing costs, commute, schools (as data), walkability, amenities.
- If asked for subjective recommendations, provide balanced factual tradeoffs without demographic steering.
- NEVER mention census tracts, tract numbers, GEOIDs, or other internal geography identifiers.
- Always refer to places by neighbourhood name and city (e.g. "Niles, Fremont"), never by tract ID or number.
- If area context includes a city without a neighbourhood name, use the city name only.`;

type AiProvider = "openai" | "anthropic";

function getProvider(): AiProvider | null {
  if (process.env.OPENAI_API_KEY?.trim()) return "openai";
  if (process.env.ANTHROPIC_API_KEY?.trim()) return "anthropic";
  return null;
}

export function isAiConfigured(): boolean {
  return getProvider() !== null;
}

function unavailableMessage(): string {
  return "AI chat is unavailable — add OPENAI_API_KEY or ANTHROPIC_API_KEY to .env.local and restart the dev server.";
}

async function completeText(
  system: string,
  userPrompt: string,
  maxTokens: number
): Promise<string | null> {
  const provider = getProvider();
  if (!provider) return null;

  if (provider === "openai") {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.chat.completions.create({
      model: OPENAI_MODEL,
      max_tokens: maxTokens,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userPrompt },
      ],
    });
    return response.choices[0]?.message?.content?.trim() ?? "";
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: userPrompt }],
  });
  return response.content[0]?.type === "text" ? response.content[0].text.trim() : "";
}

async function completeChat(
  system: string,
  messages: { role: "user" | "assistant"; content: string }[],
  maxTokens: number
): Promise<string | null> {
  const provider = getProvider();
  if (!provider) return null;

  if (provider === "openai") {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const response = await client.chat.completions.create({
      model: OPENAI_MODEL,
      max_tokens: maxTokens,
      messages: [{ role: "system", content: system }, ...messages],
    });
    return response.choices[0]?.message?.content?.trim() ?? "";
  }

  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const response = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: maxTokens,
    system,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  });
  return response.content[0]?.type === "text" ? response.content[0].text.trim() : "";
}

interface SentimentAnalysis {
  positive: number;
  neutral: number;
  negative: number;
  keywords: SocialPulseData["keywords"];
  trend: number[];
}

function fallbackSentiment(
  geoid: string,
  posts: RedditPost[]
): SocialPulseData {
  const mock = getSocialData(geoid);

  if (posts.length === 0) return mock;

  const mentions = posts.slice(0, 3).map((p) => ({
    text: p.selftext?.slice(0, 160) || p.title,
    sentiment: "neutral" as const,
    timestamp: formatPostTime(p.createdUtc),
    source: `r/${p.subreddit}`,
  }));

  return { ...mock, mentions };
}

function formatPostTime(unix: number): string {
  const diffMs = Date.now() - unix * 1000;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export async function analyzeSocialSentiment(
  geoid: string,
  neighbourhoodName: string,
  county: string,
  posts: RedditPost[]
): Promise<SocialPulseData> {
  if (!isAiConfigured() || posts.length === 0) {
    return fallbackSentiment(geoid, posts);
  }

  const snippets = posts
    .slice(0, 20)
    .map(
      (p, i) =>
        `[${i + 1}] r/${p.subreddit}: ${p.title}${p.selftext ? ` — ${p.selftext.slice(0, 200)}` : ""}`
    )
    .join("\n");

  try {
    const text = await completeText(
      "You analyze neighbourhood sentiment from Reddit posts. Return only valid JSON.",
      `Analyze Reddit posts about "${neighbourhoodName}, ${county} County, California".

Return ONLY valid JSON with this shape:
{
  "positive": number (0-100, percentages summing to 100 with neutral and negative),
  "neutral": number,
  "negative": number,
  "keywords": [{"label": string, "count": number, "sentiment": "positive"|"negative"}],
  "trend": [6 numbers 0-100 representing monthly sentiment Jan-Jun],
  "mentions": [{"text": string, "sentiment": "positive"|"neutral"|"negative", "index": number}]
}

Posts:
${snippets}`,
      1024
    );

    if (!text) return fallbackSentiment(geoid, posts);

    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("No JSON in response");

    const parsed = JSON.parse(jsonMatch[0]) as SentimentAnalysis & {
      mentions?: { text: string; sentiment: "positive" | "neutral" | "negative"; index: number }[];
    };

    const mentions = (parsed.mentions ?? [])
      .slice(0, 3)
      .map((m) => {
        const post = posts[m.index - 1] ?? posts[0];
        return {
          text: m.text || post.title,
          sentiment: m.sentiment,
          timestamp: formatPostTime(post.createdUtc),
          source: `r/${post.subreddit}`,
        };
      });

    if (mentions.length === 0 && posts.length > 0) {
      mentions.push({
        text: posts[0].title,
        sentiment: "neutral",
        timestamp: formatPostTime(posts[0].createdUtc),
        source: `r/${posts[0].subreddit}`,
      });
    }

    return {
      positive: parsed.positive ?? 45,
      neutral: parsed.neutral ?? 30,
      negative: parsed.negative ?? 25,
      trend: parsed.trend ?? [40, 42, 44, 43, 45, 47],
      keywords: parsed.keywords ?? getSocialData(geoid).keywords,
      mentions,
    };
  } catch (err) {
    console.warn("AI sentiment analysis failed:", err);
    return fallbackSentiment(geoid, posts);
  }
}

export async function generateNeighbourhoodSummary(
  neighbourhoodName: string,
  county: string,
  context: Record<string, unknown>
): Promise<string> {
  const fallback = `${neighbourhoodName} in ${county} County is a Bay Area neighbourhood with diverse housing, transit access, and local amenities. Explore the sidebar for demographics, housing costs, and walkability scores. Social Pulse shows recent community sentiment from Reddit.`;

  if (!isAiConfigured()) return fallback;

  try {
    const text = await completeText(
      CHAT_GUARDRAILS,
      `Write exactly 3 neutral sentences summarizing "${neighbourhoodName}" in ${county} County, California for someone considering a move. Use only this data:\n${JSON.stringify(context, null, 2)}`,
      256
    );
    return text || fallback;
  } catch (err) {
    console.warn("AI summary failed:", err);
    return fallback;
  }
}

export async function chatAboutNeighbourhood(
  neighbourhoodName: string,
  county: string,
  context: Record<string, unknown>,
  messages: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  if (!isAiConfigured()) return unavailableMessage();

  const system = `${CHAT_GUARDRAILS}\n\nArea context for ${neighbourhoodName}, ${county} County:\n${JSON.stringify(context, null, 2)}`;

  try {
    const text = await completeChat(system, messages, 1024);
    return text || "Sorry, I couldn't generate a response.";
  } catch (err) {
    console.warn("AI chat failed:", err);
    return err instanceof Error ? err.message : "Chat request failed.";
  }
}
