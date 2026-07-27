import {
  JOURNEY_AI_ZONES,
  resolveStepAiEntries,
  resolveStepZoneItems,
  type JourneyAiZone,
} from "@/lib/stages/stage6/journeyStepZones";
import {
  updatePersonaInData,
  type JourneyMapItem,
  type JourneyMapStep,
  type UserJourneyMapData,
} from "@/lib/stages/stage6/userJourneyTypes";

export type JourneyZoneAutoFillStep = {
  stepId: string;
  stepLabel: string;
  /** 채워야 하는 구역 (이미 항목이 있으면 제외) */
  zones: JourneyAiZone[];
  items: Array<Pick<JourneyMapItem, "kind" | "text">>;
};

export type JourneyZoneAutoFillTarget = {
  subjectId: string;
  subjectName: string;
  expectations: string;
  steps: JourneyZoneAutoFillStep[];
};

export type JourneyZoneAutoFillResult = {
  stepId: string;
  zone: JourneyAiZone;
  entries: string[];
};

/** 단계에 배치된 언급·관찰 카드 — AI 분석 근거 */
export function researchItemsForJourneyStep(
  data: UserJourneyMapData,
  step: JourneyMapStep,
): JourneyMapItem[] {
  const zoneItems = resolveStepZoneItems(step, data.itemsById);
  const ids = [
    ...new Set([
      ...zoneItems.behavior,
      ...zoneItems.touchpoint,
      ...zoneItems.pain_point,
    ]),
  ];
  return ids
    .map((id) => data.itemsById[id])
    .filter(
      (item): item is JourneyMapItem =>
        Boolean(item) &&
        (item.kind === "quote" || item.kind === "observation") &&
        Boolean(item.text.trim()),
    );
}

/**
 * 진입 시 AI 자동 채움이 필요한 페르소나·단계·구역을 모읍니다.
 * 이미 채운 페르소나(zonesGeneratedAt)와 항목이 있는 구역은 건너뜁니다.
 */
export function collectJourneyZoneAutoFillTargets(
  data: UserJourneyMapData,
): JourneyZoneAutoFillTarget[] {
  const targets: JourneyZoneAutoFillTarget[] = [];

  for (const subject of data.subjects) {
    const persona = data.personas[subject.id];
    if (!persona || persona.zonesGeneratedAt) continue;

    const steps: JourneyZoneAutoFillStep[] = [];
    for (const step of [...persona.steps].sort((a, b) => a.order - b.order)) {
      const items = researchItemsForJourneyStep(data, step);
      if (items.length === 0) continue;

      const zones = JOURNEY_AI_ZONES.filter((zone) =>
        resolveStepAiEntries(step, zone).every((entry) => !entry.trim()),
      );
      if (zones.length === 0) continue;

      steps.push({
        stepId: step.id,
        stepLabel: step.label,
        zones: [...zones],
        items: items.map((item) => ({ kind: item.kind, text: item.text })),
      });
    }

    if (steps.length === 0) continue;
    targets.push({
      subjectId: subject.id,
      subjectName: subject.name,
      expectations: persona.expectations,
      steps,
    });
  }

  return targets;
}

/** 생성 결과를 아직 비어 있는 구역에만 채우고 완료 시각을 기록합니다. */
export function applyJourneyZoneAutoFill(
  data: UserJourneyMapData,
  subjectId: string,
  results: JourneyZoneAutoFillResult[],
): UserJourneyMapData {
  const persona = data.personas[subjectId];
  if (!persona) return data;

  const byStep = new Map<string, Partial<Record<JourneyAiZone, string[]>>>();
  for (const result of results) {
    const entries = result.entries.map((e) => e.trim()).filter(Boolean);
    if (entries.length === 0) continue;
    const current = byStep.get(result.stepId) ?? {};
    current[result.zone] = entries;
    byStep.set(result.stepId, current);
  }

  const steps = persona.steps.map((step) => {
    const generated = byStep.get(step.id);
    if (!generated) return step;
    const aiTexts = { ...step.aiTexts };
    let changed = false;
    for (const zone of JOURNEY_AI_ZONES) {
      const entries = generated[zone];
      if (!entries?.length) continue;
      if (resolveStepAiEntries(step, zone).some((entry) => entry.trim())) {
        continue;
      }
      aiTexts[zone] = entries;
      changed = true;
    }
    return changed ? { ...step, aiTexts } : step;
  });

  return updatePersonaInData(data, subjectId, {
    ...persona,
    steps,
    zonesGeneratedAt: new Date().toISOString(),
  });
}
