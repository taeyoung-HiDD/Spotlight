import { filterMeaningfulResearchSubjects } from "@/lib/stages/stage4/researchSynthesisTypes";
import type { Stage4DiscoveriesData } from "@/lib/stages/stage4/types";
import { allStepItemIds } from "@/lib/stages/stage6/journeyStepZones";
import type {
  JourneyMapItem,
  JourneyMapItemKind,
  JourneyPersonaRef,
  JourneyStepZone,
  UserJourneyMapData,
} from "@/lib/stages/stage6/userJourneyTypes";
import {
  assignItemToStep,
  ensureSubjectsAndPersonas,
  normalizeUserJourneyMap,
  returnItemToPool,
} from "@/lib/stages/stage6/userJourneyTypes";

function collectSubjects(
  stage4: Stage4DiscoveriesData,
): JourneyPersonaRef[] {
  return filterMeaningfulResearchSubjects(stage4.researchSynthesis).map((s) => ({
    id: s.id,
    name: s.name,
    context: s.context,
    thumbnailUrl: s.thumbnailUrl,
  }));
}

/** 여정 지도에는 언급·관찰만 올립니다 (잠재 니즈 제외) */
function collectResearchItems(
  stage4: Stage4DiscoveriesData,
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
  return items;
}

/** 카드 종류 → 기본 구역 (언급·관찰 → 사용자 행동) */
export function suggestZoneForItemKind(
  kind: JourneyMapItemKind,
): JourneyStepZone {
  void kind;
  return "behavior";
}

/** 기본 여정 단계 라벨·의미에 맞춘 키워드 */
const STEP_HINT_KEYWORDS: string[][] = [
  [
    "문제",
    "인지",
    "불편",
    "막힘",
    "답답",
    "왜",
    "처음",
    "발견",
    "깨달",
    "느끼",
    "인식",
    "고민",
    "필요",
  ],
  [
    "탐색",
    "검색",
    "찾아",
    "비교",
    "알아보",
    "정보",
    "리뷰",
    "후기",
    "물어",
    "조사",
    "찾아보",
    "둘러",
  ],
  [
    "선택",
    "결정",
    "고르",
    "결제",
    "구매",
    "신청",
    "가입",
    "예약",
    "계약",
    "정하",
    "고르",
    "뽑",
  ],
  [
    "사용",
    "경험",
    "이용",
    "쓰",
    "실행",
    "현장",
    "서비스",
    "제품",
    "앱",
    "조작",
    "시도",
  ],
  [
    "사후",
    "반복",
    "다시",
    "재방",
    "추천",
    "공유",
    "남기",
    "후속",
    "유지",
    "충성",
    "재구매",
    "재사용",
  ],
];

function scoreTextAgainstKeywords(text: string, keywords: string[]): number {
  const lower = text.toLowerCase();
  let score = 0;
  for (const keyword of keywords) {
    if (lower.includes(keyword.toLowerCase())) score += 1;
  }
  return score;
}

function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
  }
  return hash;
}

/**
 * 카드 텍스트·단계 라벨로 여정 단계 인덱스를 고릅니다.
 * 매칭이 없으면 카드 id 해시로 고르게 분산합니다.
 */
export function suggestStepIndexForItem(
  item: JourneyMapItem,
  stepLabels: string[],
): number {
  const stepCount = Math.max(stepLabels.length, 1);
  const scores = stepLabels.map((label, index) => {
    const labelScore = scoreTextAgainstKeywords(item.text, [
      label,
      ...label.split(/[·\s]+/).filter(Boolean),
    ]);
    const hintScore = scoreTextAgainstKeywords(
      item.text,
      STEP_HINT_KEYWORDS[index] ??
        STEP_HINT_KEYWORDS[STEP_HINT_KEYWORDS.length - 1]!,
    );
    return labelScore * 3 + hintScore;
  });

  const best = Math.max(...scores);
  if (best > 0) {
    return scores.indexOf(best);
  }

  return hashString(item.id) % stepCount;
}

/** 기존에 올려 둔 잠재 니즈 카드를 여정에서 제거 (풀·단계 모두) */
export function stripLatentNeedsFromJourney(
  data: UserJourneyMapData,
): UserJourneyMapData {
  let next = data;
  const latentIds = Object.values(data.itemsById)
    .filter((item) => item.kind === "latent_need")
    .map((item) => item.id);

  for (const itemId of latentIds) {
    const item = next.itemsById[itemId];
    if (!item) continue;
    // 단계에서 제거 후 풀에도 두지 않고 카탈로그에서 삭제
    next = returnItemToPool(next, item.subjectId, itemId);
  }

  const itemsById = { ...next.itemsById };
  for (const id of latentIds) {
    delete itemsById[id];
  }

  const personas = { ...next.personas };
  for (const subjectId of Object.keys(personas)) {
    const persona = personas[subjectId]!;
    personas[subjectId] = {
      ...persona,
      poolItemIds: persona.poolItemIds.filter((id) => !latentIds.includes(id)),
    };
  }

  return { ...next, itemsById, personas };
}

/**
 * 배치 전 풀에 있는 언급·관찰만 여정 단계에 자동 배치합니다.
 */
export function autoPlacePoolItemsIntoJourney(
  data: UserJourneyMapData,
): UserJourneyMapData {
  let next = data;

  for (const subject of data.subjects) {
    const persona = next.personas[subject.id];
    if (!persona || persona.poolItemIds.length === 0) continue;

    const sortedSteps = [...persona.steps].sort((a, b) => a.order - b.order);
    if (sortedSteps.length === 0) continue;

    const stepLabels = sortedSteps.map((step) => step.label);
    const poolIds = [...persona.poolItemIds];

    for (const itemId of poolIds) {
      const item = next.itemsById[itemId];
      if (!item?.text.trim()) continue;
      if (item.kind === "latent_need") continue;

      const stepIndex = suggestStepIndexForItem(item, stepLabels);
      const step =
        sortedSteps[Math.min(Math.max(stepIndex, 0), sortedSteps.length - 1)]!;
      const zone = suggestZoneForItemKind(item.kind);
      next = assignItemToStep(next, subject.id, itemId, step.id, zone);
    }
  }

  return next;
}

/** 4단계 조사 자료를 페르소나별 여정 지도에 병합 (기존 배치 유지, 잠재 니즈 제외) */
export function mergePriorStagesIntoJourney(
  current: UserJourneyMapData,
  stage4: Stage4DiscoveriesData,
): UserJourneyMapData {
  const subjects = collectSubjects(stage4);
  let data = ensureSubjectsAndPersonas(
    normalizeUserJourneyMap(current),
    subjects,
  );
  data = stripLatentNeedsFromJourney(data);

  const incoming = collectResearchItems(stage4);
  if (incoming.length === 0) return data;

  const itemsById = { ...data.itemsById };
  const personas = { ...data.personas };

  for (const item of incoming) {
    itemsById[item.id] = item;

    const persona = personas[item.subjectId];
    if (!persona) continue;

    const assigned = persona.steps.some((step) =>
      allStepItemIds(step, itemsById).includes(item.id),
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
  };
}

/**
 * 진입 시: 4단계 자료를 병합한 뒤, 풀의 언급·관찰을 여정 단계에 자동 배치.
 */
export function bootstrapJourneyOnEntry(
  current: UserJourneyMapData,
  stage4: Stage4DiscoveriesData,
): UserJourneyMapData {
  const merged = mergePriorStagesIntoJourney(current, stage4);
  return autoPlacePoolItemsIntoJourney(merged);
}

/** 자동 배치로 zone 배정이 바뀌었는지 */
export function journeyPlacementChanged(
  before: UserJourneyMapData,
  after: UserJourneyMapData,
): boolean {
  const subjectIds = new Set([
    ...before.subjects.map((s) => s.id),
    ...after.subjects.map((s) => s.id),
  ]);

  for (const subjectId of subjectIds) {
    const beforePersona = before.personas[subjectId];
    const afterPersona = after.personas[subjectId];
    if (!beforePersona && !afterPersona) continue;
    if (!beforePersona || !afterPersona) return true;

    if (
      beforePersona.poolItemIds.join("|") !== afterPersona.poolItemIds.join("|")
    ) {
      return true;
    }

    const beforeSteps = [...beforePersona.steps].sort(
      (a, b) => a.order - b.order,
    );
    const afterSteps = [...afterPersona.steps].sort((a, b) => a.order - b.order);
    if (beforeSteps.length !== afterSteps.length) return true;

    for (let i = 0; i < afterSteps.length; i += 1) {
      const b = beforeSteps[i];
      const a = afterSteps[i];
      if (!b || !a) return true;
      const beforeIds = allStepItemIds(b, before.itemsById).join("|");
      const afterIds = allStepItemIds(a, after.itemsById).join("|");
      if (beforeIds !== afterIds) return true;
    }
  }

  return false;
}
