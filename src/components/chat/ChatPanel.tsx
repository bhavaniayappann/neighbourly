"use client";

import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/store/useAppStore";
import type { ChatSource } from "@/types";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: ChatSource[];
  ragUsed?: boolean;
}

export function ChatPanel({ onClose }: { onClose: () => void }) {
  const selectedGeoid = useAppStore((s) => s.selectedGeoid);
  const selectedName = useAppStore((s) => s.selectedName);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [summaryLoaded, setSummaryLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMessages([]);
    setSummaryLoaded(false);
  }, [selectedGeoid]);

  useEffect(() => {
    if (summaryLoaded) return;

    async function loadSummary() {
      try {
        const res = await fetch(`/api/summary/${selectedGeoid}`);
        if (!res.ok) return;
        const { summary } = (await res.json()) as { summary: string };
        setMessages([{ role: "assistant", content: summary }]);
        setSummaryLoaded(true);
      } catch {
        setMessages([
          {
            role: "assistant",
            content: `Ask me anything about ${selectedName}. I can help with housing, commute, schools, and neighbourhood facts.`,
          },
        ]);
        setSummaryLoaded(true);
      }
    }

    loadSummary();
  }, [selectedGeoid, selectedName, summaryLoaded]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages, loading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ geoid: selectedGeoid, messages: nextMessages }),
      });
      const json = (await res.json()) as {
        reply?: string;
        error?: string;
        sources?: ChatSource[];
        ragUsed?: boolean;
      };
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: json.reply ?? json.error ?? "Something went wrong.",
          sources: json.sources,
          ragUsed: json.ragUsed,
        },
      ]);
    } catch {
      setMessages([
        ...nextMessages,
        { role: "assistant", content: "Failed to reach the chat service." },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[480px] w-[480px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-gray-900">Ask about this area</p>
          <p className="text-xs text-gray-500">{selectedName}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Close chat"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
          >
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                msg.role === "user"
                  ? "bg-teal-600 text-white"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {msg.content}
            </div>
            {msg.role === "assistant" && msg.ragUsed && (
              <p className="mt-1 text-[10px] font-medium uppercase tracking-wide text-teal-600">
                Grounded in community posts
              </p>
            )}
            {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
              <div className="mt-2 max-w-[95%]">
                <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-gray-400">
                  Sources
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {msg.sources.map((source) => (
                    <SourceChip key={source.index} source={source} />
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-500">
              Thinking…
            </div>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="border-t border-gray-100 p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about this area…"
            className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </form>
    </div>
  );
}

function SourceChip({ source }: { source: ChatSource }) {
  const label = `${source.source}: ${source.excerpt.slice(0, 60)}${source.excerpt.length > 60 ? "…" : ""}`;
  const className =
    "inline-flex max-w-full items-center gap-1 rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[11px] text-gray-600 hover:border-teal-300 hover:text-teal-700";

  if (source.permalink) {
    return (
      <a
        href={source.permalink}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        title={source.excerpt}
      >
        <span className="font-medium text-teal-600">[{source.index}]</span>
        <span className="truncate">{label}</span>
      </a>
    );
  }

  return (
    <span className={className} title={source.excerpt}>
      <span className="font-medium text-teal-600">[{source.index}]</span>
      <span className="truncate">{label}</span>
    </span>
  );
}
