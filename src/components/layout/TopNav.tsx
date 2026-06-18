interface TopNavProps {
  location: string;
}

export function TopNav({ location }: TopNavProps) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-600">
            <svg
              className="h-4 w-4 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
          </div>
          <span className="text-lg font-semibold text-gray-900">Neighbourly</span>
        </div>
        <span className="text-gray-300">|</span>
        <span className="text-sm text-gray-600">{location}, San Francisco</span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
        >
          Share
        </button>
        <button
          type="button"
          disabled
          title="Coming in V2"
          className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-400 cursor-not-allowed"
        >
          Compare
        </button>
      </div>
    </header>
  );
}
