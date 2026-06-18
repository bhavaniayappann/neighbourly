interface Keyword {
  label: string;
  count: number;
  sentiment: "positive" | "negative";
}

interface KeywordTagsProps {
  keywords: Keyword[];
}

export function KeywordTags({ keywords }: KeywordTagsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {keywords.map((kw) => (
        <span
          key={kw.label}
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
            kw.sentiment === "positive"
              ? "bg-teal-50 text-teal-700"
              : "bg-red-50 text-red-600"
          }`}
        >
          {kw.label}
          <span className="opacity-60">{kw.count}</span>
        </span>
      ))}
    </div>
  );
}
