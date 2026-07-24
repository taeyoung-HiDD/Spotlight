import { cleanLatentNeedText } from "@/lib/stages/stage5/latentNeedText";

import type { ResearchMethodId } from "@/lib/stages/fieldResearch/types";

export interface Stage5SubjectRef {
  id: string;
  name: string;
  context: string;
  thumbnailUrl: string;
  researchMethodId?: ResearchMethodId | "";
  conductedAt?: string;
}

export type Stage5BoardPostitKind =
  | "quote"
  | "observation"
  | "finding"
  | "latent_need";

export interface Stage5BoardPostit {
  id: string;
  subjectId: string;
  kind: Stage5BoardPostitKind;
  text: string;
  /** 4단계에서 가져온 언급·관찰 */
  readonly: boolean;
  sourceRef?: string;
  /** 연결된 언급·관찰 포스트잇 id */
  linkedSourceIds?: string[];
  kevinGenerated?: boolean;
}

export type NeedsWorkflowPhase =
  | "needs_analysis"
  | "needs_categorization"
  | "core_selection";

export type NeedGroup = {
  id: string;
  name: string;
  order: number;
};

/** 사분면 셀: 중요도(세로) × 해결 공백(가로) */
export type NeedQuadrantCell =
  | "high_importance_high_gap"
  | "high_importance_low_gap"
  | "low_importance_high_gap"
  | "low_importance_low_gap";

/** 핵심 니즈 판단 근거 배지 */
export type NeedSignalId =
  | "workaround"
  | "frequency"
  | "pain"
  | "breadth"
  | "gap";

export interface NeedSelectionRating {
  /** 사분면 배치 (드래그로 결정) */
  cell: NeedQuadrantCell;
  /** 근거 배지 */
  signals: NeedSignalId[];
}

/** 핵심 니즈 최대 개수 */
export const CORE_NEED_LIMIT = 5;

/** 이 개수부터 Kevin이 「2~3개 권장」 안내 (막지 않음) */
export const CORE_NEED_SOFT_WARN_AT = 4;

export const NEED_QUADRANT_CELLS: NeedQuadrantCell[] = [
  "high_importance_low_gap",
  "high_importance_high_gap",
  "low_importance_low_gap",
  "low_importance_high_gap",
];

export const NEED_SIGNAL_IDS: NeedSignalId[] = [
  "workaround",
  "frequency",
  "pain",
  "breadth",
  "gap",
];

export interface Stage5LatentNeedsData {
  subjects: Stage5SubjectRef[];
  postits: Stage5BoardPostit[];
  stage4SyncedAt: string;
  kevinGeneratedAt: string;
  /**
   * 여정 단계(id)별 잠재 니즈 포스트잇 배치.
   * 진짜 필요찾기에서 여정 지도 하단 행에 사용.
   */
  journeyStepNeedIds: Record<string, string[]>;
  /** 니즈 분석하기 → 니즈 분류하기 → 핵심 니즈 선별 */
  workflowPhase: NeedsWorkflowPhase;
  /** 니즈 분류 그룹 */
  needGroups: NeedGroup[];
  /** 그룹 id → 잠재 니즈 포스트잇 id */
  needGroupMemberIds: Record<string, string[]>;
  /** 잠재 니즈 id → 사분면 평가 */
  needRatings: Record<string, NeedSelectionRating>;
  /** 핵심 니즈 (최대 CORE_NEED_LIMIT개) */
  coreNeedIds: string[];
  /** 보류함 — 언제든 다시 꺼낼 수 있음 */
  parkedNeedIds: string[];
  /** 핵심으로 고른 이유 (선택, needId → 짧은 텍스트) */
  selectionRationales: Record<string, string>;
}

export function defaultStage5LatentNeeds(): Stage5LatentNeedsData {
  return {
    subjects: [],
    postits: [],
    stage4SyncedAt: "",
    kevinGeneratedAt: "",
    journeyStepNeedIds: {},
    workflowPhase: "needs_analysis",
    needGroups: [],
    needGroupMemberIds: {},
    needRatings: {},
    coreNeedIds: [],
    parkedNeedIds: [],
    selectionRationales: {},
  };
}

/** 저장된 5단계 보드에서 빈·고아 조사 대상 제거 */
export function pruneStage5LatentNeedsData(
  data: Stage5LatentNeedsData,
): Stage5LatentNeedsData {
  const subjects = data.subjects.filter((subject) => {
    const hasIdentity =
      subject.name.trim() ||
      subject.context.trim() ||
      subject.thumbnailUrl.trim() ||
      subject.researchMethodId ||
      subject.conductedAt?.trim();
    const hasPostits = data.postits.some(
      (p) => p.subjectId === subject.id && p.text.trim(),
    );
    return hasIdentity || hasPostits;
  });

  const allowed = new Set(subjects.map((s) => s.id));
  const postits = data.postits.filter((p) => allowed.has(p.subjectId));
  const postitIds = new Set(postits.map((p) => p.id));
  const journeyStepNeedIds: Record<string, string[]> = {};
  for (const [stepId, ids] of Object.entries(data.journeyStepNeedIds ?? {})) {
    if (typeof stepId !== "string" || !stepId) continue;
    const cleaned = (Array.isArray(ids) ? ids : []).filter(
      (id): id is string => typeof id === "string" && postitIds.has(id),
    );
    if (cleaned.length > 0) journeyStepNeedIds[stepId] = cleaned;
  }

  const needGroups = (data.needGroups ?? [])
    .filter((g) => g && typeof g.id === "string")
    .map((g, index) => ({
      id: g.id,
      name: typeof g.name === "string" && g.name.trim() ? g.name.trim() : `그룹 ${index + 1}`,
      order: typeof g.order === "number" ? g.order : index,
    }))
    .sort((a, b) => a.order - b.order)
    .map((g, index) => ({ ...g, order: index }));

  const groupIds = new Set(needGroups.map((g) => g.id));
  const needGroupMemberIds: Record<string, string[]> = {};
  for (const [groupId, ids] of Object.entries(data.needGroupMemberIds ?? {})) {
    if (!groupIds.has(groupId) || !Array.isArray(ids)) continue;
    const cleaned = ids.filter(
      (id): id is string => typeof id === "string" && postitIds.has(id),
    );
    needGroupMemberIds[groupId] = cleaned;
  }

  const latentNeedIds = new Set(
    postits.filter((p) => p.kind === "latent_need").map((p) => p.id),
  );

  const needRatings: Record<string, NeedSelectionRating> = {};
  for (const [needId, rating] of Object.entries(data.needRatings ?? {})) {
    if (!latentNeedIds.has(needId) || !rating) continue;
    needRatings[needId] = rating;
  }

  const parkedNeedIds = dedupeIds(data.parkedNeedIds ?? []).filter((id) =>
    latentNeedIds.has(id),
  );
  const parkedSet = new Set(parkedNeedIds);
  const coreNeedIds = dedupeIds(data.coreNeedIds ?? [])
    .filter((id) => latentNeedIds.has(id) && !parkedSet.has(id))
    .slice(0, CORE_NEED_LIMIT);

  const selectionRationales: Record<string, string> = {};
  for (const [needId, text] of Object.entries(data.selectionRationales ?? {})) {
    if (!latentNeedIds.has(needId) || typeof text !== "string") continue;
    const trimmed = text.trim();
    if (trimmed) selectionRationales[needId] = trimmed.slice(0, 200);
  }

  return {
    ...data,
    subjects,
    postits,
    journeyStepNeedIds,
    needGroups,
    needGroupMemberIds,
    needRatings,
    coreNeedIds,
    parkedNeedIds,
    selectionRationales,
    workflowPhase: normalizeWorkflowPhase(data.workflowPhase),
  };
}

function dedupeIds(ids: string[]): string[] {
  return [...new Set(ids.filter((id) => typeof id === "string" && id))];
}

function normalizeWorkflowPhase(raw: unknown): NeedsWorkflowPhase {
  return raw === "needs_categorization" || raw === "core_selection"
    ? raw
    : "needs_analysis";
}

export function createStage5BoardPostit(
  subjectId: string,
  kind: Stage5BoardPostitKind,
  partial?: Partial<Stage5BoardPostit>,
): Stage5BoardPostit {
  return {
    id: partial?.id ?? `s5p-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    subjectId,
    kind,
    text: partial?.text ?? "",
    readonly: partial?.readonly ?? kind !== "latent_need",
    sourceRef: partial?.sourceRef,
    linkedSourceIds: partial?.linkedSourceIds,
    kevinGenerated: partial?.kevinGenerated,
  };
}

export function normalizeStage5LatentNeeds(
  raw: Partial<Stage5LatentNeedsData> | null | undefined,
): Stage5LatentNeedsData {
  const base = defaultStage5LatentNeeds();
  if (!raw) return base;

  const subjects = Array.isArray(raw.subjects)
    ? raw.subjects
        .filter((s) => s && typeof s.id === "string")
        .map((s) => ({
          id: s.id,
          name: typeof s.name === "string" ? s.name : "",
          context: typeof s.context === "string" ? s.context : "",
          thumbnailUrl:
            typeof s.thumbnailUrl === "string" ? s.thumbnailUrl : "",
          researchMethodId:
            typeof s.researchMethodId === "string" ? s.researchMethodId : "",
          conductedAt:
            typeof s.conductedAt === "string" ? s.conductedAt : "",
        }))
    : [];

  const postits = Array.isArray(raw.postits)
    ? raw.postits
        .filter((p) => p && typeof p.subjectId === "string")
        .map((p) => ({
          id: p.id || createStage5BoardPostit(p.subjectId, p.kind ?? "quote").id,
          subjectId: p.subjectId,
          kind:
            p.kind === "quote" ||
            p.kind === "observation" ||
            p.kind === "finding" ||
            p.kind === "latent_need"
              ? p.kind
              : "quote",
          text:
            typeof p.text === "string"
              ? p.kind === "latent_need"
                ? cleanLatentNeedText(p.text)
                : p.text
              : "",
          readonly: Boolean(p.readonly),
          sourceRef: p.sourceRef,
          linkedSourceIds: Array.isArray(p.linkedSourceIds)
            ? p.linkedSourceIds.filter((id): id is string => typeof id === "string")
            : undefined,
          kevinGenerated: p.kevinGenerated,
        }))
    : [];

  return pruneStage5LatentNeedsData({
    subjects,
    postits,
    stage4SyncedAt:
      typeof raw.stage4SyncedAt === "string" ? raw.stage4SyncedAt : "",
    kevinGeneratedAt:
      typeof raw.kevinGeneratedAt === "string" ? raw.kevinGeneratedAt : "",
    journeyStepNeedIds: normalizeJourneyStepNeedIds(raw.journeyStepNeedIds),
    workflowPhase: normalizeWorkflowPhase(raw.workflowPhase),
    needGroups: normalizeNeedGroups(raw.needGroups),
    needGroupMemberIds: normalizeJourneyStepNeedIds(raw.needGroupMemberIds),
    needRatings: normalizeNeedRatings(raw.needRatings),
    coreNeedIds: normalizeIdList(raw.coreNeedIds),
    parkedNeedIds: normalizeIdList(raw.parkedNeedIds),
    selectionRationales: normalizeSelectionRationales(raw.selectionRationales),
  });
}

function normalizeSelectionRationales(
  raw: unknown,
): Record<string, string> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string> = {};
  for (const [needId, text] of Object.entries(raw as Record<string, unknown>)) {
    if (!needId || typeof text !== "string") continue;
    const trimmed = text.trim();
    if (trimmed) out[needId] = trimmed.slice(0, 200);
  }
  return out;
}

function normalizeIdList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter((id): id is string => typeof id === "string" && Boolean(id));
}

function normalizeNeedRatings(
  raw: unknown,
): Record<string, NeedSelectionRating> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, NeedSelectionRating> = {};
  for (const [needId, value] of Object.entries(
    raw as Record<string, unknown>,
  )) {
    if (!needId || !value || typeof value !== "object") continue;
    const rating = value as Partial<NeedSelectionRating>;
    if (!NEED_QUADRANT_CELLS.includes(rating.cell as NeedQuadrantCell)) {
      continue;
    }
    out[needId] = {
      cell: rating.cell as NeedQuadrantCell,
      signals: Array.isArray(rating.signals)
        ? rating.signals.filter((s): s is NeedSignalId =>
            NEED_SIGNAL_IDS.includes(s as NeedSignalId),
          )
        : [],
    };
  }
  return out;
}

function normalizeNeedGroups(raw: unknown): NeedGroup[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((g): g is Partial<NeedGroup> => Boolean(g) && typeof g === "object")
    .map((g, index) => ({
      id:
        typeof g.id === "string" && g.id
          ? g.id
          : `ng-${index}-${Math.random().toString(36).slice(2, 6)}`,
      name:
        typeof g.name === "string" && g.name.trim()
          ? g.name.trim()
          : `그룹 ${index + 1}`,
      order: typeof g.order === "number" ? g.order : index,
    }))
    .sort((a, b) => a.order - b.order)
    .map((g, index) => ({ ...g, order: index }));
}

function normalizeJourneyStepNeedIds(
  raw: unknown,
): Record<string, string[]> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, string[]> = {};
  for (const [stepId, ids] of Object.entries(raw as Record<string, unknown>)) {
    if (!stepId || !Array.isArray(ids)) continue;
    const cleaned = ids.filter((id): id is string => typeof id === "string");
    if (cleaned.length > 0) out[stepId] = cleaned;
  }
  return out;
}

export function hasLatentNeedsContent(data: Stage5LatentNeedsData): boolean {
  return data.postits.some((p) => p.text.trim());
}
