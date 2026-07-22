import type { JourneyMapItem, JourneyMapStep } from "@/lib/stages/stage6/userJourneyTypes";

/** 여정 지도에 표시·배치하는 구역 (니즈 행 없음 — Pain point는 AI 구역) */
export const JOURNEY_STEP_ZONES = [
  "behavior",
  "touchpoint",
  "pain_point",
  "feeling",
] as const;

export type JourneyStepZone = (typeof JOURNEY_STEP_ZONES)[number];

/** 사용자 감정(feeling)은 Pain point 기반 곡선으로 표현 — AI 텍스트 구역 아님 */
export const JOURNEY_AI_ZONES = [
  "touchpoint",
  "pain_point",
] as const;

export type JourneyAiZone = (typeof JOURNEY_AI_ZONES)[number];

export function isJourneyAiZone(zone: JourneyStepZone): zone is JourneyAiZone {
  return (JOURNEY_AI_ZONES as readonly string[]).includes(zone);
}

export function emptyJourneyZoneItems(): Record<JourneyStepZone, string[]> {
  return {
    behavior: [],
    touchpoint: [],
    feeling: [],
    pain_point: [],
  };
}

export function resolveStepZoneItems(
  step: JourneyMapStep,
  itemsById: Record<string, JourneyMapItem> = {},
): Record<JourneyStepZone, string[]> {
  const base = emptyJourneyZoneItems();

  if (step.zoneItems) {
    for (const zone of JOURNEY_STEP_ZONES) {
      const ids = step.zoneItems[zone];
      base[zone] = Array.isArray(ids)
        ? ids.filter((id): id is string => typeof id === "string")
        : [];
    }
    // 레거시 needs 칸에 있던 카드 → 사용자 행동으로 합침
    const legacyNeeds = (
      step.zoneItems as Partial<Record<string, string[]>>
    ).needs;
    if (Array.isArray(legacyNeeds)) {
      for (const id of legacyNeeds) {
        if (typeof id !== "string" || !id) continue;
        if (!base.behavior.includes(id)) base.behavior.push(id);
      }
    }
    return base;
  }

  const legacyIds = step.itemIds ?? [];
  for (const id of legacyIds) {
    const item = itemsById[id];
    if (!item) continue;
    // 잠재 니즈는 여정에 올리지 않음
    if (item.kind === "latent_need") continue;
    base.behavior.push(id);
  }
  return base;
}

export function allStepItemIds(
  step: JourneyMapStep,
  itemsById: Record<string, JourneyMapItem> = {},
): string[] {
  const zoneItems = resolveStepZoneItems(step, itemsById);
  return JOURNEY_STEP_ZONES.flatMap((zone) => zoneItems[zone]);
}

/** 레거시 단일 문자열·개행 bullet → 항목 배열 */
export function normalizeZoneAiEntries(raw: unknown): string[] {
  if (typeof raw === "string") {
    return raw
      .split(/\n+/)
      .map((line) => line.replace(/^[\s·•\-*]+/, "").trim())
      .filter(Boolean);
  }
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function normalizeStepAiTexts(
  raw: unknown,
): Partial<Record<JourneyAiZone, string[]>> {
  if (!raw || typeof raw !== "object") return {};
  const obj = raw as Record<string, unknown>;
  const out: Partial<Record<JourneyAiZone, string[]>> = {};
  for (const zone of JOURNEY_AI_ZONES) {
    if (!(zone in obj)) continue;
    const entries = normalizeZoneAiEntries(obj[zone]);
    if (entries.length > 0) out[zone] = entries;
  }
  return out;
}

export function resolveStepAiEntries(
  step: JourneyMapStep,
  zone: JourneyAiZone,
): string[] {
  const raw = step.aiTexts?.[zone];
  if (raw == null) return [];
  if (Array.isArray(raw)) {
    return raw.filter((value): value is string => typeof value === "string");
  }
  return normalizeZoneAiEntries(raw);
}

export function parseGeneratedAiEntries(text: string): string[] {
  return normalizeZoneAiEntries(text);
}

export function stepHasAssignedContent(
  step: JourneyMapStep,
  itemsById: Record<string, JourneyMapItem> = {},
): boolean {
  if (allStepItemIds(step, itemsById).length > 0) return true;
  return JOURNEY_AI_ZONES.some((zone) =>
    resolveStepAiEntries(step, zone).some((entry) => entry.trim()),
  );
}
