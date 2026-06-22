import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/layout/AppShell";

interface PageProps {
  searchParams: { geoid?: string; name?: string; layer?: string };
}

export async function generateMetadata({
  searchParams,
}: PageProps): Promise<Metadata> {
  const name = searchParams.name ?? "Bay Area Census Tracts";
  const title = `${name} — Neighbourly`;
  const description = `Explore demographics, housing, schools, walkability, and social sentiment for ${name} in the Bay Area.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center text-sm text-gray-500">
          Loading Neighbourly…
        </div>
      }
    >
      <AppShell />
    </Suspense>
  );
}
