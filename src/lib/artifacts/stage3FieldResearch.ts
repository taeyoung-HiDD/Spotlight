import { createClient } from "@/lib/supabase/client";
import { ensureAuthSession } from "@/lib/supabase/ensureSession";
import {
  DEFAULT_FIELD_RESEARCH,
  DEFAULT_TO_KNOW_PREP,
} from "@/lib/stages/fieldResearch/defaults";
import { resolveToKnowPrepFromLoad } from "@/lib/stages/fieldResearch/stage3ToKnowPrepFlow";
import {
  normalizeStage3EmpathyMaps,
  resolveStage3PrepWorkflowPhase,
} from "@/lib/stages/fieldResearch/stage3EmpathyMap";
import {
  normalizeStage3ResearchPrep,
} from "@/lib/stages/fieldResearch/stage3ResearchPrep";
import {
  finalizeToKnowData,
  migrateToKnowTable,
} from "@/lib/stages/fieldResearch/toKnowMigrate";
import type { FieldResearchData } from "@/lib/stages/fieldResearch/types";
import type {
  ArtifactRow,
  ArtifactSlot,
  ArtifactSlots,
  ArtifactUpdate,
  ConfidenceLevel,
  SlotState,
} from "@/types/database";

const STAGE_ID = 3;

function nowIso() {
  return new Date().toISOString();
}

function makeSlot(
  content: unknown,
  confidence: ConfidenceLevel,
  state: SlotState,
): ArtifactSlot {
  return {
    state,
    content,
    confidence,
    source_refs: [],
    updated_by: "user",
    updated_at: nowIso(),
  };
}

export function fieldResearchToSlots(data: FieldResearchData): ArtifactSlots {
  const hasSessions = Object.values(data.sessions).some(
    (s) => s.logEntries.length > 0 || s.debriefing.surprise.trim(),
  );
  return {
    prep: makeSlot(
      {
        prepWorkflowPhase: data.prepWorkflowPhase,
        researchPrep: data.researchPrep,
        empathyMaps: data.empathyMaps,
        toKnowTable: data.toKnowTable,
        // 레거시 호환(읽기 전용): 이전 버전이 이 키를 기대할 수 있어 함께 저장
        toKnowList: Array.isArray(data.toKnowTable)
          ? data.toKnowTable.map((r) => r.small).filter(Boolean)
          : [],
        toKnowPrep: data.toKnowPrep,
        toKnowCoreQuestion: data.toKnowCoreQuestion,
        researchMethods: data.researchMethods,
        researchProtocol: data.researchProtocol,
        prepConfirmed: data.prepConfirmed,
      },
      "discovery",
      data.prepConfirmed ? "complete" : "in_progress",
    ),
    recruitment: makeSlot(
      {
        respondents: data.respondents,
        allConsentConfirmed: data.allConsentConfirmed,
      },
      "discovery",
      data.allConsentConfirmed ? "complete" : "in_progress",
    ),
    sessions: makeSlot(
      {
        activeRespondentId: data.activeRespondentId,
        sessions: data.sessions,
      },
      "discovery",
      hasSessions ? "in_progress" : "empty",
    ),
  };
}

function parseFieldResearch(slots: ArtifactSlots): FieldResearchData {
  const prep = slots.prep?.content;
  const recruitment = slots.recruitment?.content;
  const sessionsSlot = slots.sessions?.content;

  let toKnowPrep = { ...DEFAULT_TO_KNOW_PREP };
  let prepWorkflowPhase = DEFAULT_FIELD_RESEARCH.prepWorkflowPhase;
  let researchPrep = { ...DEFAULT_FIELD_RESEARCH.researchPrep };
  let empathyMaps = [...DEFAULT_FIELD_RESEARCH.empathyMaps];
  let toKnowCoreQuestion = DEFAULT_FIELD_RESEARCH.toKnowCoreQuestion;
  let toKnowTable = [...DEFAULT_FIELD_RESEARCH.toKnowTable];
  let researchMethods = [...DEFAULT_FIELD_RESEARCH.researchMethods];
  let researchProtocol = DEFAULT_FIELD_RESEARCH.researchProtocol;
  let prepConfirmed = DEFAULT_FIELD_RESEARCH.prepConfirmed;

  let respondents = DEFAULT_FIELD_RESEARCH.respondents;
  let allConsentConfirmed = false;
  let activeRespondentId = DEFAULT_FIELD_RESEARCH.activeRespondentId;
  let sessions = { ...DEFAULT_FIELD_RESEARCH.sessions };

  if (prep && typeof prep === "object") {
    const p = prep as Record<string, unknown>;
    if (Array.isArray(p.empathyMaps)) {
      empathyMaps = normalizeStage3EmpathyMaps(p.empathyMaps);
    }
    if (p.researchPrep) {
      researchPrep = normalizeStage3ResearchPrep(p.researchPrep);
    }
    if (typeof p.toKnowCoreQuestion === "string") {
      toKnowCoreQuestion = p.toKnowCoreQuestion.trim();
    }
    if (Array.isArray(p.toKnowTable)) {
      const finalized = finalizeToKnowData(
        p.toKnowTable as FieldResearchData["toKnowTable"],
        toKnowCoreQuestion,
      );
      toKnowCoreQuestion = finalized.toKnowCoreQuestion;
      toKnowTable = finalized.toKnowTable;
    } else if (Array.isArray(p.toKnowList)) {
      // 레거시 마이그레이션: 문자열 리스트 → 테이블(임시로 니즈 카테고리에 모아둠)
      const list = p.toKnowList as unknown[];
      toKnowTable = list
        .filter((x) => typeof x === "string" && x.trim())
        .slice(0, 60)
        .map((text, idx) => ({
          id: `tok-legacy-${idx}-${Date.now()}`,
          big: "customer",
          mid: "레거시 To-know (분류 필요)",
          small: (text as string).trim(),
          method: "",
          note: "",
        })) as FieldResearchData["toKnowTable"];
      const finalized = finalizeToKnowData(toKnowTable, toKnowCoreQuestion);
      toKnowCoreQuestion = finalized.toKnowCoreQuestion;
      toKnowTable = finalized.toKnowTable;
    }
    toKnowPrep = resolveToKnowPrepFromLoad(p.toKnowPrep, toKnowTable);
    if (Array.isArray(p.researchMethods)) {
      researchMethods = p.researchMethods as FieldResearchData["researchMethods"];
    }
    if (typeof p.researchProtocol === "string") {
      researchProtocol = p.researchProtocol;
    }
    if (typeof p.prepConfirmed === "boolean") {
      prepConfirmed = p.prepConfirmed;
    }
    prepWorkflowPhase = resolveStage3PrepWorkflowPhase(p.prepWorkflowPhase);
  }

  if (recruitment && typeof recruitment === "object") {
    const r = recruitment as Record<string, unknown>;
    if (Array.isArray(r.respondents)) {
      respondents = r.respondents as FieldResearchData["respondents"];
    }
    if (typeof r.allConsentConfirmed === "boolean") {
      allConsentConfirmed = r.allConsentConfirmed;
    }
  }

  if (sessionsSlot && typeof sessionsSlot === "object") {
    const s = sessionsSlot as Record<string, unknown>;
    if (typeof s.activeRespondentId === "string") {
      activeRespondentId = s.activeRespondentId;
    }
    if (s.sessions && typeof s.sessions === "object") {
      sessions = {
        ...sessions,
        ...(s.sessions as FieldResearchData["sessions"]),
      };
    }
  }

  return {
    prepWorkflowPhase,
    researchPrep,
    empathyMaps,
    toKnowPrep,
    toKnowCoreQuestion,
    toKnowTable,
    researchMethods,
    researchProtocol,
    prepConfirmed,
    respondents,
    allConsentConfirmed,
    activeRespondentId,
    sessions,
  };
}

export async function fetchStage3FieldResearch(projectId: string) {
  const supabase = createClient();
  await ensureAuthSession(supabase);

  const { data, error } = await supabase
    .from("artifacts")
    .select("*")
    .eq("project_id", projectId)
    .eq("stage_id", STAGE_ID)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`사용자 조사 준비 자료를 불러오지 못했습니다: ${error.message}`);
  }

  if (!data) {
    return {
      data: JSON.parse(JSON.stringify(DEFAULT_FIELD_RESEARCH)) as FieldResearchData,
      artifactId: null as string | null,
    };
  }

  const row = data as ArtifactRow;
  return {
    data: parseFieldResearch(row.slots ?? {}),
    artifactId: row.id,
  };
}

export async function saveStage3FieldResearch({
  projectId,
  artifactId,
  data,
}: {
  projectId: string;
  artifactId: string | null;
  data: FieldResearchData;
}) {
  const supabase = createClient();
  await ensureAuthSession(supabase);
  const slots = fieldResearchToSlots(data);

  if (artifactId) {
    const update: ArtifactUpdate = { slots };
    const { data: updated, error } = await supabase
      .from("artifacts")
      .update(update)
      .eq("id", artifactId)
      .select("id")
      .single();

    if (error) {
      throw new Error(`저장에 실패했습니다: ${error.message}`);
    }
    if (!updated?.id) throw new Error("저장 후 ID를 받지 못했습니다.");
    return { artifactId: updated.id };
  }

  const { data: inserted, error } = await supabase
    .from("artifacts")
    .insert({
      project_id: projectId,
      artifact_type: "form",
      stage_id: STAGE_ID,
      slots,
      hypothesis_board: false,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(`자료 생성에 실패했습니다: ${error.message}`);
  }
  if (!inserted?.id) throw new Error("생성 후 ID를 받지 못했습니다.");
  return { artifactId: inserted.id };
}

export async function touchProjectPhaseStage3(projectId: string) {
  const supabase = createClient();
  await ensureAuthSession(supabase);
  await supabase
    .from("projects")
    .update({ current_phase: "공감하기 · 단계 3" })
    .eq("id", projectId);
}
