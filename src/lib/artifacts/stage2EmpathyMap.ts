import { createClient } from "@/lib/supabase/client";
import { ensureAuthSession } from "@/lib/supabase/ensureSession";
import type { EmpathyMapData } from "@/lib/stages/stage2/empathyMap";
import { emptyEmpathyMapQuadrants } from "@/lib/stages/stage2/empathyMap";
import { normalizeContextualPrep } from "@/lib/stages/stage2/contextualDiscoveryFlow";
import {
  contextualResearchForSave,
  emptyContextualDimensionResearch,
  normalizeContextualDimensionResearch,
} from "@/lib/stages/stage2/contextualDimensionResearch";
import { resolvePersonaQnaFromLoad } from "@/lib/stages/stage2/empathyDiscovery";
import type {
  ArtifactRow,
  ArtifactSlot,
  ArtifactSlots,
  ArtifactUpdate,
  ConfidenceLevel,
  SlotState,
} from "@/types/database";

const STAGE_ID = 2;
const SLOT_KEY = "empathy_map";

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

function calcState(data: EmpathyMapData): SlotState {
  const nameOk = data.personaName.trim().length > 0;
  const hasAny =
    nameOk ||
    data.personaSituationRaw.trim().length > 0 ||
    Object.values(data.quadrants).some((arr) => arr.length > 0);
  if (!hasAny) return "empty";
  const perQuadOk = Object.values(data.quadrants).every((arr) => arr.length >= 2);
  return nameOk && perQuadOk ? "complete" : "in_progress";
}

export function stage2EmpathyToSlots(data: EmpathyMapData): ArtifactSlots {
  return {
    [SLOT_KEY]: makeSlot(
      {
        personaName: data.personaName,
        personaContext: data.personaContext,
        personaSituationRaw: data.personaSituationRaw,
        personaThumbnailUrl: data.personaThumbnailUrl,
        personaQnaComplete: data.personaQnaComplete,
        contextualInsights: data.contextualInsights,
        toKnowUnknowns: data.toKnowUnknowns,
        contextualPrep: data.contextualPrep,
        contextualDimensionResearch: contextualResearchForSave(
          data.contextualDimensionResearch,
        ),
        quadrants: data.quadrants,
      },
      "hypothesis",
      calcState(data),
    ),
  };
}

function parseStage2(slots: ArtifactSlots): EmpathyMapData {
  const raw = slots[SLOT_KEY]?.content;
  const base: EmpathyMapData = {
    personaName: "",
    personaContext: "",
    personaSituationRaw: "",
    personaThumbnailUrl: "",
    personaQnaComplete: false,
    contextualInsights: "",
    toKnowUnknowns: [],
    contextualPrep: normalizeContextualPrep(null),
    contextualDimensionResearch: emptyContextualDimensionResearch(),
    quadrants: emptyEmpathyMapQuadrants(),
  };
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;
  const quadrants =
    o.quadrants && typeof o.quadrants === "object"
      ? (o.quadrants as EmpathyMapData["quadrants"])
      : base.quadrants;
  const quadrantsParsed = {
      says: Array.isArray(quadrants?.says) ? quadrants.says : [],
      thinks: Array.isArray(quadrants?.thinks) ? quadrants.thinks : [],
      does: Array.isArray(quadrants?.does) ? quadrants.does : [],
      feels: Array.isArray(quadrants?.feels) ? quadrants.feels : [],
  };

  const contextualPrep = normalizeContextualPrep(o.contextualPrep);
  const contextualDimensionResearch = normalizeContextualDimensionResearch(
    o.contextualDimensionResearch,
  );

  const partial = {
    personaName: typeof o.personaName === "string" ? o.personaName : "",
    personaContext: typeof o.personaContext === "string" ? o.personaContext : "",
    personaSituationRaw:
      typeof o.personaSituationRaw === "string" ? o.personaSituationRaw : "",
    personaThumbnailUrl:
      typeof o.personaThumbnailUrl === "string" ? o.personaThumbnailUrl : "",
    contextualInsights:
      typeof o.contextualInsights === "string" ? o.contextualInsights : "",
    toKnowUnknowns: Array.isArray(o.toKnowUnknowns)
      ? o.toKnowUnknowns.filter((x): x is string => typeof x === "string")
      : [],
    contextualPrep,
    contextualDimensionResearch,
    quadrants: quadrantsParsed,
  };

  return {
    ...partial,
    personaQnaComplete: resolvePersonaQnaFromLoad(
      o.personaQnaComplete,
      partial,
    ),
  };
}

export async function fetchStage2EmpathyMap(projectId: string): Promise<{
  data: EmpathyMapData;
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
    throw new Error(`공감맵을 불러오지 못했습니다: ${error.message}`);
  }
  if (!data) {
    return {
      data: {
        personaName: "",
        personaContext: "",
        personaSituationRaw: "",
        personaThumbnailUrl: "",
        personaQnaComplete: false,
        contextualInsights: "",
        toKnowUnknowns: [],
        contextualPrep: normalizeContextualPrep(null),
        contextualDimensionResearch: emptyContextualDimensionResearch(),
        quadrants: emptyEmpathyMapQuadrants(),
      },
      artifactId: null,
    };
  }
  const row = data as ArtifactRow;
  return { data: parseStage2(row.slots ?? {}), artifactId: row.id };
}

export async function saveStage2EmpathyMap({
  projectId,
  artifactId,
  data,
}: {
  projectId: string;
  artifactId: string | null;
  data: EmpathyMapData;
}): Promise<{ artifactId: string }> {
  const supabase = createClient();
  await ensureAuthSession(supabase);
  const slots = stage2EmpathyToSlots(data);

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

