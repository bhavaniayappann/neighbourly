"use client";

import { useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useSocialData, socialSourceLabel } from "@/hooks/useSocialData";
import { SentimentBar } from "@/components/social/SentimentBar";
import { SentimentTrend } from "@/components/social/SentimentTrend";
import { KeywordTags } from "@/components/social/KeywordTags";
import { RecentMentions } from "@/components/social/RecentMentions";

export function MobileSocialSheet() {
  const [open, setOpen] = useState(false);
  const selectedGeoid = useAppStore((s) => s.selectedGeoid);
  const selectedName = useAppStore((s) => s.selectedName);
  const { data: social, loading, error } = useSocialData(selectedGeoid);
  const sourceLabel = socialSourceLabel(social);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-20 rounded-full bg-teal-600 px-4 py-2 text-sm font-medium text-white shadow-lg lg:hidden"
      >
        Social Pulse
      </button>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
            aria-label="Close social panel"
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[70vh] overflow-y-auto rounded-t-2xl bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-gray-900">
                  Social Pulse
                </h2>
                <p className="text-xs text-gray-500">{selectedName}</p>
                {sourceLabel && !loading && (
                  <p className="mt-0.5 text-[10px] text-teal-600">
                    {sourceLabel}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-gray-400"
              >
                Close
              </button>
            </div>
            {loading && (
              <p className="text-xs text-gray-400">Loading community feeds…</p>
            )}
            {error && (
              <p className="text-xs text-amber-600">{error}</p>
            )}
            {social && (
              <div className="space-y-5">
                <SentimentBar
                  positive={social.positive}
                  neutral={social.neutral}
                  negative={social.negative}
                />
                <SentimentTrend data={social.trend} />
                <KeywordTags keywords={social.keywords} />
                <RecentMentions mentions={social.mentions} />
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
