import {
  summarizeStage1Artifact,
  summarizeStage3Artifact,
} from "@/lib/coach/artifactSummary";
import { DEFAULT_STAGE1_STATE } from "@/lib/artifacts/stage1Collect";
import {
  normalizePrePmfOverview,
  buildPrePmfSummaryText,
} from "@/lib/stages/stage2/prePmfOverview";
import {
  normalizeStage3EmpathyMaps,
} from "@/lib/stages/fieldResearch/stage3EmpathyMap";
import { normalizeStage3ResearchPrep } from "@/lib/stages/fieldResearch/stage3ResearchPrep";
import { DEFAULT_FIELD_RESEARCH } from "@/lib/stages/fieldResearch/defaults";
import type { FieldResearchData } from "@/lib/stages/fieldResearch/types";
import {
  normalizeUserJourneyMap,
  hasJourneyContent,
} from "@/lib/stages/stage6/userJourneyTypes";
import {
  normalizeStage7Hmw,
  hasHmwContent,
} from "@/lib/stages/stage7/hmwTypes";
import {
  normalizeIdeaGrid,
  filledIdeaCount,
} from "@/lib/stages/stage8/ideaGridTypes";
import {
  normalizeConceptSheet,
  hasConceptSheetContent,
} from "@/lib/stages/stage9/conceptSheetTypes";
import {
  normalizePrototype,
  hasPrototypeContent,
} from "@/lib/stages/stage10/prototypeTypes";
import {
  normalizeStage5LatentNeeds,
  hasLatentNeedsContent,
} from "@/lib/stages/stage5/latentNeedsTypes";
import { SIDEBAR_MACRO_GROUPS, getSidebarStage } from "@/lib/stages/sidebarNav";
import {
  archiveArtifactLabel,
  archiveStageCode,
} from "@/lib/artifacts/archiveArtifactLabels";
import type {
  ArtifactRow,
  ArtifactSlot,
  ArtifactSlots,
  ConfidenceLevel,
  SlotState,
} from "@/types/database";

export interface ArchiveStageEntry {
  stageId: number;
  /** 매크로·세부 순번 — 예: 1-1 */
  stageCode: string;
  /** 단계 활동명 — 예: 문제 정의하기 (eyebrow용) */
  stageLabel: string;
  /** 산출물 이름 — 예: 프로젝트 개요 및 문제 정의서 */
  artifactLabel: string;
  macroId: string;
  macroLabel: string;
  artifactId: string;
  updatedAt: string;
  confidence: ConfidenceLevel;
  slotState: SlotState;
  hasContent: boolean;
  previewLines: string[];
}

function clip(text: string, max = 120): string {
  const t = text.trim();
  if (!t) return "";
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

function linesFromText(text: string, maxLines = 4): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/^[·\-\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, maxLines)
    .map((l) => clip(l));
}

function aggregateSlot(
  slots: ArtifactSlots,
): { confidence: ConfidenceLevel; slotState: SlotState; updatedAt: string } {
  const values = Object.values(slots).filter(
    (s): s is ArtifactSlot => Boolean(s) && typeof s === "object",
  );
  if (!values.length) {
    return {
      confidence: "hypothesis",
      slotState: "empty",
      updatedAt: "",
    };
  }
  const confidence: ConfidenceLevel = values.some(
    (s) => s.confidence === "discovery",
  )
    ? "discovery"
    : "hypothesis";
  const slotState: SlotState = values.some((s) => s.state === "complete")
    ? "complete"
    : values.some((s) => s.state === "in_progress")
      ? "in_progress"
      : values.some((s) => s.state === "revisit")
        ? "revisit"
        : "empty";
  const updatedAt = values
    .map((s) => s.updated_at)
    .filter(Boolean)
    .sort()
    .at(-1) ?? "";
  return { confidence, slotState, updatedAt };
}

function macroForStage(stageId: number) {
  for (const group of SIDEBAR_MACRO_GROUPS) {
    if (group.stages.some((s) => s.id === stageId)) return group;
  }
  return SIDEBAR_MACRO_GROUPS[0];
}

function parseStage1(slots: ArtifactSlots) {
  const raw = slots.stage1_collect?.content;
  if (!raw || typeof raw !== "object") return { ...DEFAULT_STAGE1_STATE };
  const o = raw as Partial<typeof DEFAULT_STAGE1_STATE>;
  return {
    startingPoint: typeof o.startingPoint === "string" ? o.startingPoint : "",
    projectTitle: typeof o.projectTitle === "string" ? o.projectTitle : "",
    principleAck: Boolean(o.principleAck),
    displayName: typeof o.displayName === "string" ? o.displayName : undefined,
    userLevel: o.userLevel,
  };
}

function parseFieldResearch(slots: ArtifactSlots): FieldResearchData {
  const prep = slots.prep?.content;
  const recruitment = slots.recruitment?.content;
  const sessions = slots.sessions?.content;
  if (!prep && !recruitment && !sessions) return { ...DEFAULT_FIELD_RESEARCH };
  const p = (prep && typeof prep === "object" ? prep : {}) as Record<string, unknown>;
  const r = (recruitment && typeof recruitment === "object" ? recruitment : {}) as Record<
    string,
    unknown
  >;
  const s = (sessions && typeof sessions === "object" ? sessions : {}) as Record<string, unknown>;
  return {
    ...DEFAULT_FIELD_RESEARCH,
    prepWorkflowPhase:
      typeof p.prepWorkflowPhase === "string"
        ? (p.prepWorkflowPhase as FieldResearchData["prepWorkflowPhase"])
        : DEFAULT_FIELD_RESEARCH.prepWorkflowPhase,
    researchPrep: p.researchPrep
      ? normalizeStage3ResearchPrep(p.researchPrep)
      : DEFAULT_FIELD_RESEARCH.researchPrep,
    empathyMaps: Array.isArray(p.empathyMaps)
      ? normalizeStage3EmpathyMaps(p.empathyMaps)
      : DEFAULT_FIELD_RESEARCH.empathyMaps,
    toKnowTable: Array.isArray(p.toKnowTable) ? (p.toKnowTable as FieldResearchData["toKnowTable"]) : DEFAULT_FIELD_RESEARCH.toKnowTable,
    respondents: Array.isArray(r.respondents) ? (r.respondents as FieldResearchData["respondents"]) : [],
    sessions: s.sessions && typeof s.sessions === "object" ? (s.sessions as FieldResearchData["sessions"]) : {},
    prepConfirmed: Boolean(p.prepConfirmed),
    allConsentConfirmed: Boolean(r.allConsentConfirmed),
    researchMethods: Array.isArray(p.researchMethods) ? (p.researchMethods as FieldResearchData["researchMethods"]) : [],
    researchProtocol: typeof p.researchProtocol === "string" ? p.researchProtocol : "",
  };
}

function previewForStage(stageId: number, slots: ArtifactSlots): {
  hasContent: boolean;
  previewLines: string[];
} {
  switch (stageId) {
    case 1: {
      const s = parseStage1(slots);
      const hasContent =
        Boolean(s.startingPoint.trim()) || Boolean(s.projectTitle.trim());
      const summary = summarizeStage1Artifact({
        ...s,
        startingPoint: s.startingPoint,
        principleAck: s.principleAck,
      });
      return { hasContent, previewLines: linesFromText(summary) };
    }
    case 2: {
      const data = normalizePrePmfOverview(slots.pre_pmf_overview?.content);
      const hasContent = data.generationStatus === "done";
      return {
        hasContent,
        previewLines: linesFromText(buildPrePmfSummaryText(data)),
      };
    }
    case 3: {
      const data = parseFieldResearch(slots);
      const hasContent =
        data.empathyMaps.some(
          (m) =>
            m.personaName.trim() ||
            m.quadrants.says.some((i) => i.text.trim()) ||
            m.quadrants.does.some((i) => i.text.trim()),
        ) ||
        data.toKnowTable.some((r) => r.small.trim()) ||
        data.respondents.length > 0 ||
        Object.keys(data.sessions).length > 0;
      return {
        hasContent,
        previewLines: linesFromText(summarizeStage3Artifact(data)),
      };
    }
    case 4: {
      const maps = slots.empathy_maps?.content;
      const synth =
        slots.research_synthesis?.content ?? slots.synthesis?.content;
      const mapCount = Array.isArray(maps) ? maps.length : 0;
      const hasContent = mapCount > 0 || Boolean(synth);
      const lines: string[] = [];
      if (mapCount) lines.push(`공감맵 ${mapCount}명`);
      if (synth && typeof synth === "object") {
        const o = synth as Record<string, unknown>;
        if (typeof o.headline === "string" && o.headline.trim()) {
          lines.push(clip(o.headline));
        }
      }
      return { hasContent, previewLines: lines.slice(0, 4) };
    }
    case 5: {
      const raw = slots.journey_map?.content;
      const nested =
        raw && typeof raw === "object" && "userJourneyMap" in (raw as object)
          ? (raw as { userJourneyMap: unknown }).userJourneyMap
          : raw;
      const data = normalizeUserJourneyMap(
        nested as Parameters<typeof normalizeUserJourneyMap>[0],
      );
      const persona = data.activeSubjectId
        ? data.personas[data.activeSubjectId]
        : Object.values(data.personas)[0];
      const stepLabels = persona?.steps.map((s) => clip(s.label)) ?? [];
      return {
        hasContent: hasJourneyContent(data),
        previewLines: data.subjects.length
          ? [
              `페르소나 ${data.subjects.length}명`,
              ...stepLabels.slice(0, 3),
            ]
          : stepLabels.slice(0, 4),
      };
    }
    case 6: {
      const raw = slots.needs_board?.content;
      const board =
        raw && typeof raw === "object" && "latentNeedsBoard" in (raw as object)
          ? (raw as { latentNeedsBoard: unknown }).latentNeedsBoard
          : raw;
      const data = normalizeStage5LatentNeeds(
        board as Parameters<typeof normalizeStage5LatentNeeds>[0],
      );
      const latent = data.postits.filter(
        (p) => p.kind === "latent_need" && p.text.trim(),
      );
      return {
        hasContent: hasLatentNeedsContent(data),
        previewLines: latent.slice(0, 4).map((p) => clip(p.text)),
      };
    }
    case 7: {
      const raw = slots.hmw_board?.content;
      const board =
        raw && typeof raw === "object" && "hmwBoard" in (raw as object)
          ? (raw as { hmwBoard: unknown }).hmwBoard
          : raw;
      const data = normalizeStage7Hmw(
        board as Parameters<typeof normalizeStage7Hmw>[0],
      );
      const filled = data.questions.filter((q) => q.hmwText.trim());
      return {
        hasContent: hasHmwContent(data),
        previewLines: filled.slice(0, 4).map((q) => clip(q.hmwText)),
      };
    }
    case 8: {
      const raw = slots.idea_grid?.content;
      const board =
        raw && typeof raw === "object" && "ideaGrid" in (raw as object)
          ? (raw as { ideaGrid: unknown }).ideaGrid
          : raw;
      const data = normalizeIdeaGrid(board as Parameters<typeof normalizeIdeaGrid>[0]);
      const count = filledIdeaCount(data);
      const titles = data.slots
        .filter((s) => s?.title.trim())
        .slice(0, 4)
        .map((s) => clip(s!.title));
      return {
        hasContent: count > 0,
        previewLines: count ? [`아이디어 ${count}개`, ...titles] : [],
      };
    }
    case 10: {
      const raw = slots.concept_sheet?.content;
      const sheet =
        raw && typeof raw === "object" && "conceptSheet" in (raw as object)
          ? (raw as { conceptSheet: unknown }).conceptSheet
          : raw;
      const data = normalizeConceptSheet(
        sheet as Parameters<typeof normalizeConceptSheet>[0],
      );
      return {
        hasContent: hasConceptSheetContent(data),
        previewLines: [
          data.conceptName.trim() ? clip(data.conceptName) : "",
          data.oneLiner.trim() ? clip(data.oneLiner) : "",
          data.trueNeed.trim() ? clip(data.trueNeed) : "",
        ]
          .filter(Boolean)
          .slice(0, 4),
      };
    }
    case 11: {
      const raw = slots.prototype_html?.content;
      const proto =
        raw && typeof raw === "object" && "prototype" in (raw as object)
          ? (raw as { prototype: unknown }).prototype
          : raw;
      const data = normalizePrototype(
        proto as Parameters<typeof normalizePrototype>[0],
      );
      return {
        hasContent: hasPrototypeContent(data),
        previewLines: hasPrototypeContent(data)
          ? [
              `${data.platform === "web" ? "웹" : "모바일"} 시제품`,
              "인터랙티브 HTML 프로토타입",
            ]
          : [],
      };
    }
    default:
      return { hasContent: false, previewLines: [] };
  }
}

export function buildArchiveEntries(rows: ArtifactRow[]): ArchiveStageEntry[] {
  const entries: ArchiveStageEntry[] = [];

  for (const row of rows) {
    const stageId = Number(row.stage_id);
    const sidebar = getSidebarStage(stageId);
    if (!sidebar) continue;

    const slots = row.slots ?? {};
    const { confidence, slotState, updatedAt } = aggregateSlot(slots);
    const { hasContent, previewLines } = previewForStage(stageId, slots);
    if (!hasContent && slotState === "empty") continue;

    const macro = macroForStage(stageId);
    entries.push({
      stageId,
      stageCode: archiveStageCode(stageId),
      stageLabel: sidebar.navLabel,
      artifactLabel: archiveArtifactLabel(stageId),
      macroId: macro.id,
      macroLabel: macro.label,
      artifactId: row.id,
      updatedAt: updatedAt || row.updated_at,
      confidence,
      slotState,
      hasContent,
      previewLines,
    });
  }

  return entries;
}

export function groupArchiveEntriesByMacro(
  entries: ArchiveStageEntry[],
): Map<string, ArchiveStageEntry[]> {
  const map = new Map<string, ArchiveStageEntry[]>();
  for (const entry of entries) {
    const list = map.get(entry.macroId) ?? [];
    list.push(entry);
    map.set(entry.macroId, list);
  }
  return map;
}
