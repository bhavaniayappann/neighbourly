export type ActiveLayer = "overview" | "income" | "schools" | "walk" | "rent";

export interface NeighbourhoodProperties {
  geoid: string;
  name: string;
  city?: string;
  county?: string;
  score?: number;
  fillColor?: string;
}

export interface CensusTractData {
  geoid: string;
  name: string;
  population: number;
  medianIncome: number;
  medianRent: number;
  medianHomeValue: number;
  bachelorsPlus: number;
}

export type TractCensusMap = Record<string, CensusTractData>;

export interface DemographicsData {
  population: number;
  medianAge: number;
  medianIncome: number;
  bachelorsPlus: number;
  householdSize: number;
}

export interface SchoolsData {
  avgRating: number;
  elementaryCount: number;
  middleCount: number;
  highCount: number;
  topSchool: string;
}

export interface HousingData {
  medianRent: number;
  medianHomeValue: number;
  vacancyRate: number;
  ownerOccupied: number;
  renterOccupied: number;
}

export interface CommuteData {
  avgCommuteMins: number;
  transitPct: number;
  walkPct: number;
  drivePct: number;
  workFromHomePct: number;
}

export interface WalkabilityData {
  walkScore: number;
  transitScore: number;
  bikeScore: number;
}

export interface NeighbourhoodData {
  geoid: string;
  name: string;
  demographics: DemographicsData;
  schools: SchoolsData;
  housing: HousingData;
  commute: CommuteData;
  walkability: WalkabilityData;
}

export interface SocialPulseData {
  positive: number;
  neutral: number;
  negative: number;
  trend: number[];
  keywords: { label: string; count: number; sentiment: "positive" | "negative" }[];
  subreddits?: { name: string; count: number }[];
  mentions: {
    text: string;
    sentiment: "positive" | "neutral" | "negative";
    timestamp: string;
    source: string;
  }[];
  /** live = real feeds; mock = placeholder; estimates = AI/heuristic from real snippets */
  dataSource?: "live" | "mock" | "estimates";
}

export type MatchPriority = "schools" | "parks" | "dogFriendly";

export type HousingGoal = "buy" | "rent" | "both";

export interface MatchPreferences {
  housingGoal: HousingGoal;
  budgetHome: number | null;
  budgetRent: number | null;
  kids: number | null;
  commuteDestination: string;
  priorities: MatchPriority[];
}

export interface MatchScoreBreakdown {
  home: number | null;
  rent: number | null;
  schools: number;
  parks: number;
  dogFriendly: number;
  commute: number;
}

export interface MatchCandidateMetrics {
  medianHomeValue: number;
  medianRent: number;
  schoolRating: number;
  highSchoolCount: number;
  parkCount: number;
  dogParkCount: number;
  commuteMinutes: number;
  topSchool: string;
}

export interface MatchResult {
  id: string;
  displayName: string;
  city: string;
  county: string;
  source: "curated" | "city";
  neighbourhoodId: string | null;
  geoid: string;
  bbox: [number, number, number, number];
  centroid: [number, number];
  score: number;
  breakdown: MatchScoreBreakdown;
  metrics: MatchCandidateMetrics;
  reasoning: string;
}

export interface MatchCandidate {
  id: string;
  displayName: string;
  city: string;
  county: string;
  source: "curated" | "city";
  neighbourhoodId: string | null;
  centroid: [number, number];
  bbox: [number, number, number, number];
  primaryGeoid: string;
  tractGeoids: string[];
}
