import type { RedditPost, RedditSearchResult } from "./reddit";
import { fetchWithTimeout } from "./fetch-timeout";

const USER_AGENT = "Neighbourly/1.0 (neighbourhood analyser; RSS)";

function decodeXml(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .trim();
}

function tagValue(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? decodeXml(match[1]!) : "";
}

function subredditFromLink(link: string): string {
  const match = link.match(/reddit\.com\/r\/([^/]+)/i);
  return match?.[1] ?? "reddit";
}

function permalinkFromLink(link: string): string {
  try {
    const url = new URL(link);
    return url.pathname;
  } catch {
    return link;
  }
}

function parsePublishedToUnix(published: string): number {
  const ms = Date.parse(published);
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : Math.floor(Date.now() / 1000);
}

function parseRedditAtom(xml: string): RedditPost[] {
  const posts: RedditPost[] = [];
  const seen = new Set<string>();

  for (const raw of xml.split("<entry>")) {
    if (!raw.includes("</entry>")) continue;
    const block = raw.split("</entry>")[0]!;

    const title = tagValue(block, "title");
    const link =
      block.match(/<link[^>]+href="([^"]+)"/i)?.[1] ??
      tagValue(block, "link");
    if (!title || !link) continue;

    const idMatch = link.match(/comments\/([a-z0-9]+)/i);
    const id = idMatch?.[1] ?? link;
    if (seen.has(id)) continue;
    seen.add(id);

    const content = tagValue(block, "content");
    const selftext = content
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    posts.push({
      id,
      title,
      selftext,
      subreddit: subredditFromLink(link),
      createdUtc: parsePublishedToUnix(tagValue(block, "updated") || tagValue(block, "published")),
      permalink: permalinkFromLink(link),
    });
  }

  return posts;
}

async function fetchRssFeed(url: string): Promise<RedditPost[]> {
  try {
    const res = await fetchWithTimeout(
      url,
      { headers: { "User-Agent": USER_AGENT }, next: { revalidate: 3600 } },
      6_000
    );

    if (res.status === 429 || res.status === 403 || !res.ok) {
      console.warn("Reddit RSS skipped:", res.status, url);
      return [];
    }

    const xml = await res.text();
    return parseRedditAtom(xml);
  } catch (err) {
    console.warn("Reddit RSS error:", err);
    return [];
  }
}

function countSubreddits(posts: RedditPost[]): RedditSearchResult["subredditCounts"] {
  const map = new Map<string, number>();
  for (const post of posts) {
    map.set(post.subreddit, (map.get(post.subreddit) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([subreddit, count]) => ({ subreddit, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function dedupePosts(posts: RedditPost[], limit: number): RedditPost[] {
  const seen = new Set<string>();
  const out: RedditPost[] = [];
  for (const post of posts) {
    if (seen.has(post.id)) continue;
    seen.add(post.id);
    out.push(post);
    if (out.length >= limit) break;
  }
  return out;
}

/** Bay Area subreddit search RSS — no OAuth required. */
export async function searchNeighbourhoodPostsViaRss(
  query: string,
  limit = 25
): Promise<RedditSearchResult> {
  const encoded = encodeURIComponent(query);
  const url = `https://www.reddit.com/search.rss?q=${encoded}&sort=new`;
  const posts = await fetchRssFeed(url);

  return {
    posts: dedupePosts(posts, limit),
    subredditCounts: countSubreddits(posts),
  };
}

export function isRedditRssAvailable(): boolean {
  return true;
}
