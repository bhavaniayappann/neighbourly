interface SentimentBarProps {
  positive: number;
  neutral: number;
  negative: number;
}

export function SentimentBar({ positive, neutral, negative }: SentimentBarProps) {
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded-full">
        <div
          className="bg-teal-500"
          style={{ width: `${positive}%` }}
          title={`Positive ${positive}%`}
        />
        <div
          className="bg-gray-300"
          style={{ width: `${neutral}%` }}
          title={`Neutral ${neutral}%`}
        />
        <div
          className="bg-red-400"
          style={{ width: `${negative}%` }}
          title={`Negative ${negative}%`}
        />
      </div>
      <div className="mt-2 flex justify-between text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-teal-500" />
          {positive}% Positive
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-gray-300" />
          {neutral}%
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-red-400" />
          {negative}%
        </span>
      </div>
    </div>
  );
}
