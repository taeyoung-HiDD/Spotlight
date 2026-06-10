import { createClient } from "@/lib/supabase/client";
import { ensureAuthSession } from "@/lib/supabase/ensureSession";
import { quadrantHasContent } from "@/lib/stages/stage4/empathySticky";
import { normalizeResearchSynthesis } from "@/lib/stages/stage4/researchSynthesisTypes";
import {
  defaultStage4Data,
  normalizeStage4Data,
  type Stage4DiscoveriesData,
} from "@/lib/stages/stage4/types";
import type {
  ArtifactRow,
  ArtifactSlot,
  ArtifactSlots,
  ArtifactUpdate,
  ConfidenceLevel,
  SlotState,
} from "@/types/database";

const STAGE_ID = 4;

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

function calcState(data: Stage4DiscoveriesData): SlotState {
  const hasAny = data.empathyMaps.some(
    (m) =>
      m.personaName.trim() ||
      m.personaContext.trim() ||
      quadrantHasContent(m.quadrants.says) ||
      quadrantHasContent(m.quadrants.thinks) ||
      quadrantHasContent(m.quadrants.does) ||
      quadrantHasContent(m.quadrants.feels),
  );
  if (!hasAny) return "empty";
  const complete = data.empathyMaps.every(
    (m) =>
      m.personaName.trim() &&
      Object.values(m.quadrants).every((items) => quadrantHasContent(items)),
  );
  return complete ? "complete" : "in_progress";
}

function calcSynthesisState(data: Stage4DiscoveriesData): SlotState {
  const rs = data.researchSynthesis;
  const hasNotes = rs.notes.some((n) => n.text.trim());
  const hasSubjects = rs.subjects.some((s) => s.name.trim());
  if (!hasNotes && !hasSubjects && !rs.teamDebriefNote.trim()) return "empty";
  if (hasNotes && rs.subjects.filter((s) => s.name.trim()).length >= 2) {
    return "complete";
  }
  return "in_progress";
}

function toSlots(data: Stage4DiscoveriesData): ArtifactSlots {
  return {
    empathy_maps: makeSlot(
      {
        personaTargetCount: data.personaTargetCount,
        empathyMaps: data.empathyMaps,
      },
      "discovery",
      calcState(data),
    ),
    research_synthesis: makeSlot(
      {
        ...data.researchSynthesis,
        workflowPhase: data.workflowPhase,
      },
      "discovery",
      calcSynthesisState(data),
    ),
    synthesis: makeSlot(
      { note: data.synthesisNote },
      "hypothesis",
      data.synthesisNote.trim() ? "in_progress" : "empty",
    ),
  };
}

function fromSlots(slots: ArtifactSlots): Stage4DiscoveriesData {
  const maps = slots.empathy_maps?.content;
  const synthesisSlot = slots.synthesis?.content;
  const researchSlot = slots.research_synthesis?.content;
  const raw =
    maps && typeof maps === "object"
      ? (maps as Partial<Stage4DiscoveriesData>)
      : null;
  const normalized = normalizeStage4Data(raw);
  if (researchSlot && typeof researchSlot === "object") {
    const rs = researchSlot as Record<string, unknown>;
    const { workflowPhase: _phase, ...synthesisFields } = rs;
    normalized.researchSynthesis = normalizeResearchSynthesis(
      synthesisFields as Partial<Stage4DiscoveriesData["researchSynthesis"]>,
    );
    if (rs.workflowPhase === "research_synthesis") {
      normalized.workflowPhase = "research_synthesis";
    }
  }
  if (synthesisSlot && typeof synthesisSlot === "object" && "note" in synthesisSlot) {
    normalized.synthesisNote = String(
      (synthesisSlot as { note?: unknown }).note ?? "",
    );
  }
  return normalized;
}

export async function fetchStage4Discoveries(projectId: string): Promise<{
  data: Stage4DiscoveriesData;
  artifactId: string | null;
}> {
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

  if (error) throw new Error(`단계 4 자료를 불러오지 못했습니다: ${error.message}`);
  if (!data) return { data: defaultStage4Data(), artifactId: null };
  const row = data as ArtifactRow;
  return { data: fromSlots(row.slots ?? {}), artifactId: row.id };
}

export async function saveStage4Discoveries({
  projectId,
  artifactId,
  data,
}: {
  projectId: string;
  artifactId: string | null;
  data: Stage4DiscoveriesData;
}): Promise<{ artifactId: string }> {
  const supabase = createClient();
  await ensureAuthSession(supabase);
  const slots = toSlots(data);

  if (artifactId) {
    const update: ArtifactUpdate = { slots, hypothesis_board: true };
    const { data: updated, error } = await supabase
      .from("artifacts")
      .update(update)
      .eq("id", artifactId)
      .select("id")
      .single();
    if (error) throw new Error(`단계 4 저장에 실패했습니다: ${error.message}`);
    if (!updated?.id) throw new Error("저장 후 artifact ID를 받지 못했습니다.");
    return { artifactId: updated.id };
  }

  const { data: inserted, error } = await supabase
    .from("artifacts")
    .insert({
      project_id: projectId,
      artifact_type: "form",
      stage_id: STAGE_ID,
      slots,
      hypothesis_board: true,
    })
    .select("id")
    .single();
  if (error) throw new Error(`단계 4 생성에 실패했습니다: ${error.message}`);
  if (!inserted?.id) throw new Error("생성 후 artifact ID를 받지 못했습니다.");
  return { artifactId: inserted.id };
}
