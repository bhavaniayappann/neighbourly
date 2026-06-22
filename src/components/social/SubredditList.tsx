interface SubredditListProps {
  subreddits: { name: string; count: number }[];
}

export function SubredditList({ subreddits }: SubredditListProps) {
  if (subreddits.length === 0) return null;

  return (
    <ul className="space-y-1.5">
      {subreddits.map((s) => (
        <li
          key={s.name}
          className="flex items-center justify-between text-xs text-gray-600"
        >
          <span className="font-medium text-gray-800">{s.name}</span>
          <span className="text-gray-400">{s.count} mentions</span>
        </li>
      ))}
    </ul>
  );
}
