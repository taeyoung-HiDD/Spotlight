import { createClient } from "@/lib/supabase/client";
import { ensureAuthSession } from "@/lib/supabase/ensureSession";
import {
  defaultUserJourneyMap,
  hasJourneyContent,
  normalizeUserJourneyMap,
  type UserJourneyMapData,
} from "@/lib/stages/stage6/userJourneyTypes";
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

function journeyState(data: UserJourneyMapData): SlotState {
  if (!hasJourneyContent(data)) return "empty";
  const hasAssignment = Object.values(data.personas).some((persona) =>
    persona.steps.some((s) => s.itemIds.length > 0),
  );
  if (hasAssignment) return "complete";
  return "in_progress";
}

export function userJourneyToSlot(data: UserJourneyMapData): ArtifactSlot {
  return makeSlot(
    { userJourneyMap: data },
    "discovery",
    journeyState(data),
  );
}

export function slotToUserJourney(slots: ArtifactSlots): UserJourneyMapData {
  const raw = slots.journey_map?.content;
  if (!raw || typeof raw !== "object") return defaultUserJourneyMap();
  const map = (raw as { userJourneyMap?: unknown }).userJourneyMap;
  return normalizeUserJourneyMap(
    map as Partial<UserJourneyMapData> | null | undefined,
  );
}

export async function fetchStage6UserJourney(projectId: string): Promise<{
  data: UserJourneyMapData;
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
    throw new Error(`단계 6 자료를 불러오지 못했습니다: ${error.message}`);
  }

  if (!data) {
    return {
      data: defaultUserJourneyMap(),
      artifactId: null,
      allSlots: {},
    };
  }

  const row = data as ArtifactRow;
  const slots = row.slots ?? {};
  return {
    data: slotToUserJourney(slots),
    artifactId: row.id,
    allSlots: slots,
  };
}

export async function saveStage6UserJourney({
  projectId,
  artifactId,
  data,
  existingSlots,
}: {
  projectId: string;
  artifactId: string | null;
  data: UserJourneyMapData;
  existingSlots?: ArtifactSlots;
}): Promise<{ artifactId: string }> {
  const supabase = createClient();
  await ensureAuthSession(supabase);

  const slots: ArtifactSlots = {
    ...(existingSlots ?? {}),
    journey_map: userJourneyToSlot(data),
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
      throw new Error(`단계 6 저장에 실패했습니다: ${error.message}`);
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
    throw new Error(`단계 6 생성에 실패했습니다: ${error.message}`);
  }
  if (!inserted?.id) {
    throw new Error("생성 후 artifact ID를 받지 못했습니다.");
  }
  return { artifactId: inserted.id };
}
