"use client";

import { useAppStore } from "@/store/useAppStore";
import { getSocialData } from "@/lib/mock-data";
import { SentimentBar } from "@/components/social/SentimentBar";
import { SentimentTrend } from "@/components/social/SentimentTrend";
import { KeywordTags } from "@/components/social/KeywordTags";
import { RecentMentions } from "@/components/social/RecentMentions";

export function SocialPulsePanel() {
  const selectedGeoid = useAppStore((s) => s.selectedGeoid);
  const selectedName = useAppStore((s) => s.selectedName);
  const social = getSocialData(selectedGeoid);

  return (
    <aside className="flex w-[280px] shrink-0 flex-col border-l border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-gray-900">Social Pulse</h2>
        <p className="text-xs text-gray-500">{selectedName}</p>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto p-4">
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

        <section>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            Recent Mentions
          </h3>
          <RecentMentions mentions={social.mentions} />
        </section>
      </div>
    </aside>
  );
}
