"use client";

import { useAppStore } from "@/store/useAppStore";
import { useSocialData, socialSourceLabel } from "@/hooks/useSocialData";
import { SentimentBar } from "@/components/social/SentimentBar";
import { SentimentTrend } from "@/components/social/SentimentTrend";
import { KeywordTags } from "@/components/social/KeywordTags";
import { RecentMentions } from "@/components/social/RecentMentions";
import { SubredditList } from "@/components/social/SubredditList";

export function SocialPulsePanel() {
  const selectedGeoid = useAppStore((s) => s.selectedGeoid);
  const selectedName = useAppStore((s) => s.selectedName);
  const { data: social, loading, error } = useSocialData(selectedGeoid);
  const sourceLabel = socialSourceLabel(social);

  return (
    <aside className="hidden w-[280px] shrink-0 flex-col border-l border-gray-200 bg-white lg:flex">
      <div className="border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Social Pulse</h2>
        <p className="text-xs text-gray-500">
          {selectedName} · Last 30 days
        </p>
        {sourceLabel && !loading && (
          <p
            className={`mt-1 text-[10px] ${
              social?.dataSource === "mock"
                ? "text-amber-600"
                : "text-teal-600"
            }`}
          >
            {sourceLabel}
          </p>
        )}
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
        {loading && (
          <p className="text-xs text-gray-400">Loading community feeds…</p>
        )}
        {error && (
          <p className="text-xs text-amber-600">{error}</p>
        )}

        {!loading && social && (
          <>
        <section>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            Sentiment
          </h3>
          <SentimentBar
            positive={social.positive}
            neutral={social.neutral}
            negative={social.negative}
          />
        </section>

        <section>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            6-Month Trend
          </h3>
          <SentimentTrend data={social.trend} />
        </section>

        <section>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            Keywords
          </h3>
          <KeywordTags keywords={social.keywords} />
        </section>

        {social.subreddits && social.subreddits.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
              Top Subreddits
            </h3>
            <SubredditList subreddits={social.subreddits} />
          </section>
        )}

        <section>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            Recent Mentions
          </h3>
          <RecentMentions mentions={social.mentions} />
        </section>
          </>
        )}
      </div>
    </aside>
  );
}
