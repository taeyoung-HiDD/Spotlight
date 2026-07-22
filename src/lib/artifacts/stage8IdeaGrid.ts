import { createClient } from "@/lib/supabase/client";
import { ensureAuthSession } from "@/lib/supabase/ensureSession";
import {
  defaultIdeaGrid,
  filledIdeaCount,
  hasIdeaGridContent,
  normalizeIdeaGrid,
  type IdeaGridData,
} from "@/lib/stages/stage8/ideaGridTypes";
import type {
  ArtifactRow,
  ArtifactSlot,
  ArtifactSlots,
  ArtifactUpdate,
  ConfidenceLevel,
  SlotState,
} from "@/types/database";

const STAGE_ID = 8;

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

function ideaGridState(data: IdeaGridData): SlotState {
  const filled = filledIdeaCount(data);
  if (filled === 0) return "empty";
  if (filled >= 3) return "complete";
  return "in_progress";
}

export function ideaGridToSlot(data: IdeaGridData): ArtifactSlot {
  return makeSlot({ ideaGrid: data }, "hypothesis", ideaGridState(data));
}

export function slotToIdeaGrid(slots: ArtifactSlots): IdeaGridData {
  const raw = slots.idea_grid?.content;
  if (!raw || typeof raw !== "object") return defaultIdeaGrid();
  const board = (raw as { ideaGrid?: unknown }).ideaGrid;
  return normalizeIdeaGrid(board as Partial<IdeaGridData> | null | undefined);
}

export async function fetchStage8IdeaGrid(projectId: string): Promise<{
  data: IdeaGridData;
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
    throw new Error(`단계 8 자료를 불러오지 못했습니다: ${error.message}`);
  }

  if (!data) {
    return { data: defaultIdeaGrid(), artifactId: null, allSlots: {} };
  }

  const row = data as ArtifactRow;
  const slots = row.slots ?? {};
  return {
    data: slotToIdeaGrid(slots),
    artifactId: row.id,
    allSlots: slots,
  };
}

export async function saveStage8IdeaGrid({
  projectId,
  artifactId,
  data,
  existingSlots,
}: {
  projectId: string;
  artifactId: string | null;
  data: IdeaGridData;
  existingSlots?: ArtifactSlots;
}): Promise<{ artifactId: string }> {
  const supabase = createClient();
  await ensureAuthSession(supabase);

  const slots: ArtifactSlots = {
    ...(existingSlots ?? {}),
    idea_grid: ideaGridToSlot(data),
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
      throw new Error(`단계 8 저장에 실패했습니다: ${error.message}`);
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
    throw new Error(`단계 8 생성에 실패했습니다: ${error.message}`);
  }
  if (!inserted?.id) {
    throw new Error("생성 후 artifact ID를 받지 못했습니다.");
  }
  return { artifactId: inserted.id };
}

export { hasIdeaGridContent };
