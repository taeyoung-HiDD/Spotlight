import {
  normalizeNemotronPersonaProfile,
  type NemotronPersonaProfile,
} from "@/lib/personas/nemotronPersona";
import {
  applyStage3EmpathyDraftToMaps,
  normalizeStage3EmpathyDraftMaps,
  type Stage3EmpathyDraftInput,
  type Stage3EmpathyDraftMap,
} from "@/lib/stages/fieldResearch/generateStage3EmpathyDraft";
import type { Stage4PersonaEmpathyMap } from "@/lib/stages/stage4/types";

function normalizeProfiles(
  raw: unknown,
): Array<NemotronPersonaProfile | undefined> {
  if (!Array.isArray(raw)) return [];
  return raw.map((p) => normalizeNemotronPersonaProfile(p));
}

export async function generateStage3EmpathyMapDraft(
  input: Stage3EmpathyDraftInput,
): Promise<{
  maps: Stage3EmpathyDraftMap[];
  profiles: Array<NemotronPersonaProfile | undefined>;
  source: string;
}> {
  const res = await fetch("/api/stage3/empathy-map-draft", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = (await res.json()) as {
    maps?: Stage3EmpathyDraftMap[];
    profiles?: unknown;
    source?: string;
    error?: string;
  };
  const profiles = normalizeProfiles(data.profiles);

  if (!res.ok) {
    if (Array.isArray(data.maps) && data.maps.length) {
      return {
        maps: normalizeStage3EmpathyDraftMaps(data.maps, input),
        profiles,
        source: data.source ?? "heuristic_fallback",
      };
    }
    throw new Error(data.error ?? "공감맵 초안 생성에 실패했습니다.");
  }

  if (!Array.isArray(data.maps) || !data.maps.length) {
    throw new Error(data.error ?? "공감맵 초안을 받지 못했습니다.");
  }

  return {
    maps: normalizeStage3EmpathyDraftMaps(data.maps, input),
    profiles,
    source: data.source ?? "unknown",
  };
}

export async function fillStage3EmpathyMapsWithAiDraft(
  existing: Stage4PersonaEmpathyMap[],
  input: Stage3EmpathyDraftInput,
): Promise<Stage4PersonaEmpathyMap[]> {
  const { maps, profiles } = await generateStage3EmpathyMapDraft(input);
  return applyStage3EmpathyDraftToMaps(existing, maps, profiles);
}
