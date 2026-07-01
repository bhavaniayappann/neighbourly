"use client";

import { useState } from "react";
import { TopNav } from "./TopNav";
import { LeftSidebar } from "./LeftSidebar";
import { SocialPulsePanel } from "./SocialPulsePanel";
import { MobileSocialSheet } from "./MobileSocialSheet";
import { NeighbourhoodMap } from "@/components/map/NeighbourhoodMap";
import { MapMatchButton } from "@/components/map/MapMatchButton";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { MatchOverlay } from "@/components/match/MatchOverlay";
import { useUrlSync } from "@/hooks/useUrlSync";

export function AppShell() {
  const [mobileDataOpen, setMobileDataOpen] = useState(false);
  const [matchOpen, setMatchOpen] = useState(false);
  useUrlSync();

  return (
    <div className="flex h-screen flex-col bg-white">
      <TopNav />
      <div className="flex min-h-0 flex-1">
        <LeftSidebar className="hidden md:flex" />
        <main className="relative min-w-0 flex-1">
          <NeighbourhoodMap />
          <MapMatchButton onClick={() => setMatchOpen(true)} />
          {!matchOpen && <ChatWidget />}
          <MobileSocialSheet />

          <button
            type="button"
            onClick={() => setMobileDataOpen(true)}
            className="fixed bottom-4 left-4 z-20 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-lg md:hidden"
          >
            Area data
          </button>
        </main>
        <SocialPulsePanel />
      </div>

      {mobileDataOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/30"
            onClick={() => setMobileDataOpen(false)}
            aria-label="Close data panel"
          />
          <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-hidden rounded-t-2xl bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
              <p className="text-sm font-semibold text-gray-900">Area data</p>
              <button
                type="button"
                onClick={() => setMobileDataOpen(false)}
                className="text-sm text-gray-500"
              >
                Close
              </button>
            </div>
            <LeftSidebar className="flex max-h-[calc(80vh-52px)] w-full border-0" />
          </div>
        </div>
      )}

      {matchOpen && <MatchOverlay onClose={() => setMatchOpen(false)} />}
    </div>
  );
}
