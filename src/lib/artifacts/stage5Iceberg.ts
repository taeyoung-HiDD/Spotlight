import { createClient } from "@/lib/supabase/client";
import { ensureAuthSession } from "@/lib/supabase/ensureSession";
import {
  DEFAULT_ICEBERG_PREP,
  EMPTY_ICEBERG_DATA,
} from "@/lib/stages/iceberg/defaults";
import { resolveIcebergPrepFromLoad } from "@/lib/stages/iceberg/stage5IcebergDiscoveryFlow";
import type { IcebergDecision, IcebergModelData } from "@/lib/stages/iceberg/types";
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

function layerState(items: string[]): SlotState {
  const filled = items.map((s) => s.trim()).filter(Boolean);
  if (filled.length === 0) return "empty";
  return "complete";
}

function latentState(latent: IcebergModelData["latent"]): SlotState {
  const has =
    latent.headline.trim() ||
    latent.quote.trim() ||
    latent.evidence.trim();
  if (!has) return "empty";
  return latent.headline.trim() && latent.quote.trim()
    ? "complete"
    : "in_progress";
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

export function icebergDataToSlots(data: IcebergModelData): ArtifactSlots {
  return {
    prep: makeSlot(
      { icebergPrep: data.prep },
      "discovery",
      data.prep.phase === "refining" ? "complete" : "in_progress",
    ),
    explicit: makeSlot(
      { items: data.explicit.items },
      "discovery",
      layerState(data.explicit.items),
    ),
    tacit: makeSlot(
      { items: data.tacit.items, autoNote: data.tacitAutoNote },
      "discovery",
      layerState(data.tacit.items),
    ),
    latent: makeSlot(data.latent, "hypothesis", latentState(data.latent)),
    decision: makeSlot(
      { action: data.decision },
      "hypothesis",
      data.decision ? "complete" : "empty",
    ),
  };
}

function parseItems(raw: unknown): string[] {
  if (!raw || typeof raw !== "object") return [];
  const items = (raw as { items?: unknown }).items;
  if (!Array.isArray(items)) return [];
  return items.filter((x): x is string => typeof x === "string");
}

function parseLatent(raw: unknown): IcebergModelData["latent"] {
  if (!raw || typeof raw !== "object") {
    return { headline: "", quote: "", evidence: "" };
  }
  const o = raw as Record<string, unknown>;
  return {
    headline: typeof o.headline === "string" ? o.headline : "",
    quote: typeof o.quote === "string" ? o.quote : "",
    evidence: typeof o.evidence === "string" ? o.evidence : "",
  };
}

export function slotsToIcebergData(slots: ArtifactSlots): IcebergModelData {
  const prepSlot = slots.prep?.content;
  const explicit = slots.explicit?.content;
  const tacit = slots.tacit?.content;
  const latent = slots.latent?.content;
  const decision = slots.decision?.content;

  let action: IcebergDecision | null = null;
  if (decision && typeof decision === "object" && decision !== null) {
    const a = (decision as { action?: unknown }).action;
    if (a === "accept" || a === "refine" || a === "why_ladder") {
      action = a;
    }
  }

  const tacitNote =
    tacit && typeof tacit === "object" && "autoNote" in tacit
      ? String((tacit as { autoNote?: string }).autoNote ?? "")
      : "";

  const layers = {
    explicit: { items: parseItems(explicit) },
    tacit: { items: parseItems(tacit) },
    tacitAutoNote: tacitNote,
    latent: parseLatent(latent),
  };

  let prepRaw: unknown;
  if (prepSlot && typeof prepSlot === "object") {
    prepRaw = (prepSlot as { icebergPrep?: unknown }).icebergPrep;
  }

  return {
    prep: resolveIcebergPrepFromLoad(prepRaw, layers),
    ...layers,
    decision: action,
  };
}

export async function fetchStage5IcebergArtifact(
  projectId: string,
): Promise<{ data: IcebergModelData; artifactId: string | null }> {
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
    throw new Error(`단계 5 자료를 불러오지 못했습니다: ${error.message}`);
  }

  if (!data) {
    return { data: { ...EMPTY_ICEBERG_DATA, prep: { ...DEFAULT_ICEBERG_PREP } }, artifactId: null };
  }

  const row = data as ArtifactRow;
  const parsed = slotsToIcebergData(row.slots ?? {});
  return {
    data: parsed,
    artifactId: row.id,
  };
}

export interface SaveIcebergOptions {
  projectId: string;
  artifactId: string | null;
  data: IcebergModelData;
  decision?: IcebergDecision | null;
}

export async function saveStage5IcebergArtifact({
  projectId,
  artifactId,
  data,
  decision,
}: SaveIcebergOptions): Promise<{ artifactId: string }> {
  const supabase = createClient();
  await ensureAuthSession(supabase);
  const payload: IcebergModelData = {
    ...data,
    decision: decision !== undefined ? decision : data.decision,
  };
  const slots = icebergDataToSlots(payload);

  if (artifactId) {
    const update: ArtifactUpdate = {
      slots,
      hypothesis_board: true,
    };
    const { data: updated, error } = await supabase
      .from("artifacts")
      .update(update)
      .eq("id", artifactId)
      .select("id")
      .single();

    if (error) {
      throw new Error(`단계 5 자료 저장에 실패했습니다: ${error.message}`);
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

/** 프로젝트 메타 갱신(선택) — 단계 5 완료 시 current_phase */
export async function touchProjectPhase(projectId: string) {
  const supabase = createClient();
  await ensureAuthSession(supabase);
  await supabase
    .from("projects")
    .update({ current_phase: "발견 정리하기 · 단계 5" })
    .eq("id", projectId);
}

