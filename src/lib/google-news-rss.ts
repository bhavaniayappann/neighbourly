import type { RedditPost } from "./reddit";
import { fetchWithTimeout } from "./fetch-timeout";

const USER_AGENT = "Neighbourly/1.0 (neighbourhood analyser; news RSS)";

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

function parseRssDate(pubDate: string): number {
  const ms = Date.parse(pubDate);
  return Number.isFinite(ms) ? Math.floor(ms / 1000) : Math.floor(Date.now() / 1000);
}

function parseGoogleNewsRss(xml: string): RedditPost[] {
  const posts: RedditPost[] = [];
  const seen = new Set<string>();

  for (const raw of xml.split("<item>")) {
    if (!raw.includes("</item>")) continue;
    const block = raw.split("</item>")[0]!;

    const title = tagValue(block, "title");
    const link = tagValue(block, "link");
    if (!title || !link) continue;
    if (seen.has(link)) continue;
    seen.add(link);

    const outlet = tagValue(block, "source") || "News";
    const pubDate = tagValue(block, "pubDate");

    posts.push({
      id: link,
      title,
      selftext: "",
      subreddit: outlet,
      createdUtc: parseRssDate(pubDate),
      permalink: link,
    });
  }

  return posts;
}

export async function searchGoogleNews(
  query: string,
  limit = 15
): Promise<RedditPost[]> {
  const params = new URLSearchParams({
    q: query,
    hl: "en-US",
    gl: "US",
    ceid: "US:en",
  });

  const url = `https://news.google.com/rss/search?${params.toString()}`;

  try {
    const res = await fetchWithTimeout(
      url,
      { headers: { "User-Agent": USER_AGENT }, next: { revalidate: 3600 } },
      10_000
    );

    if (!res.ok) {
      console.warn("Google News RSS failed:", res.status);
      return [];
    }

    const xml = await res.text();
    return parseGoogleNewsRss(xml).slice(0, limit);
  } catch (err) {
    console.warn("Google News RSS error:", err);
    return [];
  }
}
