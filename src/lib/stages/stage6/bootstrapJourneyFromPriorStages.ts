import { filterMeaningfulResearchSubjects } from "@/lib/stages/stage4/researchSynthesisTypes";
import type { Stage4DiscoveriesData } from "@/lib/stages/stage4/types";
import { pruneStage5LatentNeedsData } from "@/lib/stages/stage5/latentNeedsTypes";
import type { Stage5LatentNeedsData } from "@/lib/stages/stage5/latentNeedsTypes";
import type {
  JourneyMapItem,
  JourneyPersonaRef,
  UserJourneyMapData,
} from "@/lib/stages/stage6/userJourneyTypes";
import {
  ensureSubjectsAndPersonas,
  normalizeUserJourneyMap,
} from "@/lib/stages/stage6/userJourneyTypes";

function collectSubjects(
  stage4: Stage4DiscoveriesData,
  stage5: Stage5LatentNeedsData,
): JourneyPersonaRef[] {
  const prunedStage5 = pruneStage5LatentNeedsData(stage5);
  if (prunedStage5.subjects.length > 0) {
    return prunedStage5.subjects.map((s) => ({
      id: s.id,
      name: s.name,
      context: s.context,
      thumbnailUrl: s.thumbnailUrl,
    }));
  }

  return filterMeaningfulResearchSubjects(stage4.researchSynthesis).map((s) => ({
    id: s.id,
    name: s.name,
    context: s.context,
    thumbnailUrl: s.thumbnailUrl,
  }));
}

function collectResearchItems(
  stage4: Stage4DiscoveriesData,
  stage5: Stage5LatentNeedsData,
): JourneyMapItem[] {
  const items: JourneyMapItem[] = [];
  for (const note of stage4.researchSynthesis.notes) {
    if (note.kind !== "quote" && note.kind !== "observation") continue;
    const text = note.text.trim();
    if (!text) continue;
    items.push({
      id: `s4-${note.id}`,
      kind: note.kind,
      text,
      subjectId: note.subjectId,
      sourceId: note.id,
    });
  }

  for (const postit of stage5.postits) {
    if (postit.kind !== "latent_need") continue;
    const text = postit.text.trim();
    if (!text) continue;
    items.push({
      id: `s5-${postit.id}`,
      kind: "latent_need",
      text,
      subjectId: postit.subjectId,
      sourceId: postit.id,
    });
  }

  return items;
}

/** 4·5단계 조사·니즈를 페르소나별 여정 지도 풀에 병합 (기존 배치 유지) */
export function mergePriorStagesIntoJourney(
  current: UserJourneyMapData,
  stage4: Stage4DiscoveriesData,
  stage5: Stage5LatentNeedsData,
): UserJourneyMapData {
  const subjects = collectSubjects(stage4, stage5);
  let data = ensureSubjectsAndPersonas(
    normalizeUserJourneyMap(current),
    subjects,
  );

  const incoming = collectResearchItems(stage4, stage5);
  if (incoming.length === 0) return data;

  const itemsById = { ...data.itemsById };
  const personas = { ...data.personas };

  for (const item of incoming) {
    itemsById[item.id] = item;

    const persona = personas[item.subjectId];
    if (!persona) continue;

    const assigned = persona.steps.some((step) =>
      step.itemIds.includes(item.id),
    );
    if (assigned) continue;

    const poolItemIds = persona.poolItemIds.includes(item.id)
      ? persona.poolItemIds
      : [...persona.poolItemIds, item.id];

    personas[item.subjectId] = { ...persona, poolItemIds };
  }

  return {
    ...data,
    itemsById,
    personas,
    syncedFromStage4At: new Date().toISOString(),
    syncedFromStage5At: new Date().toISOString(),
  };
}
