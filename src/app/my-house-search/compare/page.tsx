import type { Metadata } from "next";
import { HouseCompareView } from "@/components/house-search/HouseCompareView";

export const metadata: Metadata = {
  title: "Compare Homes — Neighbourly",
  description: "Compare saved homes side by side with custom criteria.",
};

interface ComparePageProps {
  searchParams: { ids?: string };
}

export default function ComparePage({ searchParams }: ComparePageProps) {
  const houseIds = searchParams.ids
    ? searchParams.ids.split(",").map((id) => id.trim()).filter(Boolean)
    : [];

  return <HouseCompareView houseIds={houseIds} />;
}
