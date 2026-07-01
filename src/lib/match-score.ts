import type {
  MatchCandidate,
  MatchCandidateMetrics,
  MatchPreferences,
  MatchResult,
  MatchScoreBreakdown,
} from "@/types";
import type { CensusTractData } from "@/types";
import { fetchCountyCensus, fetchTractsByGeoids } from "./census";
import { estimateCommuteMinutes } from "./commute-estimate";
import { geocodeDestination } from "./commute";
import { getMatchCandidates } from "./match-catalog";
import { getDogFriendlyCountForPoint } from "./dog-friendly";
import { getParkCountForPoint } from "./parks";
import { BAY_AREA_COUNTY_FIPS } from "./regions";
import {
  getSchoolsForGeoid,
  getSchoolsForNeighbourhood,
} from "./schools";
import {
  combinedHousingScore,
  scoreHousingBreakdown,
} from "./match-housing";

const MATCH_COUNTY_FIPS = BAY_AREA_COUNTY_FIPS.filter((fips) =>
  ["06001", "06013", "06085"].includes(fips)
);

const FINAL_TOP_N = 3;
const ENRICH_TIMEOUT_MS = 12_000;

export interface ScoredCandidate {
  candidate: MatchCandidate;
  metrics: MatchCandidateMetrics;
  breakdown: MatchScoreBreakdown;
  score: number;
}

async function loadCensusMap(
  candidates: MatchCandidate[]
): Promise<Map<string, CensusTractData>> {
  const map = new Map<string, CensusTractData>();

  const countyResults = await Promise.all(
    MATCH_COUNTY_FIPS.map((fips) => fetchCountyCensus(fips))
  );
  for (const tracts of countyResults) {
    for (const tract of tracts) {
      map.set(tract.geoid, tract);
    }
  }

  if (map.size > 0) return map;

  const allGeoids = Array.from(
    new Set(candidates.flatMap((c) => c.tractGeoids))
  );
  const tracts = await fetchTractsByGeoids(allGeoids);
  for (const tract of tracts) {
    map.set(tract.geoid, tract);
  }
  return map;
}

function aggregateHomeValue(
  candidate: MatchCandidate,
  censusMap: Map<string, CensusTractData>
): number {
  const tracts = candidate.tractGeoids
    .map((geoid) => censusMap.get(geoid))
    .filter((t): t is CensusTractData => Boolean(t));

  if (tracts.length === 0) return 0;

  const totalPop = tracts.reduce((s, t) => s + t.population, 0);
  if (totalPop > 0) {
    return Math.round(
      tracts.reduce(
        (s, t) => s + t.medianHomeValue * Math.max(t.population, 1),
        0
      ) / totalPop
    );
  }

  return Math.round(
    tracts.reduce((s, t) => s + t.medianHomeValue, 0) / tracts.length
  );
}

function normalizeValues(values: number[], higherIsBetter = true): number[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) return values.map(() => 50);

  return values.map((v) => {
    const normalized = ((v - min) / (max - min)) * 100;
    return higherIsBetter ? normalized : 100 - normalized;
  });
}

function aggregateMedianRent(
  candidate: MatchCandidate,
  censusMap: Map<string, CensusTractData>
): number {
  const tracts = candidate.tractGeoids
    .map((geoid) => censusMap.get(geoid))
    .filter((t): t is CensusTractData => Boolean(t));

  if (tracts.length === 0) return 0;

  const totalPop = tracts.reduce((s, t) => s + t.population, 0);
  if (totalPop > 0) {
    return Math.round(
      tracts.reduce(
        (s, t) => s + t.medianRent * Math.max(t.population, 1),
        0
      ) / totalPop
    );
  }

  return Math.round(
    tracts.reduce((s, t) => s + t.medianRent, 0) / tracts.length
  );
}

const PRIORITY_BASE_WEIGHTS: Record<
  import("@/types").MatchPriority,
  number
> = {
  schools: 0.35,
  parks: 0.25,
  dogFriendly: 0.2,
};

function computeWeights(preferences: MatchPreferences): {
  housing: number;
  schools: number;
  parks: number;
  dogFriendly: number;
  commute: number;
} {
  const housingBase = 0.28;
  const commuteBase = 0.22;
  const flex = 1 - housingBase - commuteBase;
  const active = preferences.priorities;
  const kidsBoost =
    preferences.kids !== null && preferences.kids > 0 ? 1.25 : 1;

  if (active.length === 0) {
    const total = housingBase + commuteBase;
    return {
      housing: housingBase / total,
      commute: commuteBase / total,
      schools: 0,
      parks: 0,
      dogFriendly: 0,
    };
  }

  const raw = active.map((priority) => {
    let weight = PRIORITY_BASE_WEIGHTS[priority];
    if (priority === "schools") weight *= kidsBoost;
    return weight;
  });
  const rawTotal = raw.reduce((sum, w) => sum + w, 0);

  const weights = {
    housing: housingBase,
    commute: commuteBase,
    schools: 0,
    parks: 0,
    dogFriendly: 0,
  };

  active.forEach((priority, i) => {
    weights[priority] = (raw[i]! / rawTotal) * flex;
  });

  return weights;
}

function buildBreakdown(
  metrics: MatchCandidateMetrics,
  allMetrics: MatchCandidateMetrics[],
  preferences: MatchPreferences,
  weights: {
    housing: number;
    schools: number;
    parks: number;
    dogFriendly: number;
    commute: number;
  }
): { breakdown: MatchScoreBreakdown; score: number } {
  const schoolRatings = allMetrics.map((m) => m.schoolRating);
  const parkCounts = allMetrics.map((m) => m.parkCount);
  const dogCounts = allMetrics.map((m) => m.dogParkCount);
  const commuteMins = allMetrics.map((m) => m.commuteMinutes);

  const schoolsNorm =
    normalizeValues(schoolRatings)[
      schoolRatings.indexOf(metrics.schoolRating)
    ] ?? 50;
  const parksNorm =
    normalizeValues(parkCounts)[parkCounts.indexOf(metrics.parkCount)] ?? 50;
  const dogNorm =
    normalizeValues(dogCounts)[dogCounts.indexOf(metrics.dogParkCount)] ?? 50;
  const commuteNorm =
    normalizeValues(commuteMins, false)[
      commuteMins.indexOf(metrics.commuteMinutes)
    ] ?? 50;

  const housingParts = scoreHousingBreakdown(metrics, preferences);
  const housingCombined = combinedHousingScore(housingParts);

  const breakdown: MatchScoreBreakdown = {
    home: housingParts.home,
    rent: housingParts.rent,
    schools: Math.round(schoolsNorm),
    parks: Math.round(parksNorm),
    dogFriendly: Math.round(dogNorm),
    commute: Math.round(commuteNorm),
  };

  const score =
    housingCombined * weights.housing +
    breakdown.schools * weights.schools +
    breakdown.parks * weights.parks +
    breakdown.dogFriendly * weights.dogFriendly +
    breakdown.commute * weights.commute;

  return { breakdown, score: Math.round(score) };
}

function baseMetrics(
  candidate: MatchCandidate,
  commuteDest: { lat: number; lng: number },
  medianHomeValue: number,
  medianRent: number
): MatchCandidateMetrics {
  const [lng, lat] = candidate.centroid;
  return {
    medianHomeValue,
    medianRent,
    schoolRating: 7,
    highSchoolCount: 0,
    parkCount: 0,
    dogParkCount: 0,
    commuteMinutes: estimateCommuteMinutes(
      lng,
      lat,
      commuteDest.lng,
      commuteDest.lat
    ),
    topSchool: "—",
  };
}

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

async function enrichCandidateMetrics(
  candidate: MatchCandidate,
  base: MatchCandidateMetrics,
  preferences: MatchPreferences
): Promise<MatchCandidateMetrics> {
  const wantsSchools =
    preferences.priorities.includes("schools") ||
    (preferences.kids !== null && preferences.kids > 0);
  const wantsParks = preferences.priorities.includes("parks");
  const wantsDogFriendly = preferences.priorities.includes("dogFriendly");

  const fallback = {
    ...base,
    topSchool: wantsSchools ? "Local schools nearby" : base.topSchool,
  };

  return withTimeout(
    (async () => {
      const [lng, lat] = candidate.centroid;
      const radius = candidate.source === "curated" ? 2000 : 2500;

      const [schools, parkCount, dogParkCount] = await Promise.all([
        wantsSchools
          ? candidate.neighbourhoodId
            ? getSchoolsForNeighbourhood(candidate.neighbourhoodId)
            : getSchoolsForGeoid(candidate.primaryGeoid)
          : Promise.resolve(null),
        wantsParks
          ? getParkCountForPoint(`parks:${candidate.id}`, lat, lng, radius)
          : Promise.resolve(0),
        wantsDogFriendly
          ? getDogFriendlyCountForPoint(
              `dog:${candidate.id}`,
              lat,
              lng,
              radius + 500
            )
          : Promise.resolve(0),
      ]);

      return {
        ...base,
        schoolRating: schools?.avgRating ?? base.schoolRating,
        highSchoolCount: schools?.highCount ?? base.highSchoolCount,
        parkCount,
        dogParkCount,
        topSchool: schools?.topSchool ?? fallback.topSchool,
      };
    })(),
    ENRICH_TIMEOUT_MS,
    fallback
  );
}

export async function scoreMatchCandidates(
  preferences: MatchPreferences
): Promise<{ scored: ScoredCandidate[]; commuteDest: { lat: number; lng: number } }> {
  const commuteDest = await geocodeDestination(preferences.commuteDestination);
  if (!commuteDest) {
    throw new Error(
      `Could not geocode commute destination: ${preferences.commuteDestination}`
    );
  }

  const candidates = getMatchCandidates();
  const weights = computeWeights(preferences);
  const censusMap = await loadCensusMap(candidates);

  const baseList = candidates.map((candidate) =>
    baseMetrics(
      candidate,
      commuteDest,
      aggregateHomeValue(candidate, censusMap),
      aggregateMedianRent(candidate, censusMap)
    )
  );

  const commuteNorm = normalizeValues(
    baseList.map((m) => m.commuteMinutes),
    false
  );

  const phase1: ScoredCandidate[] = candidates.map((candidate, i) => {
    const metrics = baseList[i]!;
    const housingParts = scoreHousingBreakdown(metrics, preferences);
    const housingScore = combinedHousingScore(housingParts);
    const commuteScore = commuteNorm[i] ?? 50;
    const wHousing = weights.housing / (weights.housing + weights.commute);
    const wCommute = weights.commute / (weights.housing + weights.commute);
    const score = Math.round(housingScore * wHousing + commuteScore * wCommute);
    return {
      candidate,
      metrics,
      breakdown: {
        home: housingParts.home,
        rent: housingParts.rent,
        commute: Math.round(commuteScore),
        schools: 50,
        parks: 50,
        dogFriendly: 50,
      },
      score,
    };
  });

  phase1.sort((a, b) => b.score - a.score);
  const shortlist = phase1.slice(0, FINAL_TOP_N);

  const enriched = await Promise.all(
    shortlist.map((item) =>
      enrichCandidateMetrics(item.candidate, item.metrics, preferences)
    )
  );

  const scored: ScoredCandidate[] = shortlist.map((item, i) => {
    const metrics = enriched[i]!;
    const { breakdown, score } = buildBreakdown(
      metrics,
      enriched,
      preferences,
      weights
    );
    return { candidate: item.candidate, metrics, breakdown, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return { scored, commuteDest };
}

export function toMatchResult(
  item: ScoredCandidate,
  reasoning: string
): MatchResult {
  const { candidate, metrics, breakdown, score } = item;
  return {
    id: candidate.id,
    displayName: candidate.displayName,
    city: candidate.city,
    county: candidate.county,
    source: candidate.source,
    neighbourhoodId: candidate.neighbourhoodId,
    geoid: candidate.primaryGeoid,
    bbox: candidate.bbox,
    centroid: candidate.centroid,
    score,
    breakdown,
    metrics,
    reasoning,
  };
}

export async function runMatch(
  preferences: MatchPreferences,
  topN = FINAL_TOP_N
): Promise<MatchResult[]> {
  const { scored } = await scoreMatchCandidates(preferences);
  const top = scored.slice(0, topN);

  const { generateMatchReasoning } = await import("./ai");
  const { templateReasoning } = await import("./match-reasoning");
  const reasoningMap = await generateMatchReasoning(preferences, top);

  return top.map((item) =>
    toMatchResult(
      item,
      reasoningMap.get(item.candidate.id) ??
        templateReasoning(item.candidate, item.metrics, preferences)
    )
  );
}
