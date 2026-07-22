import { createClient } from "@/lib/supabase/client";
import { ensureAuthSession } from "@/lib/supabase/ensureSession";
import {
  defaultStage7Hmw,
  hasHmwContent,
  hasLatentNeedPool,
  normalizeStage7Hmw,
  type Stage7HmwData,
} from "@/lib/stages/stage7/hmwTypes";
import type {
  ArtifactRow,
  ArtifactSlot,
  ArtifactSlots,
  ArtifactUpdate,
  ConfidenceLevel,
  SlotState,
} from "@/types/database";

const STAGE_ID = 7;

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

function hmwBoardState(data: Stage7HmwData): SlotState {
  if (!hasLatentNeedPool(data)) return "empty";
  const filled = data.questions.filter((q) => q.hmwText.trim());
  if (filled.length === 0) return "empty";
  const allFilled = data.questions.every(
    (q) => !q.latentNeedText.trim() || q.hmwText.trim(),
  );
  if (allFilled && hasHmwContent(data)) return "complete";
  return "in_progress";
}

export function hmwToSlot(data: Stage7HmwData): ArtifactSlot {
  return makeSlot({ hmwBoard: data }, "hypothesis", hmwBoardState(data));
}

export function slotToHmw(slots: ArtifactSlots): Stage7HmwData {
  const raw = slots.hmw_board?.content;
  if (!raw || typeof raw !== "object") return defaultStage7Hmw();
  const board = (raw as { hmwBoard?: unknown }).hmwBoard;
  return normalizeStage7Hmw(
    board as Partial<Stage7HmwData> | null | undefined,
  );
}

export async function fetchStage7Hmw(projectId: string): Promise<{
  data: Stage7HmwData;
  artifactId: string | null;
  allSlots: ArtifactSlots;
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
    throw new Error(`단계 7 자료를 불러오지 못했습니다: ${error.message}`);
  }

  if (!data) {
    return {
      data: defaultStage7Hmw(),
      artifactId: null,
      allSlots: {},
    };
  }

  const row = data as ArtifactRow;
  const slots = row.slots ?? {};
  return {
    data: slotToHmw(slots),
    artifactId: row.id,
    allSlots: slots,
  };
}

export async function saveStage7Hmw({
  projectId,
  artifactId,
  data,
  existingSlots,
}: {
  projectId: string;
  artifactId: string | null;
  data: Stage7HmwData;
  existingSlots?: ArtifactSlots;
}): Promise<{ artifactId: string }> {
  const supabase = createClient();
  await ensureAuthSession(supabase);

  const slots: ArtifactSlots = {
    ...(existingSlots ?? {}),
    hmw_board: hmwToSlot(data),
  };

  if (artifactId) {
    const update: ArtifactUpdate = { slots, hypothesis_board: true };
    const { data: updated, error } = await supabase
      .from("artifacts")
      .update(update)
      .eq("id", artifactId)
      .select("id")
      .single();
    if (error) {
      throw new Error(`단계 7 저장에 실패했습니다: ${error.message}`);
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
    throw new Error(`단계 7 생성에 실패했습니다: ${error.message}`);
  }
  if (!inserted?.id) {
    throw new Error("생성 후 artifact ID를 받지 못했습니다.");
  }
  return { artifactId: inserted.id };
}
