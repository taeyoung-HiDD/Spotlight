import { quadrantHasContent } from "@/lib/stages/stage4/empathySticky";
import { hasResearchSynthesisContent } from "@/lib/stages/stage4/researchSynthesisTypes";
import type { Stage4DiscoveriesData } from "@/lib/stages/stage4/types";

export function hasEmpathyMapContent(data: Stage4DiscoveriesData): boolean {
  return data.empathyMaps.some(
    (m) =>
      m.personaName.trim() ||
      m.personaContext.trim() ||
      quadrantHasContent(m.quadrants.says) ||
      quadrantHasContent(m.quadrants.thinks) ||
      quadrantHasContent(m.quadrants.does) ||
      quadrantHasContent(m.quadrants.feels),
  );
}

export function canAdvanceToSynthesis(data: Stage4DiscoveriesData): boolean {
  return hasEmpathyMapContent(data);
}

export function canAdvanceToStage5(data: Stage4DiscoveriesData): boolean {
  return (
    hasEmpathyMapContent(data) &&
    hasResearchSynthesisContent(data.researchSynthesis)
  );
}
