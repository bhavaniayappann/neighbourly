import type { NeighbourhoodData, SocialPulseData } from "@/types";

/** Generic placeholder when live schools/walk/commute APIs are unavailable. */
export const GENERIC_MOCK: NeighbourhoodData = {
  geoid: "generic",
  name: "Bay Area Tract",
  demographics: {
    population: 0,
    medianAge: 36,
    medianIncome: 0,
    bachelorsPlus: 0,
    householdSize: 2.2,
  },
  schools: {
    avgRating: 7.0,
    elementaryCount: 3,
    middleCount: 1,
    highCount: 1,
    topSchool: "Local public schools",
  },
  housing: {
    medianRent: 0,
    medianHomeValue: 950000,
    vacancyRate: 4.0,
    ownerOccupied: 45,
    renterOccupied: 55,
  },
  commute: {
    avgCommuteMins: 28,
    transitPct: 15,
    walkPct: 8,
    drivePct: 62,
    workFromHomePct: 15,
  },
  walkability: {
    walkScore: 65,
    transitScore: 55,
    bikeScore: 60,
  },
};

export function getNeighbourhoodData(_geoid: string): NeighbourhoodData {
  return { ...GENERIC_MOCK, geoid: _geoid };
}

export function getSocialData(geoid: string): SocialPulseData {
  void geoid;
  return {
    positive: 45,
    neutral: 30,
    negative: 25,
    trend: [40, 42, 44, 43, 45, 47],
    keywords: [
      { label: "friendly", count: 12, sentiment: "positive" },
      { label: "transit", count: 10, sentiment: "positive" },
      { label: "expensive", count: 8, sentiment: "negative" },
    ],
    mentions: [
      {
        text: "Nice area with reasonable transit access.",
        sentiment: "positive",
        timestamp: "3d ago",
        source: "r/bayarea",
      },
      {
        text: "Housing costs keep climbing across the region.",
        sentiment: "neutral",
        timestamp: "5d ago",
        source: "r/AskSF",
      },
      {
        text: "Good access to parks and local amenities.",
        sentiment: "positive",
        timestamp: "1w ago",
        source: "r/sanfrancisco",
      },
    ],
  };
}
