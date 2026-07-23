import { isStage5SourcePostitKind } from "@/lib/stages/stage5/bootstrapLatentNeedsFromStage4";
import type {
  Stage5BoardPostit,
  Stage5LatentNeedsData,
} from "@/lib/stages/stage5/latentNeedsTypes";
import { suggestStepIndexForItem } from "@/lib/stages/stage6/bootstrapJourneyFromPriorStages";
import { allStepItemIds } from "@/lib/stages/stage6/journeyStepZones";
import type {
  JourneyMapItem,
  JourneyMapStep,
  UserJourneyMapData,
} from "@/lib/stages/stage6/userJourneyTypes";

export function placedLatentNeedIds(
  data: Stage5LatentNeedsData,
): Set<string> {
  const placed = new Set<string>();
  for (const ids of Object.values(data.journeyStepNeedIds ?? {})) {
    for (const id of ids) placed.add(id);
  }
  return placed;
}

export function poolLatentNeedPostits(
  data: Stage5LatentNeedsData,
  subjectId: string,
): Stage5BoardPostit[] {
  const placed = placedLatentNeedIds(data);
  return data.postits.filter(
    (p) =>
      p.subjectId === subjectId &&
      p.kind === "latent_need" &&
      !placed.has(p.id),
  );
}

export function stepLatentNeedPostits(
  data: Stage5LatentNeedsData,
  stepId: string,
): Stage5BoardPostit[] {
  const ids = data.journeyStepNeedIds?.[stepId] ?? [];
  return ids
    .map((id) => data.postits.find((p) => p.id === id))
    .filter((p): p is Stage5BoardPostit => {
      if (!p) return false;
      return p.kind === "latent_need" && Boolean(p.text.trim());
    });
}

export function assignLatentNeedToStep(
  data: Stage5LatentNeedsData,
  postitId: string,
  stepId: string,
): Stage5LatentNeedsData {
  const postit = data.postits.find((p) => p.id === postitId);
  if (!postit || postit.kind !== "latent_need") return data;

  const nextMap: Record<string, string[]> = {};
  for (const [sid, ids] of Object.entries(data.journeyStepNeedIds ?? {})) {
    const filtered = ids.filter((id) => id !== postitId);
    if (filtered.length > 0) nextMap[sid] = filtered;
  }
  const current = nextMap[stepId] ?? [];
  nextMap[stepId] = current.includes(postitId)
    ? current
    : [...current, postitId];

  return { ...data, journeyStepNeedIds: nextMap };
}

export function returnLatentNeedToPool(
  data: Stage5LatentNeedsData,
  postitId: string,
): Stage5LatentNeedsData {
  const nextMap: Record<string, string[]> = {};
  for (const [sid, ids] of Object.entries(data.journeyStepNeedIds ?? {})) {
    const filtered = ids.filter((id) => id !== postitId);
    if (filtered.length > 0) nextMap[sid] = filtered;
  }
  return { ...data, journeyStepNeedIds: nextMap };
}

function noteIdFromStage5SourceId(sourceId: string): string | null {
  const match = sourceId.match(/^s5-src-(.+)$/);
  return match?.[1] ?? null;
}

/** 5단계 조사 포스트잇 ↔ 여정 지도 카드 연결 */
export function findJourneyItemForSource(
  journey: UserJourneyMapData,
  source: Stage5BoardPostit,
): JourneyMapItem | null {
  const items = Object.values(journey.itemsById).filter(
    (item) =>
      item.subjectId === source.subjectId &&
      item.kind !== "latent_need" &&
      item.text.trim(),
  );
  if (items.length === 0) return null;

  const sourceText = source.text.trim();
  const sameKind = items.filter((item) => item.kind === source.kind);
  const pool = sameKind.length > 0 ? sameKind : items;

  const byText = pool.find((item) => item.text.trim() === sourceText);
  if (byText) return byText;

  const noteId = noteIdFromStage5SourceId(source.id);
  if (noteId) {
    const byJourneyId = journey.itemsById[`s4-${noteId}`];
    if (byJourneyId && byJourneyId.subjectId === source.subjectId) {
      return byJourneyId;
    }
    const bySourceId = pool.find((item) => item.sourceId === noteId);
    if (bySourceId) return bySourceId;
  }

  if (source.sourceRef?.trim()) {
    const ref = source.sourceRef.trim();
    const byRef = pool.find(
      (item) =>
        item.sourceId === ref ||
        item.id === ref ||
        item.id === `s4-${ref}` ||
        item.sourceId === ref.replace(/^s4-note-/, ""),
    );
    if (byRef) return byRef;
  }

  return null;
}

function findStepIdForJourneyItem(
  steps: JourneyMapStep[],
  itemsById: UserJourneyMapData["itemsById"],
  itemId: string,
): string | null {
  for (const step of steps) {
    if (allStepItemIds(step, itemsById).includes(itemId)) {
      return step.id;
    }
  }
  return null;
}

/** 연결 조사 — 관찰을 우선, 없으면 언급·발견 */
function resolveLinkedSources(
  needs: Stage5LatentNeedsData,
  latent: Stage5BoardPostit,
): Stage5BoardPostit[] {
  const linkedIds = latent.linkedSourceIds?.filter(Boolean) ?? [];
  const byId = new Map(
    needs.postits
      .filter((p) => isStage5SourcePostitKind(p.kind))
      .map((p) => [p.id, p] as const),
  );

  const linked = linkedIds
    .map((id) => byId.get(id))
    .filter((p): p is Stage5BoardPostit => Boolean(p));

  if (linked.length > 0) {
    const observations = linked.filter((p) => p.kind === "observation");
    return observations.length > 0 ? observations : linked;
  }

  // 연결이 없으면 같은 페르소나의 관찰 → 언급 순으로 후보
  const subjectSources = needs.postits.filter(
    (p) =>
      p.subjectId === latent.subjectId &&
      isStage5SourcePostitKind(p.kind) &&
      p.text.trim(),
  );
  const observations = subjectSources.filter((p) => p.kind === "observation");
  if (observations.length > 0) return observations;
  return subjectSources;
}

function pickStepForLatentNeed(
  latent: Stage5BoardPostit,
  sources: Stage5BoardPostit[],
  journey: UserJourneyMapData,
  steps: JourneyMapStep[],
): string | null {
  if (steps.length === 0) return null;

  // 1) 연결된 조사 카드가 이미 올라가 있는 여정 단계
  for (const source of sources) {
    const journeyItem = findJourneyItemForSource(journey, source);
    if (!journeyItem) continue;
    const stepId = findStepIdForJourneyItem(
      steps,
      journey.itemsById,
      journeyItem.id,
    );
    if (stepId) return stepId;
  }

  // 2) 조사 카드는 있으나 아직 단계에 없음 → 관찰/조사 텍스트로 단계 추정
  for (const source of sources) {
    const journeyItem =
      findJourneyItemForSource(journey, source) ??
      ({
        id: source.id,
        kind:
          source.kind === "quote" || source.kind === "observation"
            ? source.kind
            : "observation",
        text: source.text,
        subjectId: source.subjectId,
      } satisfies JourneyMapItem);

    const labels = steps.map((step) => step.label);
    const index = suggestStepIndexForItem(journeyItem, labels);
    const step = steps[Math.min(Math.max(index, 0), steps.length - 1)];
    if (step) return step.id;
  }

  // 3) 최후: 잠재 니즈 문구로 단계 추정
  const labels = steps.map((step) => step.label);
  const index = suggestStepIndexForItem(
    {
      id: latent.id,
      kind: "observation",
      text: latent.text,
      subjectId: latent.subjectId,
    },
    labels,
  );
  return steps[Math.min(Math.max(index, 0), steps.length - 1)]?.id ?? null;
}

/**
 * 연결된 조사(관찰 우선) 카드가 있는 여정 단계로 잠재 니즈를 초안 배치.
 * 이미 배치된 id는 유지하고, 미배치만 채웁니다.
 */
export function bootstrapLatentNeedsOntoJourney(
  needs: Stage5LatentNeedsData,
  journey: UserJourneyMapData,
): Stage5LatentNeedsData {
  const map: Record<string, string[]> = {
    ...(needs.journeyStepNeedIds ?? {}),
  };
  const placed = placedLatentNeedIds({ ...needs, journeyStepNeedIds: map });

  const latents = needs.postits.filter(
    (p) => p.kind === "latent_need" && p.text.trim() && !placed.has(p.id),
  );
  if (latents.length === 0) {
    return { ...needs, journeyStepNeedIds: map };
  }

  // 페르소나(조사 대상)별 여정 단계에 배치
  for (const subject of journey.subjects) {
    const persona = journey.personas[subject.id];
    if (!persona || persona.steps.length === 0) continue;

    const steps = [...persona.steps].sort((a, b) => a.order - b.order);
    const subjectLatents = latents.filter((p) => p.subjectId === subject.id);

    for (const latent of subjectLatents) {
      if (placed.has(latent.id)) continue;

      const sources = resolveLinkedSources(needs, latent);
      const stepId = pickStepForLatentNeed(latent, sources, journey, steps);
      if (!stepId) continue;

      map[stepId] = [...(map[stepId] ?? []), latent.id];
      placed.add(latent.id);
    }
  }

  return { ...needs, journeyStepNeedIds: map };
}
