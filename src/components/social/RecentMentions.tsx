interface Mention {
  text: string;
  sentiment: "positive" | "neutral" | "negative";
  timestamp: string;
  source: string;
}

const sentimentBorder: Record<Mention["sentiment"], string> = {
  positive: "border-l-teal-500",
  neutral: "border-l-gray-300",
  negative: "border-l-red-400",
};

interface RecentMentionsProps {
  mentions: Mention[];
}

export function RecentMentions({ mentions }: RecentMentionsProps) {
  return (
    <div className="space-y-3">
      {mentions.map((m, i) => (
        <blockquote
          key={i}
          className={`border-l-2 pl-3 ${sentimentBorder[m.sentiment]}`}
        >
          <p className="text-xs leading-relaxed text-gray-700">&ldquo;{m.text}&rdquo;</p>
          <footer className="mt-1 text-[10px] text-gray-400">
            {m.source} · {m.timestamp}
          </footer>
        </blockquote>
      ))}
    </div>
  );
}
