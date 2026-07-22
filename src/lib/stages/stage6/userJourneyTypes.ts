import type { Stage5SubjectRef } from "@/lib/stages/stage5/latentNeedsTypes";
import {
  allStepItemIds,
  emptyJourneyZoneItems,
  JOURNEY_AI_ZONES,
  JOURNEY_STEP_ZONES,
  normalizeStepAiTexts,
  parseGeneratedAiEntries,
  resolveStepAiEntries,
  resolveStepZoneItems,
  stepHasAssignedContent,
  type JourneyAiZone,
  type JourneyStepZone,
} from "@/lib/stages/stage6/journeyStepZones";

export type { JourneyAiZone, JourneyStepZone };
export {
  JOURNEY_AI_ZONES,
  JOURNEY_STEP_ZONES,
  parseGeneratedAiEntries,
  resolveStepAiEntries,
};

export type JourneyPersonaRef = Stage5SubjectRef;

export type JourneyMapItemKind = "quote" | "observation" | "latent_need";

export type JourneyMapItem = {
  id: string;
  kind: JourneyMapItemKind;
  text: string;
  subjectId: string;
  sourceId?: string;
};

export type JourneyMapStep = {
  id: string;
  label: string;
  order: number;
  zoneItems: Record<JourneyStepZone, string[]>;
  /** 터치포인트·Pain point 직접 입력·AI 항목 (여러 개) */
  aiTexts: Partial<Record<JourneyAiZone, string[]>>;
  /** @deprecated zoneItems로 마이그레이션 */
  itemIds?: string[];
};

export type PersonaJourneyMap = {
  subjectId: string;
  steps: JourneyMapStep[];
  poolItemIds: string[];
  /** 페르소나가 여정에서 기대하는 것 (자유 입력) */
  expectations: string;
};

export type UserJourneyMapData = {
  subjects: JourneyPersonaRef[];
  activeSubjectId: string;
  personas: Record<string, PersonaJourneyMap>;
  itemsById: Record<string, JourneyMapItem>;
  syncedFromStage4At?: string;
  syncedFromStage5At?: string;
};

/** 레거시 단일 지도 (마이그레이션용) */
type LegacyUserJourneyMapData = {
  steps?: JourneyMapStep[];
  poolItemIds?: string[];
  itemsById?: Record<string, JourneyMapItem>;
  syncedFromStage4At?: string;
  syncedFromStage5At?: string;
};

export const DEFAULT_JOURNEY_STEPS: Omit<
  JourneyMapStep,
  "id" | "zoneItems" | "aiTexts"
>[] = [
  { label: "문제 인지", order: 0 },
  { label: "정보 탐색", order: 1 },
  { label: "선택·결정", order: 2 },
  { label: "사용·경험", order: 3 },
  { label: "사후·반복", order: 4 },
];

export const JOURNEY_STEP_HEADER_COUNT = 5;

export function journeyStepHeaderClass(stepIndex: number): string {
  const variant = stepIndex % JOURNEY_STEP_HEADER_COUNT;
  return `user-journey-board__step-header user-journey-board__step-header--${variant}`;
}

const LEGACY_PERSONA_KEY = "__legacy__";

function newId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function createJourneyStep(
  label: string,
  order: number,
): JourneyMapStep {
  return {
    id: newId("jstep"),
    label,
    order,
    zoneItems: emptyJourneyZoneItems(),
    aiTexts: {},
  };
}

function defaultPersonaJourney(subjectId: string): PersonaJourneyMap {
  return {
    subjectId,
    steps: DEFAULT_JOURNEY_STEPS.map((s, i) => createJourneyStep(s.label, i)),
    poolItemIds: [],
    expectations: "",
  };
}

export function defaultUserJourneyMap(): UserJourneyMapData {
  return {
    subjects: [],
    activeSubjectId: "",
    personas: {},
    itemsById: {},
  };
}

function normalizeSteps(
  raw: unknown,
  fallback: JourneyMapStep[],
  itemsById: Record<string, JourneyMapItem>,
): JourneyMapStep[] {
  if (!Array.isArray(raw)) return fallback;
  const steps = raw
    .map((step, index) => {
      if (!step || typeof step !== "object") return null;
      const s = step as Partial<JourneyMapStep>;
      const partial: JourneyMapStep = {
        id: typeof s.id === "string" ? s.id : newId("jstep"),
        label:
          typeof s.label === "string" && s.label.trim()
            ? s.label.trim()
            : `단계 ${index + 1}`,
        order: typeof s.order === "number" ? s.order : index,
        zoneItems: s.zoneItems ?? emptyJourneyZoneItems(),
        aiTexts: normalizeStepAiTexts(s.aiTexts),
        itemIds: Array.isArray(s.itemIds)
          ? s.itemIds.filter((id): id is string => typeof id === "string")
          : undefined,
      };
      return {
        ...partial,
        zoneItems: resolveStepZoneItems(partial, itemsById),
      } satisfies JourneyMapStep;
    })
    .filter((s): s is JourneyMapStep => s !== null)
    .sort((a, b) => a.order - b.order);
  return steps.length > 0 ? steps : fallback;
}

function normalizePersonaMap(
  raw: Partial<PersonaJourneyMap> | null | undefined,
  subjectId: string,
  itemsById: Record<string, JourneyMapItem>,
): PersonaJourneyMap {
  const base = defaultPersonaJourney(subjectId);
  if (!raw || typeof raw !== "object") return base;
  return {
    subjectId,
    steps: normalizeSteps(raw.steps, base.steps, itemsById),
    poolItemIds: Array.isArray(raw.poolItemIds)
      ? raw.poolItemIds.filter((id): id is string => typeof id === "string")
      : [],
    expectations:
      typeof raw.expectations === "string" ? raw.expectations : "",
  };
}

function migrateLegacyFlatMap(
  raw: LegacyUserJourneyMapData,
): UserJourneyMapData {
  const base = defaultPersonaJourney(LEGACY_PERSONA_KEY);
  const itemsById =
    raw.itemsById && typeof raw.itemsById === "object"
      ? (raw.itemsById as Record<string, JourneyMapItem>)
      : {};
  const steps = normalizeSteps(raw.steps, base.steps, itemsById);
  const poolItemIds = Array.isArray(raw.poolItemIds)
    ? raw.poolItemIds.filter((id): id is string => typeof id === "string")
    : [];

  return {
    subjects: [],
    activeSubjectId: LEGACY_PERSONA_KEY,
    personas: {
      [LEGACY_PERSONA_KEY]: {
        subjectId: LEGACY_PERSONA_KEY,
        steps,
        poolItemIds,
        expectations: "",
      },
    },
    itemsById,
    syncedFromStage4At:
      typeof raw.syncedFromStage4At === "string"
        ? raw.syncedFromStage4At
        : undefined,
    syncedFromStage5At:
      typeof raw.syncedFromStage5At === "string"
        ? raw.syncedFromStage5At
        : undefined,
  };
}

function splitLegacyPersonaIntoSubjects(
  legacy: PersonaJourneyMap,
  itemsById: Record<string, JourneyMapItem>,
  subjects: JourneyPersonaRef[],
): Record<string, PersonaJourneyMap> {
  const personas: Record<string, PersonaJourneyMap> = {};

  for (const subject of subjects) {
    const steps = legacy.steps.map((step, index) => {
      const resolved = resolveStepZoneItems(step, itemsById);
      const zoneItems = emptyJourneyZoneItems();
      for (const zone of JOURNEY_STEP_ZONES) {
        zoneItems[zone] = resolved[zone].filter(
          (id) => itemsById[id]?.subjectId === subject.id,
        );
      }
      return {
        ...createJourneyStep(step.label, index),
        zoneItems,
        aiTexts: normalizeStepAiTexts(step.aiTexts),
      };
    });

    const assigned = new Set(
      steps.flatMap((s) => allStepItemIds(s, itemsById)),
    );
    const poolItemIds = [
      ...legacy.poolItemIds.filter(
        (id) =>
          itemsById[id]?.subjectId === subject.id && !assigned.has(id),
      ),
      ...Object.values(itemsById)
        .filter(
          (item) =>
            item.subjectId === subject.id &&
            !assigned.has(item.id) &&
            !legacy.poolItemIds.includes(item.id),
        )
        .map((item) => item.id),
    ];

    const uniquePool = [...new Set(poolItemIds)];
    personas[subject.id] = {
      subjectId: subject.id,
      steps,
      poolItemIds: uniquePool,
      expectations: legacy.expectations,
    };
  }

  return personas;
}

export function normalizeUserJourneyMap(
  raw: Partial<UserJourneyMapData> | LegacyUserJourneyMapData | null | undefined,
): UserJourneyMapData {
  const base = defaultUserJourneyMap();
  if (!raw || typeof raw !== "object") return base;

  const record = raw as Record<string, unknown>;
  if (Array.isArray(record.steps) && !record.personas) {
    return migrateLegacyFlatMap(raw as LegacyUserJourneyMapData);
  }

  const parsed = raw as Partial<UserJourneyMapData>;

  const itemsById =
    parsed.itemsById && typeof parsed.itemsById === "object"
      ? parsed.itemsById
      : {};

  const subjects = Array.isArray(parsed.subjects)
    ? parsed.subjects
        .filter((s) => s && typeof s.id === "string")
        .map((s) => ({
          id: s.id,
          name: typeof s.name === "string" ? s.name : "",
          context: typeof s.context === "string" ? s.context : "",
          thumbnailUrl:
            typeof s.thumbnailUrl === "string" ? s.thumbnailUrl : "",
        }))
    : [];

  const personas: Record<string, PersonaJourneyMap> = {};
  if (parsed.personas && typeof parsed.personas === "object") {
    for (const [key, value] of Object.entries(parsed.personas)) {
      personas[key] = normalizePersonaMap(
        value as Partial<PersonaJourneyMap>,
        key,
        itemsById,
      );
    }
  }

  const activeSubjectId =
    typeof parsed.activeSubjectId === "string" ? parsed.activeSubjectId : "";

  return {
    subjects,
    activeSubjectId,
    personas,
    itemsById,
    syncedFromStage4At:
      typeof parsed.syncedFromStage4At === "string"
        ? parsed.syncedFromStage4At
        : undefined,
    syncedFromStage5At:
      typeof parsed.syncedFromStage5At === "string"
        ? parsed.syncedFromStage5At
        : undefined,
  };
}

export function ensureSubjectsAndPersonas(
  data: UserJourneyMapData,
  subjects: JourneyPersonaRef[],
): UserJourneyMapData {
  let personas = { ...data.personas };

  if (personas[LEGACY_PERSONA_KEY] && subjects.length > 0) {
    personas = {
      ...splitLegacyPersonaIntoSubjects(
        personas[LEGACY_PERSONA_KEY],
        data.itemsById,
        subjects,
      ),
      ...Object.fromEntries(
        Object.entries(personas).filter(([key]) => key !== LEGACY_PERSONA_KEY),
      ),
    };
  }

  for (const subject of subjects) {
    if (!personas[subject.id]) {
      personas[subject.id] = defaultPersonaJourney(subject.id);
    }
  }

  const resolvedSubjects =
    subjects.length > 0
      ? subjects
      : data.subjects.length > 0
        ? data.subjects
        : personas[LEGACY_PERSONA_KEY]
          ? [
              {
                id: LEGACY_PERSONA_KEY,
                name: "조사 대상",
                context: "",
                thumbnailUrl: "",
              },
            ]
          : [];

  const activeSubjectId = resolvedSubjects.some(
    (s) => s.id === data.activeSubjectId,
  )
    ? data.activeSubjectId
    : resolvedSubjects[0]?.id ?? "";

  return {
    ...data,
    subjects: resolvedSubjects,
    personas,
    activeSubjectId,
  };
}

/** 이전 단계 없이 페르소나를 직접 추가해 여정 지도 작업을 시작 */
export function addManualJourneyPersona(
  data: UserJourneyMapData,
  name?: string,
): UserJourneyMapData {
  const subject: JourneyPersonaRef = {
    id: newId("persona"),
    name: name?.trim() || "페르소나",
    context: "",
    thumbnailUrl: "",
    researchMethodId: "",
  };
  const next: UserJourneyMapData = {
    ...data,
    subjects: [...data.subjects, subject],
    activeSubjectId: subject.id,
  };
  return ensureSubjectsAndPersonas(next, next.subjects);
}

export function getActivePersonaMap(
  data: UserJourneyMapData,
): PersonaJourneyMap | null {
  if (!data.activeSubjectId) return null;
  return data.personas[data.activeSubjectId] ?? null;
}

export function setActiveSubject(
  data: UserJourneyMapData,
  subjectId: string,
): UserJourneyMapData {
  return { ...data, activeSubjectId: subjectId };
}

export function updatePersonaInData(
  data: UserJourneyMapData,
  subjectId: string,
  persona: PersonaJourneyMap,
): UserJourneyMapData {
  return {
    ...data,
    personas: { ...data.personas, [subjectId]: persona },
  };
}

export function updatePersonaExpectations(
  data: UserJourneyMapData,
  subjectId: string,
  expectations: string,
): UserJourneyMapData {
  const persona = data.personas[subjectId];
  if (!persona) return data;
  return updatePersonaInData(data, subjectId, { ...persona, expectations });
}

export function journeyItemById(
  data: UserJourneyMapData,
  id: string,
): JourneyMapItem | undefined {
  return data.itemsById[id];
}

export function journeyItemsForSubject(
  data: UserJourneyMapData,
  subjectId: string,
): JourneyMapItem[] {
  return Object.values(data.itemsById).filter(
    (item) => item.subjectId === subjectId && item.text.trim(),
  );
}

export type JourneyStepInsightCounts = {
  quotes: number;
  observations: number;
  needs: number;
};

export function countJourneyStepItems(
  items: JourneyMapItem[],
): JourneyStepInsightCounts {
  let quotes = 0;
  let observations = 0;
  let needs = 0;

  for (const item of items) {
    if (!item.text.trim()) continue;
    if (item.kind === "quote") quotes += 1;
    else if (item.kind === "observation") observations += 1;
    else if (item.kind === "latent_need") needs += 1;
  }

  return { quotes, observations, needs };
}

export function poolItems(
  data: UserJourneyMapData,
  subjectId: string,
): JourneyMapItem[] {
  const persona = data.personas[subjectId];
  if (!persona) return [];
  return persona.poolItemIds
    .map((id) => data.itemsById[id])
    .filter((item): item is JourneyMapItem => Boolean(item?.text.trim()));
}

export function journeyItemsForZone(
  data: UserJourneyMapData,
  step: JourneyMapStep,
  zone: JourneyStepZone,
): JourneyMapItem[] {
  return resolveStepZoneItems(step, data.itemsById)[zone]
    .map((id) => data.itemsById[id])
    .filter((item): item is JourneyMapItem => Boolean(item?.text.trim()));
}

export function hasJourneyContent(data: UserJourneyMapData): boolean {
  return Object.values(data.personas).some(
    (persona) =>
      persona.steps.some((s) =>
        stepHasAssignedContent(s, data.itemsById),
      ) || persona.poolItemIds.length > 0,
  );
}

export function assignItemToStep(
  data: UserJourneyMapData,
  subjectId: string,
  itemId: string,
  stepId: string,
  zone: JourneyStepZone,
): UserJourneyMapData {
  const persona = data.personas[subjectId];
  if (!persona) return data;

  const steps = persona.steps.map((step) => {
    const zoneItems = resolveStepZoneItems(step, data.itemsById);
    for (const z of JOURNEY_STEP_ZONES) {
      zoneItems[z] = zoneItems[z].filter((id) => id !== itemId);
    }
    if (step.id === stepId) {
      const ids = zoneItems[zone];
      zoneItems[zone] = ids.includes(itemId) ? ids : [...ids, itemId];
    }
    return { ...step, zoneItems };
  });
  const poolItemIds = persona.poolItemIds.filter((id) => id !== itemId);
  return updatePersonaInData(data, subjectId, { ...persona, steps, poolItemIds });
}

export function returnItemToPool(
  data: UserJourneyMapData,
  subjectId: string,
  itemId: string,
): UserJourneyMapData {
  const persona = data.personas[subjectId];
  if (!persona) return data;

  const steps = persona.steps.map((step) => {
    const zoneItems = resolveStepZoneItems(step, data.itemsById);
    for (const z of JOURNEY_STEP_ZONES) {
      zoneItems[z] = zoneItems[z].filter((id) => id !== itemId);
    }
    return { ...step, zoneItems };
  });
  const poolItemIds = persona.poolItemIds.includes(itemId)
    ? persona.poolItemIds
    : [...persona.poolItemIds, itemId];
  return updatePersonaInData(data, subjectId, { ...persona, steps, poolItemIds });
}

export function updateStepAiText(
  data: UserJourneyMapData,
  subjectId: string,
  stepId: string,
  zone: JourneyAiZone,
  text: string,
): UserJourneyMapData {
  return setStepAiEntries(
    data,
    subjectId,
    stepId,
    zone,
    parseGeneratedAiEntries(text),
  );
}

function setStepAiEntries(
  data: UserJourneyMapData,
  subjectId: string,
  stepId: string,
  zone: JourneyAiZone,
  entries: string[],
): UserJourneyMapData {
  const persona = data.personas[subjectId];
  if (!persona) return data;
  return updatePersonaInData(data, subjectId, {
    ...persona,
    steps: persona.steps.map((step) =>
      step.id === stepId
        ? {
            ...step,
            aiTexts: {
              ...step.aiTexts,
              [zone]: entries,
            },
          }
        : step,
    ),
  });
}

export function addStepAiEntry(
  data: UserJourneyMapData,
  subjectId: string,
  stepId: string,
  zone: JourneyAiZone,
  text = "",
): UserJourneyMapData {
  const persona = data.personas[subjectId];
  const step = persona?.steps.find((s) => s.id === stepId);
  if (!persona || !step) return data;
  return setStepAiEntries(data, subjectId, stepId, zone, [
    ...resolveStepAiEntries(step, zone),
    text,
  ]);
}

export function updateStepAiEntry(
  data: UserJourneyMapData,
  subjectId: string,
  stepId: string,
  zone: JourneyAiZone,
  index: number,
  text: string,
): UserJourneyMapData {
  const persona = data.personas[subjectId];
  const step = persona?.steps.find((s) => s.id === stepId);
  if (!persona || !step) return data;
  const entries = [...resolveStepAiEntries(step, zone)];
  if (index < 0 || index >= entries.length) return data;
  entries[index] = text;
  return setStepAiEntries(data, subjectId, stepId, zone, entries);
}

export function removeStepAiEntry(
  data: UserJourneyMapData,
  subjectId: string,
  stepId: string,
  zone: JourneyAiZone,
  index: number,
): UserJourneyMapData {
  const persona = data.personas[subjectId];
  const step = persona?.steps.find((s) => s.id === stepId);
  if (!persona || !step) return data;
  return setStepAiEntries(
    data,
    subjectId,
    stepId,
    zone,
    resolveStepAiEntries(step, zone).filter((_, i) => i !== index),
  );
}

export function appendStepAiEntries(
  data: UserJourneyMapData,
  subjectId: string,
  stepId: string,
  zone: JourneyAiZone,
  texts: string[],
): UserJourneyMapData {
  const persona = data.personas[subjectId];
  const step = persona?.steps.find((s) => s.id === stepId);
  if (!persona || !step) return data;
  const incoming = texts.map((t) => t.trim()).filter(Boolean);
  if (incoming.length === 0) return data;
  return setStepAiEntries(data, subjectId, stepId, zone, [
    ...resolveStepAiEntries(step, zone),
    ...incoming,
  ]);
}

export function updateStepLabel(
  data: UserJourneyMapData,
  subjectId: string,
  stepId: string,
  label: string,
): UserJourneyMapData {
  const persona = data.personas[subjectId];
  if (!persona) return data;
  return updatePersonaInData(data, subjectId, {
    ...persona,
    steps: persona.steps.map((step) =>
      step.id === stepId ? { ...step, label } : step,
    ),
  });
}

export function addJourneyStep(
  data: UserJourneyMapData,
  subjectId: string,
): UserJourneyMapData {
  const persona = data.personas[subjectId];
  if (!persona) return data;
  const order = persona.steps.length;
  return updatePersonaInData(data, subjectId, {
    ...persona,
    steps: [...persona.steps, createJourneyStep(`단계 ${order + 1}`, order)],
  });
}

export function removeJourneyStep(
  data: UserJourneyMapData,
  subjectId: string,
  stepId: string,
): UserJourneyMapData {
  const persona = data.personas[subjectId];
  if (!persona || persona.steps.length <= 1) return data;

  const removed = persona.steps.find((step) => step.id === stepId);
  if (!removed) return data;

  const poolItemIds = [...persona.poolItemIds];
  for (const id of allStepItemIds(removed, data.itemsById)) {
    if (!poolItemIds.includes(id)) poolItemIds.push(id);
  }

  const steps = persona.steps
    .filter((step) => step.id !== stepId)
    .map((step, index) => ({ ...step, order: index }));

  return updatePersonaInData(data, subjectId, {
    ...persona,
    steps,
    poolItemIds,
  });
}
