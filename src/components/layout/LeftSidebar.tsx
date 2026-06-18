"use client";

import { useAppStore } from "@/store/useAppStore";
import { getNeighbourhoodData } from "@/lib/mock-data";
import { SearchBar } from "@/components/sidebar/SearchBar";
import { AccordionSection } from "@/components/sidebar/AccordionSection";
import { DemographicsSection } from "@/components/sidebar/sections/DemographicsSection";
import { SchoolsSection } from "@/components/sidebar/sections/SchoolsSection";
import { HousingSection } from "@/components/sidebar/sections/HousingSection";
import { CommuteSection } from "@/components/sidebar/sections/CommuteSection";
import { WalkabilitySection } from "@/components/sidebar/sections/WalkabilitySection";

export function LeftSidebar() {
  const selectedGeoid = useAppStore((s) => s.selectedGeoid);
  const data = getNeighbourhoodData(selectedGeoid);

  return (
    <aside className="flex w-[260px] shrink-0 flex-col border-r border-gray-200 bg-white">
      <div className="border-b border-gray-100 p-3">
        <SearchBar />
      </div>
      <div className="flex-1 overflow-y-auto">
        <AccordionSection title="Demographics" defaultOpen>
          <DemographicsSection data={data.demographics} />
        </AccordionSection>
        <AccordionSection title="Schools">
          <SchoolsSection data={data.schools} />
        </AccordionSection>
        <AccordionSection title="Housing">
          <HousingSection data={data.housing} />
        </AccordionSection>
        <AccordionSection title="Commute">
          <CommuteSection data={data.commute} />
        </AccordionSection>
        <AccordionSection title="Walkability">
          <WalkabilitySection data={data.walkability} />
        </AccordionSection>
      </div>
    </aside>
  );
}
