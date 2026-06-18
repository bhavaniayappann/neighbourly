export type ActiveLayer = "overview" | "income" | "schools" | "walk" | "rent";

export interface NeighbourhoodProperties {
  geoid: string;
  name: string;
  score: number;
}

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
  mentions: {
    text: string;
    sentiment: "positive" | "neutral" | "negative";
    timestamp: string;
    source: string;
  }[];
}
