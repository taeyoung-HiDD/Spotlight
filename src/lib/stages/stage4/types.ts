import type {
  EmpathyQuadrantId,
  EmpathyStickyItem,
} from "@/lib/stages/stage2/empathyMap";
import {
  emptyStage4Quadrants,
  normalizeEmpathyStickyItems,
} from "@/lib/stages/stage4/empathySticky";
import {
  defaultResearchSynthesis,
  normalizeResearchSynthesis,
  type ResearchSynthesisData,
  type Stage4WorkflowPhase,
} from "@/lib/stages/stage4/researchSynthesisTypes";
import { personaLineCartoonFallbackUrl } from "@/lib/stages/stage4/personaThumbnail";

export type { ResearchSynthesisData, Stage4WorkflowPhase };

function migratePersonaThumbnailUrl(
  raw: string | undefined,
  name: string,
  context: string,
): string {
  const url = typeof raw === "string" ? raw.trim() : "";
  if (!url) return "";
  if (url.includes("/9.x/doodle/")) {
    return personaLineCartoonFallbackUrl(name, context);
  }
  return url;
}

export interface Stage4PersonaEmpathyMap {
  id: string;
  personaName: string;
  personaContext: string;
  /** 업로드 data URL 또는 AI·외부 이미지 URL */
  personaThumbnailUrl: string;
  quadrants: Record<EmpathyQuadrantId, EmpathyStickyItem[]>;
}

export interface Stage4DiscoveriesData {
  personaTargetCount: number;
  empathyMaps: Stage4PersonaEmpathyMap[];
  synthesisNote: string;
  researchSynthesis: ResearchSynthesisData;
  workflowPhase: Stage4WorkflowPhase;
}

export function createStage4PersonaMap(index = 0): Stage4PersonaEmpathyMap {
  return {
    id: `p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${index}`,
    personaName: "",
    personaContext: "",
    personaThumbnailUrl: "",
    quadrants: emptyStage4Quadrants(),
  };
}

export function defaultStage4Data(): Stage4DiscoveriesData {
  return {
    personaTargetCount: 1,
    empathyMaps: [createStage4PersonaMap(0)],
    synthesisNote: "",
    researchSynthesis: defaultResearchSynthesis(),
    workflowPhase: "empathy_maps",
  };
}

export function normalizeStage4Data(
  raw: Partial<Stage4DiscoveriesData> | null | undefined,
): Stage4DiscoveriesData {
  const base = defaultStage4Data();
  if (!raw) return base;

  const maps =
    Array.isArray(raw.empathyMaps) && raw.empathyMaps.length
      ? raw.empathyMaps.slice(0, 8)
      : [];

  const normalizedMaps: Stage4PersonaEmpathyMap[] = maps.map((m, idx) => ({
    id: m.id || createStage4PersonaMap(idx).id,
    personaName: m.personaName || "",
    personaContext: m.personaContext || "",
    personaThumbnailUrl: migratePersonaThumbnailUrl(
      m.personaThumbnailUrl,
      m.personaName || "",
      m.personaContext || "",
    ),
    quadrants: {
      says: normalizeEmpathyStickyItems(m.quadrants?.says),
      thinks: normalizeEmpathyStickyItems(m.quadrants?.thinks),
      does: normalizeEmpathyStickyItems(m.quadrants?.does),
      feels: normalizeEmpathyStickyItems(m.quadrants?.feels),
    },
  }));

  while (normalizedMaps.length < 1) {
    normalizedMaps.push(createStage4PersonaMap(normalizedMaps.length));
  }

  const workflowPhase: Stage4WorkflowPhase =
    raw.workflowPhase === "research_synthesis"
      ? "research_synthesis"
      : "empathy_maps";

  return {
    personaTargetCount: normalizedMaps.length,
    empathyMaps: normalizedMaps,
    synthesisNote: raw.synthesisNote || "",
    researchSynthesis: normalizeResearchSynthesis(
      raw.researchSynthesis as Partial<ResearchSynthesisData> | undefined,
    ),
    workflowPhase,
  };
}
