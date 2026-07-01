"use client";

export function MapMatchButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute top-4 right-4 z-20 rounded-lg border border-teal-200 bg-teal-50/95 px-3 py-2 text-sm font-medium text-teal-700 shadow-lg backdrop-blur-sm transition-colors hover:bg-teal-100"
    >
      Find your match
    </button>
  );
}
