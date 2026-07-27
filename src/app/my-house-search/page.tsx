import type { Metadata } from "next";
import { HouseSearchShell } from "@/components/house-search/HouseSearchShell";

export const metadata: Metadata = {
  title: "My House Search — Neighbourly",
  description:
    "Track homes you have visited or plan to visit during your Bay Area house search.",
};

export default function MyHouseSearchPage() {
  return <HouseSearchShell />;
}
