import { createClient } from "@/lib/supabase/client";
import { ensureAuthSession } from "@/lib/supabase/ensureSession";
import {
  defaultPrePmfOverview,
  normalizePrePmfOverview,
  prePmfHasSources,
  type PrePmfOverviewData,
} from "@/lib/stages/stage2/prePmfOverview";
import type {
  ArtifactRow,
  ArtifactSlot,
  ArtifactSlots,
  ArtifactUpdate,
  ConfidenceLevel,
  SlotState,
} from "@/types/database";

const STAGE_ID = 2;
const SLOT_KEY = "pre_pmf_overview";

function nowIso() {
  return new Date().toISOString();
}

function calcState(data: PrePmfOverviewData): SlotState {
  const hasAny =
    data.problemStatement.trim().length > 0 ||
    data.targetUsers.length > 0 ||
    data.marketSize.body.trim().length > 0;
  if (!hasAny) return "empty";
  return data.generationStatus === "done" ? "complete" : "in_progress";
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

export function stage2PrePmfToSlots(data: PrePmfOverviewData): ArtifactSlots {
  return {
    [SLOT_KEY]: makeSlot(
      data,
      prePmfHasSources(data) ? "discovery" : "hypothesis",
      calcState(data),
    ),
  };
}

function parseStage2(slots: ArtifactSlots): PrePmfOverviewData {
  const raw = slots[SLOT_KEY]?.content;
  if (!raw) return defaultPrePmfOverview();
  return normalizePrePmfOverview(raw);
}

export async function fetchStage2PrePmf(projectId: string): Promise<{
  data: PrePmfOverviewData;
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

  if (error) {
    throw new Error(`사전 조사 자료를 불러오지 못했습니다: ${error.message}`);
  }
  if (!data) {
    return { data: defaultPrePmfOverview(), artifactId: null };
  }
  const row = data as ArtifactRow;
  return { data: parseStage2(row.slots ?? {}), artifactId: row.id };
}

export async function saveStage2PrePmf({
  projectId,
  artifactId,
  data,
}: {
  projectId: string;
  artifactId: string | null;
  data: PrePmfOverviewData;
}): Promise<{ artifactId: string }> {
  const supabase = createClient();
  await ensureAuthSession(supabase);
  const slots = stage2PrePmfToSlots(data);

  if (artifactId) {
    const update: ArtifactUpdate = { slots, hypothesis_board: true };
    const { data: updated, error } = await supabase
      .from("artifacts")
      .update(update)
      .eq("id", artifactId)
      .select("id")
      .single();
    if (error) throw new Error(`저장에 실패했습니다: ${error.message}`);
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
  if (error) throw new Error(`생성에 실패했습니다: ${error.message}`);
  if (!inserted?.id) throw new Error("생성 후 artifact ID를 받지 못했습니다.");
  return { artifactId: inserted.id };
}
