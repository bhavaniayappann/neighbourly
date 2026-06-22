"use client";

import { useState } from "react";
import { ChatPanel } from "./ChatPanel";

export function ChatWidget() {
  const [expanded, setExpanded] = useState(false);

  if (expanded) {
    return (
      <div className="absolute bottom-4 right-4 z-30">
        <ChatPanel onClose={() => setExpanded(false)} />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setExpanded(true)}
      className="absolute bottom-4 right-4 z-30 flex items-center gap-2 rounded-full border border-gray-200 bg-white/95 px-4 py-2.5 text-sm text-gray-600 shadow-lg backdrop-blur-sm transition hover:border-teal-300 hover:text-teal-700"
    >
      <svg
        className="h-4 w-4 text-teal-600"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
      Ask about this area…
    </button>
  );
}
