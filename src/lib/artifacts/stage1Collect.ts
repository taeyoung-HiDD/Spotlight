import { createClient } from "@/lib/supabase/client";
import { ensureAuthSession } from "@/lib/supabase/ensureSession";
import {
  normalizeLegacyCollectStep,
  type Stage1CollectStep,
} from "@/lib/stages/stage1/collectFlow";
import type { UserCoachingLevel } from "@/lib/stages/stage1/levelDiagnostic";
import type { GuidanceStyle } from "@/lib/stages/stage1/guidanceStyle";
import type { ArtifactSlots, ConfidenceLevel, SlotState } from "@/types/database";

export interface Stage1PersistedState {
  startingPoint: string;
  projectTitle: string;
  teamWantsCollaboration: boolean | null;
  collectStep: Stage1CollectStep;
  displayName?: string;
  userLevel?: UserCoachingLevel;
  guidanceStyle?: GuidanceStyle;
  hope: string;
  fear: string;
  principleAck: boolean;
}

const SLOT_KEY = "stage1_collect";

function emptySlot(
  content: Stage1PersistedState,
  state: SlotState = "in_progress",
): ArtifactSlots {
  const base = {
    state,
    content,
    confidence: "discovery" as ConfidenceLevel,
    source_refs: [],
    updated_by: "user" as const,
    updated_at: new Date().toISOString(),
  };
  return { [SLOT_KEY]: base };
}

export const DEFAULT_STAGE1_STATE: Stage1PersistedState = {
  startingPoint: "",
  projectTitle: "",
  teamWantsCollaboration: null,
  collectStep: "starting_point",
  hope: "",
  fear: "",
  principleAck: false,
};

function parseState(slots: ArtifactSlots | null | undefined): Stage1PersistedState {
  const raw = slots?.[SLOT_KEY]?.content;
  if (!raw || typeof raw !== "object") return { ...DEFAULT_STAGE1_STATE };
  const o = raw as Partial<Stage1PersistedState>;
  const startingPoint = typeof o.startingPoint === "string" ? o.startingPoint : "";
  let collectStep = normalizeLegacyCollectStep(
    String(o.collectStep ?? "starting_point"),
    {
      startingPoint,
      projectTitle: typeof o.projectTitle === "string" ? o.projectTitle : "",
      teamWantsCollaboration:
        typeof o.teamWantsCollaboration === "boolean"
          ? o.teamWantsCollaboration
          : o.teamWantsCollaboration === null
            ? null
            : null,
    },
  );
  return {
    ...DEFAULT_STAGE1_STATE,
    ...o,
    startingPoint,
    projectTitle: typeof o.projectTitle === "string" ? o.projectTitle : "",
    collectStep,
  };
}

export async function fetchStage1CollectState(
  projectId: string,
): Promise<{ artifactId: string | null; state: Stage1PersistedState }> {
  const supabase = createClient();
  await ensureAuthSession(supabase);

  const { data, error } = await supabase
    .from("artifacts")
    .select("id, slots")
    .eq("project_id", projectId)
    .eq("stage_id", 1)
    .eq("artifact_type", "form")
    .maybeSingle();

  if (error || !data) {
    return { artifactId: null, state: { ...DEFAULT_STAGE1_STATE } };
  }

  return {
    artifactId: data.id,
    state: parseState(data.slots as ArtifactSlots),
  };
}

export async function saveStage1CollectState(
  projectId: string,
  state: Stage1PersistedState,
  artifactId: string | null,
): Promise<string> {
  const supabase = createClient();
  await ensureAuthSession(supabase);

  let mergedState = state;
  let resolvedId = artifactId;

  if (resolvedId) {
    const { data: existingRow } = await supabase
      .from("artifacts")
      .select("slots")
      .eq("id", resolvedId)
      .maybeSingle();
    if (existingRow?.slots) {
      const existing = parseState(existingRow.slots as ArtifactSlots);
      mergedState = {
        ...existing,
        ...state,
        guidanceStyle: state.guidanceStyle ?? existing.guidanceStyle,
        userLevel: state.userLevel ?? existing.userLevel,
      };
    }
  }

  const slots = emptySlot(
    mergedState,
    mergedState.principleAck &&
      mergedState.startingPoint.trim() &&
      mergedState.projectTitle.trim()
      ? "complete"
      : "in_progress",
  );
  const titleSnippet = (
    mergedState.projectTitle.trim() || mergedState.startingPoint.trim()
  ).slice(0, 80);

  if (resolvedId) {
    const { error } = await supabase
      .from("artifacts")
      .update({ slots })
      .eq("id", resolvedId);
    if (error) throw new Error(error.message);
  } else {
    const { data, error } = await supabase
      .from("artifacts")
      .insert({
        project_id: projectId,
        stage_id: 1,
        artifact_type: "form",
        slots,
        hypothesis_board: false,
      })
      .select("id")
      .single();
    if (error || !data?.id) {
      throw new Error(error?.message ?? "artifact insert failed");
    }
    resolvedId = data.id;
  }

  const projectPatch: { title?: string; description?: string } = {};
  if (titleSnippet) projectPatch.title = titleSnippet;
  const problemSnippet = mergedState.startingPoint.trim();
  if (problemSnippet) projectPatch.description = problemSnippet.slice(0, 500);
  if (Object.keys(projectPatch).length > 0) {
    await supabase.from("projects").update(projectPatch).eq("id", projectId);
  }

  if (!resolvedId) throw new Error("artifact id missing after save");
  return resolvedId;
}
