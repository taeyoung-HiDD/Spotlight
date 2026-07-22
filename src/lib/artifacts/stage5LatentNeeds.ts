import { createClient } from "@/lib/supabase/client";
import { ensureAuthSession } from "@/lib/supabase/ensureSession";
import {
  defaultStage5LatentNeeds,
  hasLatentNeedsContent,
  normalizeStage5LatentNeeds,
  type Stage5LatentNeedsData,
} from "@/lib/stages/stage5/latentNeedsTypes";
import type {
  ArtifactRow,
  ArtifactSlot,
  ArtifactSlots,
  ArtifactUpdate,
  ConfidenceLevel,
  SlotState,
} from "@/types/database";

const STAGE_ID = 6;

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

function needsBoardState(data: Stage5LatentNeedsData): SlotState {
  if (!hasLatentNeedsContent(data)) return "empty";
  const hasLatent = data.postits.some(
    (p) => p.kind === "latent_need" && p.text.trim(),
  );
  const hasSource = data.postits.some(
    (p) =>
      (p.kind === "quote" || p.kind === "observation") && p.text.trim(),
  );
  if (hasLatent && hasSource) return "complete";
  return "in_progress";
}

export function latentNeedsToSlot(data: Stage5LatentNeedsData): ArtifactSlot {
  return makeSlot(
    { latentNeedsBoard: data },
    "hypothesis",
    needsBoardState(data),
  );
}

export function slotToLatentNeeds(slots: ArtifactSlots): Stage5LatentNeedsData {
  const raw = slots.needs_board?.content;
  if (!raw || typeof raw !== "object") return defaultStage5LatentNeeds();
  const board = (raw as { latentNeedsBoard?: unknown }).latentNeedsBoard;
  return normalizeStage5LatentNeeds(
    board as Partial<Stage5LatentNeedsData> | null | undefined,
  );
}

export async function fetchStage5LatentNeeds(projectId: string): Promise<{
  data: Stage5LatentNeedsData;
  artifactId: string | null;
  allSlots: ArtifactSlots;
}> {
  const supabase = createClient();
  await ensureAuthSession(supabase);

  const loadByStage = async (stageId: number) => {
    const { data, error } = await supabase
      .from("artifacts")
      .select("*")
      .eq("project_id", projectId)
      .eq("stage_id", stageId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) {
      throw new Error(
        `니즈 분석 자료를 불러오지 못했습니다: ${error.message}`,
      );
    }
    return data as ArtifactRow | null;
  };

  let row = await loadByStage(STAGE_ID);
  // 마이그레이션 전 레거시(stage_id=5 + needs_board) 폴백
  if (!row?.slots?.needs_board) {
    const legacy = await loadByStage(5);
    if (legacy?.slots?.needs_board) row = legacy;
  }

  if (!row) {
    return {
      data: defaultStage5LatentNeeds(),
      artifactId: null,
      allSlots: {},
    };
  }

  const slots = row.slots ?? {};
  return {
    data: slotToLatentNeeds(slots),
    artifactId: row.id,
    allSlots: slots,
  };
}

export async function saveStage5LatentNeeds({
  projectId,
  artifactId,
  data,
  existingSlots,
}: {
  projectId: string;
  artifactId: string | null;
  data: Stage5LatentNeedsData;
  existingSlots?: ArtifactSlots;
}): Promise<{ artifactId: string }> {
  const supabase = createClient();
  await ensureAuthSession(supabase);
  const slots: ArtifactSlots = {
    ...(existingSlots ?? {}),
    needs_board: latentNeedsToSlot(data),
  };

  if (artifactId) {
    const update: ArtifactUpdate = {
      slots,
      hypothesis_board: true,
      stage_id: STAGE_ID,
    };
    const { data: updated, error } = await supabase
      .from("artifacts")
      .update(update)
      .eq("id", artifactId)
      .select("id")
      .single();

    if (error) {
      throw new Error(`니즈 분석 저장에 실패했습니다: ${error.message}`);
    }
    if (!updated?.id) {
      throw new Error("저장 후 artifact ID를 받지 못했습니다.");
    }
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

  if (error) {
    throw new Error(`단계 5 자료 생성에 실패했습니다: ${error.message}`);
  }
  if (!inserted?.id) {
    throw new Error("생성 후 artifact ID를 받지 못했습니다.");
  }
  return { artifactId: inserted.id };
}
