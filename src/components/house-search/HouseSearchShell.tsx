"use client";

import { useState } from "react";
import { TopNav } from "@/components/layout/TopNav";
import { HouseDetailPanel } from "@/components/house-search/HouseDetailPanel";
import { HouseListPanel } from "@/components/house-search/HouseListPanel";
import { HouseSearchMap } from "@/components/house-search/HouseSearchMap";
import { SignInPrompt } from "@/components/house-search/SignInPrompt";
import { useAuth } from "@/hooks/useAuth";
import { useHouseTracker } from "@/hooks/useHouseTracker";

export function HouseSearchShell() {
  const { user, loading: authLoading } = useAuth();
  useHouseTracker();

  const [mobileListOpen, setMobileListOpen] = useState(false);
  const [mobileDetailOpen, setMobileDetailOpen] = useState(false);

  if (authLoading) {
    return (
      <div className="flex h-screen flex-col bg-white">
        <TopNav />
        <div className="flex flex-1 items-center justify-center text-sm text-gray-500">
          Loading…
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-screen flex-col bg-white">
        <TopNav />
        <SignInPrompt />
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-white">
      <TopNav />
      <div className="flex min-h-0 flex-1">
        <HouseListPanel className="hidden md:flex" />
        <main className="relative min-w-0 flex-1">
          <HouseSearchMap />

          <div className="absolute bottom-4 left-4 z-20 flex gap-2 md:hidden">
            <button
              type="button"
              onClick={() => setMobileListOpen(true)}
              className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-lg"
            >
              Homes
            </button>
            <button
              type="button"
              onClick={() => setMobileDetailOpen(true)}
              className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-lg"
            >
              Details
            </button>
          </div>
        </main>
        <HouseDetailPanel className="hidden md:flex" />
      </div>

      {mobileListOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileListOpen(false)}
            aria-label="Close homes list"
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-hidden rounded-t-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <p className="text-sm font-semibold text-gray-900">Saved homes</p>
              <button
                type="button"
                onClick={() => setMobileListOpen(false)}
                className="text-sm text-gray-500"
              >
                Close
              </button>
            </div>
            <HouseListPanel className="flex max-h-[calc(80vh-52px)] w-full border-0" />
          </div>
        </div>
      )}

      {mobileDetailOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileDetailOpen(false)}
            aria-label="Close house details"
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-hidden rounded-t-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <p className="text-sm font-semibold text-gray-900">House details</p>
              <button
                type="button"
                onClick={() => setMobileDetailOpen(false)}
                className="text-sm text-gray-500"
              >
                Close
              </button>
            </div>
            <HouseDetailPanel className="flex max-h-[calc(80vh-52px)] w-full border-0" />
          </div>
        </div>
      )}
    </div>
  );
}
