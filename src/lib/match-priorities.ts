import type { MatchPriority } from "@/types";

export interface MatchPriorityOption {
  id: MatchPriority;
  label: string;
  description: string;
}

export const MATCH_PRIORITY_OPTIONS: MatchPriorityOption[] = [
  {
    id: "schools",
    label: "Good schools",
    description: "Nearby high schools and ratings",
  },
  {
    id: "parks",
    label: "Parks",
    description: "Green space within ~2 km",
  },
  {
    id: "dogFriendly",
    label: "Dog friendly",
    description: "Dog parks and pet-friendly green space",
  },
];

export const MATCH_PRIORITY_IDS = MATCH_PRIORITY_OPTIONS.map((o) => o.id);

export function isMatchPriority(value: unknown): value is MatchPriority {
  return (
    typeof value === "string" &&
    MATCH_PRIORITY_IDS.includes(value as MatchPriority)
  );
}
