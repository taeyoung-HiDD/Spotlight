import type {
  EmpathyQuadrantId,
  EmpathyStickyItem,
} from "@/lib/stages/stage2/empathyMap";
import {
  emptyStage4Quadrants,
  normalizeEmpathyStickyItems,
} from "@/lib/stages/stage4/empathySticky";
import {
  normalizeNemotronPersonaProfile,
  type NemotronPersonaProfile,
} from "@/lib/personas/nemotronPersona";
import {
  defaultResearchSynthesis,
  normalizeResearchSynthesis,
  type ResearchSynthesisData,
  type Stage4WorkflowPhase,
} from "@/lib/stages/stage4/researchSynthesisTypes";
import { personaLineCartoonFallbackUrl } from "@/lib/stages/stage4/personaThumbnail";
import {
  emptyPersonaBio,
  formatPersonaBioSummary,
  normalizePersonaBio,
  type PersonaBio,
} from "@/lib/stages/stage4/personaBio";

export type { PersonaBio };

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
  personaBio: PersonaBio;
  /** Nemotron-Personas-Korea 매칭 가상 사용자 — 실제 인물처럼 생각·답변하는 배경 */
  personaProfile?: NemotronPersonaProfile;
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
    personaBio: emptyPersonaBio(),
    personaThumbnailUrl: "",
    quadrants: emptyStage4Quadrants(),
  };
}

export function applyPersonaBioToMapFields(
  map: Stage4PersonaEmpathyMap,
  bio: PersonaBio,
): Pick<Stage4PersonaEmpathyMap, "personaBio" | "personaName" | "personaContext"> {
  const normalized = normalizePersonaBio(bio, {
    name: map.personaName,
    context: map.personaContext,
  });
  const summary = formatPersonaBioSummary(normalized);
  return {
    personaBio: normalized,
    personaName: normalized.name.trim() || map.personaName,
    personaContext: summary || map.personaContext,
  };
}

export function defaultStage4Data(): Stage4DiscoveriesData {
  return {
    personaTargetCount: 1,
    empathyMaps: [createStage4PersonaMap(0)],
    synthesisNote: "",
    researchSynthesis: defaultResearchSynthesis(),
    workflowPhase: "research_synthesis",
  };
}

export function normalizeStage4Data(
  raw: Partial<Stage4DiscoveriesData> | null | undefined,
): Stage4DiscoveriesData {
  const base = defaultStage4Data();
  if (!raw) return base;

  const maps =
    Array.isArray(raw.empathyMaps) && raw.empathyMaps.length
      ? raw.empathyMaps.slice(0, 12)
      : [];

  const normalizedMaps: Stage4PersonaEmpathyMap[] = maps.map((m, idx) => ({
    id: m.id || createStage4PersonaMap(idx).id,
    personaName: m.personaName || "",
    personaContext: m.personaContext || "",
    personaBio: normalizePersonaBio(m.personaBio, {
      name: m.personaName,
      context: m.personaContext,
    }),
    personaProfile: normalizeNemotronPersonaProfile(m.personaProfile),
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

  return {
    personaTargetCount: normalizedMaps.length,
    empathyMaps: normalizedMaps,
    synthesisNote: raw.synthesisNote || "",
    researchSynthesis: normalizeResearchSynthesis(
      raw.researchSynthesis as Partial<ResearchSynthesisData> | undefined,
    ),
    workflowPhase: "research_synthesis",
  };
}
