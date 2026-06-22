"use client";

import { useEffect, useRef, useState } from "react";
import { useAppStore } from "@/store/useAppStore";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
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
      const json = (await res.json()) as { reply?: string; error?: string };
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: json.reply ?? json.error ?? "Something went wrong.",
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
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
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
