import { createClient } from "@/lib/supabase/client";
import { ensureAuthSession } from "@/lib/supabase/ensureSession";
import {
  defaultPrototype,
  hasPrototypeContent,
  normalizePrototype,
  type PrototypeData,
} from "@/lib/stages/stage10/prototypeTypes";
import type {
  ArtifactRow,
  ArtifactSlot,
  ArtifactSlots,
  ArtifactUpdate,
  ConfidenceLevel,
  SlotState,
} from "@/types/database";

const STAGE_ID = 10;

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

function prototypeState(data: PrototypeData): SlotState {
  if (!hasPrototypeContent(data)) return "empty";
  return "complete";
}

export function prototypeToSlot(data: PrototypeData): ArtifactSlot {
  return makeSlot(
    { prototype: data },
    hasPrototypeContent(data) ? "hypothesis" : "discovery",
    prototypeState(data),
  );
}

export function slotToPrototype(slots: ArtifactSlots): PrototypeData {
  const raw = slots.prototype_html?.content;
  if (!raw || typeof raw !== "object") return defaultPrototype();
  const proto = (raw as { prototype?: unknown }).prototype;
  return normalizePrototype(proto as Partial<PrototypeData> | null | undefined);
}

export async function fetchStage10Prototype(projectId: string): Promise<{
  data: PrototypeData;
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
    throw new Error(`단계 10 자료를 불러오지 못했습니다: ${error.message}`);
  }

  if (!data) {
    return {
      data: defaultPrototype(),
      artifactId: null,
      allSlots: {},
    };
  }

  const row = data as ArtifactRow;
  const slots = row.slots ?? {};
  return {
    data: slotToPrototype(slots),
    artifactId: row.id,
    allSlots: slots,
  };
}

export async function saveStage10Prototype({
  projectId,
  artifactId,
  data,
  existingSlots,
}: {
  projectId: string;
  artifactId: string | null;
  data: PrototypeData;
  existingSlots?: ArtifactSlots;
}): Promise<{ artifactId: string }> {
  const supabase = createClient();
  await ensureAuthSession(supabase);

  const slots: ArtifactSlots = {
    ...(existingSlots ?? {}),
    prototype_html: prototypeToSlot(data),
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
      throw new Error(`단계 10 저장에 실패했습니다: ${error.message}`);
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
    throw new Error(`단계 10 생성에 실패했습니다: ${error.message}`);
  }
  if (!inserted?.id) {
    throw new Error("생성 후 artifact ID를 받지 못했습니다.");
  }
  return { artifactId: inserted.id };
}
