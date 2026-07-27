"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useState } from "react";
import { AccountMenu } from "@/components/auth/AccountMenu";
import { SignInModal } from "@/components/auth/SignInModal";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store/useAppStore";
import { buildShareUrl } from "@/hooks/useUrlSync";

const NAV_ITEMS = [
  { href: "/", label: "Explore" },
  { href: "/my-house-search", label: "My House Search" },
] as const;

export function TopNav() {
  const pathname = usePathname();
  const isExplore = pathname === "/";
  const isHouseSearch = pathname.startsWith("/my-house-search");

  const { user, loading: authLoading, configured: authConfigured } = useAuth();
  const selectedNeighbourhoodId = useAppStore((s) => s.selectedNeighbourhoodId);
  const selectedGeoid = useAppStore((s) => s.selectedGeoid);
  const selectedName = useAppStore((s) => s.selectedName);
  const selectedCity = useAppStore((s) => s.selectedCity);
  const selectedCounty = useAppStore((s) => s.selectedCounty);
  const [copied, setCopied] = useState(false);
  const [signInOpen, setSignInOpen] = useState(false);

  const locationLabel =
    selectedCity && selectedName.toLowerCase() !== selectedCity.toLowerCase()
      ? `${selectedName}, ${selectedCity}`
      : selectedCity
        ? selectedCity
        : `${selectedName}, ${selectedCounty} County`;

  const handleShare = useCallback(async () => {
    const url = buildShareUrl(selectedNeighbourhoodId, selectedGeoid, selectedName);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }, [selectedNeighbourhoodId, selectedGeoid, selectedName]);

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4">
      <div className="flex min-w-0 items-center gap-3">
        <Link href="/" className="flex shrink-0 items-center gap-2">
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
        </Link>

        <span className="hidden text-gray-300 lg:inline">|</span>

        <nav className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => {
            const active =
              item.href === "/"
                ? isExplore
                : isHouseSearch;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-gray-100 text-gray-900"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {isExplore && (
          <>
            <span className="hidden text-gray-300 xl:inline">|</span>
            <span className="hidden truncate text-sm text-gray-600 xl:inline">
              {locationLabel}
            </span>
          </>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {isExplore && (
          <button
            type="button"
            onClick={handleShare}
            className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
          >
            {copied ? "Copied!" : "Share"}
          </button>
        )}

        {authConfigured && (
          <>
            {authLoading ? (
              <div
                className="h-9 w-20 animate-pulse rounded-lg bg-gray-100"
                aria-hidden="true"
              />
            ) : user ? (
              <AccountMenu />
            ) : (
              <button
                type="button"
                onClick={() => setSignInOpen(true)}
                className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-teal-700"
              >
                Sign in
              </button>
            )}
          </>
        )}
      </div>

      <SignInModal open={signInOpen} onClose={() => setSignInOpen(false)} />
    </header>
  );
}
