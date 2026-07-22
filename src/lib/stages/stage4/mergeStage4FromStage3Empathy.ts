import type { FieldResearchData } from "@/lib/stages/fieldResearch/types";
import {
  hasStage3EmpathyMapContent,
  normalizeStage3EmpathyMaps,
} from "@/lib/stages/fieldResearch/stage3EmpathyMap";
import { ensureSubjectsFromStage3ResearchPrep } from "@/lib/stages/stage4/bootstrapFromStage3";
import { hasEmpathyMapContent } from "@/lib/stages/stage4/researchSynthesisGates";
import { ensureSubjectEmpathyLinks } from "@/lib/stages/stage4/syncSubjectEmpathy";
import type { Stage4DiscoveriesData } from "@/lib/stages/stage4/types";

/** 3단계 공감맵·조사 준비(인원)를 4단계에 반영 */
export function mergeStage4WithStage3Empathy(
  stage4: Stage4DiscoveriesData,
  stage3: FieldResearchData,
): Stage4DiscoveriesData {
  let next = stage4;
  const empathyMaps = normalizeStage3EmpathyMaps(stage3.empathyMaps);
  if (
    hasStage3EmpathyMapContent({ empathyMaps }) &&
    !hasEmpathyMapContent(stage4)
  ) {
    next = {
      ...stage4,
      empathyMaps,
      personaTargetCount: empathyMaps.length,
      workflowPhase: "research_synthesis",
    };
  }

  next = {
    ...next,
    researchSynthesis: ensureSubjectsFromStage3ResearchPrep(
      next.researchSynthesis,
      stage3,
    ),
  };

  return ensureSubjectEmpathyLinks(next);
}
