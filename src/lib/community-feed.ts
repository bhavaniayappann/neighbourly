import type { RedditPost, RedditSearchResult } from "./reddit";
import { searchGoogleNews } from "./google-news-rss";
import { withTimeout } from "./fetch-timeout";

function dedupePosts(posts: RedditPost[], limit: number): RedditPost[] {
  const seen = new Set<string>();
  const out: RedditPost[] = [];
  for (const post of posts) {
    const key = post.id || post.permalink;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(post);
    if (out.length >= limit) break;
  }
  return out;
}

function countSources(posts: RedditPost[]): RedditSearchResult["subredditCounts"] {
  const map = new Map<string, number>();
  for (const post of posts) {
    const label = post.subreddit.startsWith("r/")
      ? post.subreddit
      : post.subreddit;
    map.set(label, (map.get(label) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([subreddit, count]) => ({ subreddit, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

/** Reddit RSS (when available) + Google News — no OAuth. */
export async function fetchCommunityPosts(
  searchLabel: string,
  city: string,
  county: string,
  limit = 25
): Promise<RedditSearchResult> {
  const redditQuery = `${searchLabel} ${county} County California`;
  const newsQuery =
    city && searchLabel.toLowerCase() !== city.toLowerCase()
      ? `${searchLabel} ${city} California`
      : `${searchLabel} ${county} County California`;

  const newsPosts = await searchGoogleNews(newsQuery, 12);

  const redditResult = await withTimeout(
    import("./reddit-rss").then((m) =>
      m.searchNeighbourhoodPostsViaRss(redditQuery, 8)
    ),
    7_000,
    { posts: [], subredditCounts: [] } as RedditSearchResult
  );

  const posts = dedupePosts([...newsPosts, ...redditResult.posts], limit);
  return { posts, subredditCounts: countSources(posts) };
}
