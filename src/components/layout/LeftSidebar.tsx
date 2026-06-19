"use client";

import { useMemo } from "react";
import { useAppStore } from "@/store/useAppStore";
import { useCensusData } from "@/hooks/useCensusData";
import { getNeighbourhoodData } from "@/lib/mock-data";
import { SearchBar } from "@/components/sidebar/SearchBar";
import { AccordionSection } from "@/components/sidebar/AccordionSection";
import { DemographicsSection } from "@/components/sidebar/sections/DemographicsSection";
import { SchoolsSection } from "@/components/sidebar/sections/SchoolsSection";
import { HousingSection } from "@/components/sidebar/sections/HousingSection";
import { CommuteSection } from "@/components/sidebar/sections/CommuteSection";
import { WalkabilitySection } from "@/components/sidebar/sections/WalkabilitySection";

function LoadingStats() {
  return (
    <div className="animate-pulse space-y-2 py-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex justify-between">
          <div className="h-3 w-20 rounded bg-gray-100" />
          <div className="h-3 w-12 rounded bg-gray-100" />
        </div>
      ))}
    </div>
  );
}

export function LeftSidebar() {
  const selectedGeoid = useAppStore((s) => s.selectedGeoid);
  const mockData = getNeighbourhoodData(selectedGeoid);
  const { data: census, loading, error } = useCensusData(selectedGeoid);

  const demographics = useMemo(() => {
    if (!census) return mockData.demographics;
    return {
      ...mockData.demographics,
      population: census.population,
      medianIncome: census.medianIncome,
      bachelorsPlus: census.bachelorsPlus,
    };
  }, [census, mockData.demographics]);

  const housing = useMemo(() => {
    if (!census) return mockData.housing;
    return {
      ...mockData.housing,
      medianRent: census.medianRent,
    };
  }, [census, mockData.housing]);

  return (
    <aside className="flex w-[260px] shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-100 p-3">
        <SearchBar />
      </div>
      <div className="flex-1 overflow-y-auto">
        {error && (
          <p className="border-b border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Census data unavailable — showing estimates.
          </p>
        )}
        <AccordionSection title="Demographics" defaultOpen>
          {loading ? (
            <LoadingStats />
          ) : (
            <DemographicsSection data={demographics} />
          )}
        </AccordionSection>
        <AccordionSection title="Schools">
          <SchoolsSection data={mockData.schools} />
        </AccordionSection>
        <AccordionSection title="Housing">
          {loading ? (
            <LoadingStats />
          ) : (
            <HousingSection data={housing} />
          )}
        </AccordionSection>
        <AccordionSection title="Commute">
          <CommuteSection data={mockData.commute} />
        </AccordionSection>
        <AccordionSection title="Walkability">
          <WalkabilitySection data={mockData.walkability} />
        </AccordionSection>
      </div>
    </aside>
  );
}
