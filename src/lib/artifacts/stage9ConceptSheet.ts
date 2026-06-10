import { createClient } from "@/lib/supabase/client";
import { ensureAuthSession } from "@/lib/supabase/ensureSession";
import {
  defaultConceptSheet,
  hasConceptSheetContent,
  normalizeConceptSheet,
  type ConceptSheetData,
} from "@/lib/stages/stage9/conceptSheetTypes";
import type {
  ArtifactRow,
  ArtifactSlot,
  ArtifactSlots,
  ArtifactUpdate,
  ConfidenceLevel,
  SlotState,
} from "@/types/database";

const STAGE_ID = 9;

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

function conceptState(data: ConceptSheetData): SlotState {
  if (!hasConceptSheetContent(data)) return "empty";
  const fieldsReady =
    data.conceptName.trim() &&
    data.oneLiner.trim() &&
    data.features.every((f) => f.trim()) &&
    data.trueNeed.trim();
  const hasImages = data.storyboardCuts.some((c) => c.imageUrl);
  if (fieldsReady && hasImages) return "complete";
  if (fieldsReady || hasImages || data.storyboardCuts.some((c) => c.caption.trim())) {
    return "in_progress";
  }
  return "in_progress";
}

export function conceptSheetToSlot(data: ConceptSheetData): ArtifactSlot {
  const hasAiImages = data.storyboardCuts.some((c) => c.imageUrl);
  return makeSlot(
    { conceptSheet: data },
    hasAiImages ? "hypothesis" : "discovery",
    conceptState(data),
  );
}

export function slotToConceptSheet(slots: ArtifactSlots): ConceptSheetData {
  const raw = slots.concept_sheet?.content;
  if (!raw || typeof raw !== "object") return defaultConceptSheet();
  const sheet = (raw as { conceptSheet?: unknown }).conceptSheet;
  return normalizeConceptSheet(
    sheet as Partial<ConceptSheetData> | null | undefined,
  );
}

export async function fetchStage9ConceptSheet(projectId: string): Promise<{
  data: ConceptSheetData;
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
    throw new Error(`단계 9 자료를 불러오지 못했습니다: ${error.message}`);
  }

  if (!data) {
    return {
      data: defaultConceptSheet(),
      artifactId: null,
      allSlots: {},
    };
  }

  const row = data as ArtifactRow;
  const slots = row.slots ?? {};
  return {
    data: slotToConceptSheet(slots),
    artifactId: row.id,
    allSlots: slots,
  };
}

export async function saveStage9ConceptSheet({
  projectId,
  artifactId,
  data,
  existingSlots,
}: {
  projectId: string;
  artifactId: string | null;
  data: ConceptSheetData;
  existingSlots?: ArtifactSlots;
}): Promise<{ artifactId: string }> {
  const supabase = createClient();
  await ensureAuthSession(supabase);

  const slots: ArtifactSlots = {
    ...(existingSlots ?? {}),
    concept_sheet: conceptSheetToSlot(data),
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
      throw new Error(`단계 9 저장에 실패했습니다: ${error.message}`);
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
    throw new Error(`단계 9 생성에 실패했습니다: ${error.message}`);
  }
  if (!inserted?.id) {
    throw new Error("생성 후 artifact ID를 받지 못했습니다.");
  }
  return { artifactId: inserted.id };
}
