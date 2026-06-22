export interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  subreddit: string;
  createdUtc: number;
  permalink: string;
}

export interface RedditSearchResult {
  posts: RedditPost[];
  subredditCounts: { subreddit: string; count: number }[];
}

let accessToken: string | null = null;
let tokenExpiry = 0;

export function isRedditConfigured(): boolean {
  return Boolean(
    process.env.REDDIT_CLIENT_ID?.trim() &&
      process.env.REDDIT_CLIENT_SECRET?.trim()
  );
}

async function getAccessToken(): Promise<string | null> {
  if (accessToken && Date.now() < tokenExpiry) return accessToken;

  const clientId = process.env.REDDIT_CLIENT_ID?.trim();
  const clientSecret = process.env.REDDIT_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) return null;

  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );

  const res = await fetch("https://www.reddit.com/api/v1/access_token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Neighbourly/1.0 (neighbourhood analyser)",
    },
    body: "grant_type=client_credentials",
  });

  if (!res.ok) {
    console.warn("Reddit auth failed:", res.status);
    return null;
  }

  const json = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };

  accessToken = json.access_token;
  tokenExpiry = Date.now() + json.expires_in * 1000 - 60_000;
  return accessToken;
}

export async function searchNeighbourhoodPosts(
  query: string,
  limit = 25
): Promise<RedditSearchResult> {
  const token = await getAccessToken();
  if (!token) {
    return { posts: [], subredditCounts: [] };
  }

  const searchParams = new URLSearchParams({
    q: `"${query}" OR ${query}`,
    sort: "new",
    limit: String(limit),
    restrict_sr: "false",
    type: "link",
  });

  const res = await fetch(
    `https://oauth.reddit.com/search?${searchParams.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "User-Agent": "Neighbourly/1.0 (neighbourhood analyser)",
      },
      next: { revalidate: 3600 },
    }
  );

  if (!res.ok) {
    console.warn("Reddit search failed:", res.status);
    return { posts: [], subredditCounts: [] };
  }

  const json = (await res.json()) as {
    data: {
      children: Array<{
        data: {
          id: string;
          title: string;
          selftext: string;
          subreddit: string;
          created_utc: number;
          permalink: string;
        };
      }>;
    };
  };

  const posts: RedditPost[] = json.data.children.map(({ data: d }) => ({
    id: d.id,
    title: d.title,
    selftext: d.selftext,
    subreddit: d.subreddit,
    createdUtc: d.created_utc,
    permalink: d.permalink,
  }));

  const subredditMap = new Map<string, number>();
  for (const post of posts) {
    subredditMap.set(post.subreddit, (subredditMap.get(post.subreddit) ?? 0) + 1);
  }

  const subredditCounts = Array.from(subredditMap.entries())
    .map(([subreddit, count]) => ({ subreddit, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return { posts, subredditCounts };
}

export function formatRelativeTime(unixSeconds: number): string {
  const diffMs = Date.now() - unixSeconds * 1000;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  const weeks = Math.floor(days / 7);
  return `${weeks}w ago`;
}
