import type { NeighbourhoodData, SocialPulseData } from "@/types";

export const MOCK_NEIGHBOURHOODS: Record<string, NeighbourhoodData> = {
  "06075020800": {
    geoid: "06075020800",
    name: "Mission District",
    demographics: {
      population: 58234,
      medianAge: 34.2,
      medianIncome: 112450,
      bachelorsPlus: 48,
      householdSize: 2.4,
    },
    schools: {
      avgRating: 7.2,
      elementaryCount: 8,
      middleCount: 2,
      highCount: 3,
      topSchool: "Mission High School",
    },
    housing: {
      medianRent: 3200,
      medianHomeValue: 1250000,
      vacancyRate: 4.2,
      ownerOccupied: 32,
      renterOccupied: 68,
    },
    commute: {
      avgCommuteMins: 28,
      transitPct: 42,
      walkPct: 18,
      drivePct: 28,
      workFromHomePct: 12,
    },
    walkability: {
      walkScore: 98,
      transitScore: 92,
      bikeScore: 85,
    },
  },
  "06075010102": {
    geoid: "06075010102",
    name: "Castro",
    demographics: {
      population: 12450,
      medianAge: 38.5,
      medianIncome: 128900,
      bachelorsPlus: 62,
      householdSize: 1.8,
    },
    schools: {
      avgRating: 8.1,
      elementaryCount: 3,
      middleCount: 1,
      highCount: 1,
      topSchool: "Harvey Milk Civil Rights Academy",
    },
    housing: {
      medianRent: 3450,
      medianHomeValue: 1380000,
      vacancyRate: 3.8,
      ownerOccupied: 38,
      renterOccupied: 62,
    },
    commute: {
      avgCommuteMins: 26,
      transitPct: 48,
      walkPct: 22,
      drivePct: 22,
      workFromHomePct: 8,
    },
    walkability: {
      walkScore: 97,
      transitScore: 95,
      bikeScore: 88,
    },
  },
  "06075022802": {
    geoid: "06075022802",
    name: "Noe Valley",
    demographics: {
      population: 22100,
      medianAge: 36.8,
      medianIncome: 198500,
      bachelorsPlus: 72,
      householdSize: 2.2,
    },
    schools: {
      avgRating: 9.2,
      elementaryCount: 4,
      middleCount: 1,
      highCount: 1,
      topSchool: "James Lick Middle School",
    },
    housing: {
      medianRent: 4200,
      medianHomeValue: 1850000,
      vacancyRate: 2.1,
      ownerOccupied: 58,
      renterOccupied: 42,
    },
    commute: {
      avgCommuteMins: 32,
      transitPct: 35,
      walkPct: 12,
      drivePct: 38,
      workFromHomePct: 15,
    },
    walkability: {
      walkScore: 89,
      transitScore: 78,
      bikeScore: 72,
    },
  },
  "06075020300": {
    geoid: "06075020300",
    name: "Haight-Ashbury",
    demographics: {
      population: 15800,
      medianAge: 33.1,
      medianIncome: 98500,
      bachelorsPlus: 55,
      householdSize: 1.9,
    },
    schools: {
      avgRating: 7.8,
      elementaryCount: 2,
      middleCount: 1,
      highCount: 1,
      topSchool: "Grattan Elementary",
    },
    housing: {
      medianRent: 3100,
      medianHomeValue: 1420000,
      vacancyRate: 5.1,
      ownerOccupied: 28,
      renterOccupied: 72,
    },
    commute: {
      avgCommuteMins: 27,
      transitPct: 45,
      walkPct: 20,
      drivePct: 25,
      workFromHomePct: 10,
    },
    walkability: {
      walkScore: 96,
      transitScore: 88,
      bikeScore: 90,
    },
  },
  "06075002601": {
    geoid: "06075002601",
    name: "SOMA",
    demographics: {
      population: 34500,
      medianAge: 32.4,
      medianIncome: 134200,
      bachelorsPlus: 58,
      householdSize: 1.7,
    },
    schools: {
      avgRating: 6.5,
      elementaryCount: 4,
      middleCount: 2,
      highCount: 2,
      topSchool: "Bessie Carmichael School",
    },
    housing: {
      medianRent: 3800,
      medianHomeValue: 1100000,
      vacancyRate: 6.8,
      ownerOccupied: 22,
      renterOccupied: 78,
    },
    commute: {
      avgCommuteMins: 24,
      transitPct: 52,
      walkPct: 25,
      drivePct: 15,
      workFromHomePct: 8,
    },
    walkability: {
      walkScore: 99,
      transitScore: 98,
      bikeScore: 82,
    },
  },
  "06075040100": {
    geoid: "06075040100",
    name: "North Beach",
    demographics: {
      population: 11200,
      medianAge: 42.3,
      medianIncome: 118600,
      bachelorsPlus: 52,
      householdSize: 1.6,
    },
    schools: {
      avgRating: 8.4,
      elementaryCount: 2,
      middleCount: 0,
      highCount: 1,
      topSchool: "Francisco Middle School",
    },
    housing: {
      medianRent: 2900,
      medianHomeValue: 1280000,
      vacancyRate: 4.5,
      ownerOccupied: 35,
      renterOccupied: 65,
    },
    commute: {
      avgCommuteMins: 25,
      transitPct: 40,
      walkPct: 30,
      drivePct: 22,
      workFromHomePct: 8,
    },
    walkability: {
      walkScore: 98,
      transitScore: 90,
      bikeScore: 75,
    },
  },
  "06075011901": {
    geoid: "06075011901",
    name: "Pacific Heights",
    demographics: {
      population: 21400,
      medianAge: 40.1,
      medianIncome: 245000,
      bachelorsPlus: 78,
      householdSize: 2.0,
    },
    schools: {
      avgRating: 9.5,
      elementaryCount: 3,
      middleCount: 1,
      highCount: 1,
      topSchool: "Sherman Elementary",
    },
    housing: {
      medianRent: 4500,
      medianHomeValue: 2200000,
      vacancyRate: 2.5,
      ownerOccupied: 52,
      renterOccupied: 48,
    },
    commute: {
      avgCommuteMins: 26,
      transitPct: 28,
      walkPct: 15,
      drivePct: 45,
      workFromHomePct: 12,
    },
    walkability: {
      walkScore: 92,
      transitScore: 85,
      bikeScore: 70,
    },
  },
  "06075015301": {
    geoid: "06075015301",
    name: "Richmond",
    demographics: {
      population: 67200,
      medianAge: 37.2,
      medianIncome: 118300,
      bachelorsPlus: 54,
      householdSize: 2.3,
    },
    schools: {
      avgRating: 8.0,
      elementaryCount: 6,
      middleCount: 2,
      highCount: 2,
      topSchool: "George Washington High School",
    },
    housing: {
      medianRent: 2800,
      medianHomeValue: 1350000,
      vacancyRate: 3.9,
      ownerOccupied: 42,
      renterOccupied: 58,
    },
    commute: {
      avgCommuteMins: 30,
      transitPct: 38,
      walkPct: 14,
      drivePct: 35,
      workFromHomePct: 13,
    },
    walkability: {
      walkScore: 88,
      transitScore: 72,
      bikeScore: 78,
    },
  },
};

export const MOCK_SOCIAL: Record<string, SocialPulseData> = {
  "06075020800": {
    positive: 50,
    neutral: 25,
    negative: 25,
    trend: [42, 45, 48, 46, 50, 52],
    keywords: [
      { label: "great food", count: 34, sentiment: "positive" },
      { label: "vibrant", count: 28, sentiment: "positive" },
      { label: "gentrification", count: 22, sentiment: "negative" },
      { label: "nightlife", count: 19, sentiment: "positive" },
      { label: "expensive", count: 17, sentiment: "negative" },
      { label: "diverse", count: 15, sentiment: "positive" },
    ],
    mentions: [
      {
        text: "The Mission has the best burritos in the city, hands down.",
        sentiment: "positive",
        timestamp: "2d ago",
        source: "r/sanfrancisco",
      },
      {
        text: "Rent keeps going up but the community feel is still there.",
        sentiment: "neutral",
        timestamp: "4d ago",
        source: "r/AskSF",
      },
      {
        text: "Valencia Street on a Saturday is unbeatable.",
        sentiment: "positive",
        timestamp: "1w ago",
        source: "r/sanfrancisco",
      },
    ],
  },
};

export function getNeighbourhoodData(geoid: string): NeighbourhoodData {
  return MOCK_NEIGHBOURHOODS[geoid] ?? MOCK_NEIGHBOURHOODS["06075020800"];
}

export function getSocialData(geoid: string): SocialPulseData {
  return (
    MOCK_SOCIAL[geoid] ?? {
      positive: 45,
      neutral: 30,
      negative: 25,
      trend: [40, 42, 44, 43, 45, 47],
      keywords: [
        { label: "friendly", count: 12, sentiment: "positive" },
        { label: "quiet", count: 8, sentiment: "positive" },
        { label: "parking", count: 6, sentiment: "negative" },
      ],
      mentions: [
        {
          text: "Nice neighbourhood with good transit access.",
          sentiment: "positive",
          timestamp: "3d ago",
          source: "r/sanfrancisco",
        },
        {
          text: "Getting more crowded every year.",
          sentiment: "neutral",
          timestamp: "5d ago",
          source: "r/AskSF",
        },
        {
          text: "Love the local coffee shops here.",
          sentiment: "positive",
          timestamp: "1w ago",
          source: "r/sanfrancisco",
        },
      ],
    }
  );
}
