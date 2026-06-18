"use client";

import { useAppStore } from "@/store/useAppStore";
import { TopNav } from "./TopNav";
import { LeftSidebar } from "./LeftSidebar";
import { SocialPulsePanel } from "./SocialPulsePanel";
import { NeighbourhoodMap } from "@/components/map/NeighbourhoodMap";

export function AppShell() {
  const selectedName = useAppStore((s) => s.selectedName);

  return (
    <div className="flex h-screen flex-col bg-white">
      <TopNav location={selectedName} />
      <div className="flex min-h-0 flex-1">
        <LeftSidebar />
        <main className="relative min-w-0 flex-1">
          <NeighbourhoodMap />
        </main>
        <SocialPulsePanel />
      </div>
    </div>
  );
}
