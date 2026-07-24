import type {
  NeedGroup,
  Stage5SubjectRef,
} from "@/lib/stages/stage5/latentNeedsTypes";

/** d.school HMW 변주 */
export type HmwVariationKind =
  | "amp_up"
  | "remove_bad"
  | "explore_opposite";

/** NN/g 5-Tip 체크리스트 id */
export type HmwQualityTipId = 1 | 2 | 3 | 4 | 5;

export type HmwQualityTipStatus = "pass" | "warn";

export interface HmwQualityTip {
  id: HmwQualityTipId;
  status: HmwQualityTipStatus;
  /** Kevin 코칭 톤 짧은 메모 (warn 시) */
  note?: string;
}

export interface HmwVariationCandidate {
  kind: HmwVariationKind;
  text: string;
  tips: HmwQualityTip[];
}

export interface HmwQuestion {
  id: string;
  latentNeedId: string;
  subjectId: string;
  /** 5단계 잠재 니즈 스냅샷 */
  latentNeedText: string;
  /** 확정·표시용 HMW (8단계 시드) */
  hmwText: string;
  kevinGenerated?: boolean;
  /** 선정된 변주 */
  variationKind?: HmwVariationKind;
  /** 선정본 품질 팁 */
  qualityTips?: HmwQualityTip[];
  /** 내부 3변주 후보 (UI 기본 숨김) */
  candidates?: HmwVariationCandidate[];
}

export interface Stage7HmwData {
  subjects: Stage5SubjectRef[];
  questions: HmwQuestion[];
  /** 6단계 니즈 분류 그룹 스냅샷 */
  needGroups: NeedGroup[];
  /** 그룹 id → 잠재 니즈 id */
  needGroupMemberIds: Record<string, string[]>;
  /** 6단계 핵심 니즈 선별이 적용된 스냅샷인지 */
  coreSelectionApplied: boolean;
  stage5SyncedAt: string;
  kevinGeneratedAt: string;
}

export const HMW_QUALITY_TIP_LABELS: Record<HmwQualityTipId, string> = {
  1: "니즈·인사이트에 근거하는가",
  2: "원하는 결과(desired outcome)에 초점이 있는가",
  3: "긍정문으로 쓰였는가",
  4: "너무 좁지도 넓지도 않은 적정 범위인가",
  5: "특정 해결책을 미리 암시하지 않는가",
};

export const HMW_VARIATION_KIND_LABELS: Record<HmwVariationKind, string> = {
  amp_up: "좋은 점 증폭",
  remove_bad: "나쁜 점 제거",
  explore_opposite: "반대 탐색",
};

const VARIATION_KINDS: HmwVariationKind[] = [
  "amp_up",
  "remove_bad",
  "explore_opposite",
];

export function createHmwQuestionId(): string {
  return `hmw-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function isManualHmwQuestion(question: HmwQuestion): boolean {
  return question.latentNeedId.startsWith("manual-");
}

export function addManualHmwQuestion(data: Stage7HmwData): Stage7HmwData {
  const manualSubjectId = "manual-subject";
  const subjects =
    data.subjects.length > 0
      ? data.subjects
      : [
          {
            id: manualSubjectId,
            name: "직접 입력",
            context: "",
            thumbnailUrl: "",
            researchMethodId: "" as const,
          },
        ];
  const subjectId = subjects[0]?.id ?? manualSubjectId;
  const question: HmwQuestion = {
    id: createHmwQuestionId(),
    latentNeedId: `manual-${createHmwQuestionId()}`,
    subjectId,
    latentNeedText: "",
    hmwText: "",
  };
  return {
    ...data,
    subjects,
    questions: [...data.questions, question],
  };
}

export function defaultStage7Hmw(): Stage7HmwData {
  return {
    subjects: [],
    questions: [],
    needGroups: [],
    needGroupMemberIds: {},
    coreSelectionApplied: false,
    stage5SyncedAt: "",
    kevinGeneratedAt: "",
  };
}

export function hasHmwContent(data: Stage7HmwData): boolean {
  return data.questions.some((q) => q.hmwText.trim());
}

export function hasLatentNeedPool(data: Stage7HmwData): boolean {
  return data.questions.some((q) => q.latentNeedText.trim());
}

function normalizeVariationKind(raw: unknown): HmwVariationKind | undefined {
  const v = String(raw ?? "").trim();
  return VARIATION_KINDS.includes(v as HmwVariationKind)
    ? (v as HmwVariationKind)
    : undefined;
}

function normalizeQualityTip(raw: unknown): HmwQualityTip | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = Number(o.id);
  if (![1, 2, 3, 4, 5].includes(id)) return null;
  const status = o.status === "warn" ? "warn" : "pass";
  const note = String(o.note ?? "").trim();
  return {
    id: id as HmwQualityTipId,
    status,
    ...(note ? { note } : {}),
  };
}

function normalizeCandidate(raw: unknown): HmwVariationCandidate | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const kind = normalizeVariationKind(o.kind);
  const text = String(o.text ?? o.hmwText ?? "").trim();
  if (!kind || !text) return null;
  const tips = Array.isArray(o.tips)
    ? o.tips
        .map(normalizeQualityTip)
        .filter((t): t is HmwQualityTip => t !== null)
    : [];
  return { kind, text, tips };
}

function normalizeQuestion(raw: unknown): HmwQuestion | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const latentNeedId = String(o.latentNeedId ?? "").trim();
  const subjectId = String(o.subjectId ?? "").trim();
  const latentNeedText = String(o.latentNeedText ?? "").trim();
  if (!latentNeedId && !latentNeedText) return null;

  const qualityTips = Array.isArray(o.qualityTips)
    ? o.qualityTips
        .map(normalizeQualityTip)
        .filter((t): t is HmwQualityTip => t !== null)
    : undefined;
  const candidates = Array.isArray(o.candidates)
    ? o.candidates
        .map(normalizeCandidate)
        .filter((c): c is HmwVariationCandidate => c !== null)
    : undefined;

  return {
    id: String(o.id ?? createHmwQuestionId()).trim() || createHmwQuestionId(),
    latentNeedId: latentNeedId || `orphan-${createHmwQuestionId()}`,
    subjectId,
    latentNeedText,
    hmwText: String(o.hmwText ?? ""),
    kevinGenerated: o.kevinGenerated === true,
    variationKind: normalizeVariationKind(o.variationKind),
    ...(qualityTips && qualityTips.length > 0 ? { qualityTips } : {}),
    ...(candidates && candidates.length > 0 ? { candidates } : {}),
  };
}

function normalizeSubject(raw: unknown): Stage5SubjectRef | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = String(o.id ?? "").trim();
  if (!id) return null;
  return {
    id,
    name: String(o.name ?? ""),
    context: String(o.context ?? ""),
    thumbnailUrl: String(o.thumbnailUrl ?? ""),
    researchMethodId:
      (o.researchMethodId as Stage5SubjectRef["researchMethodId"]) ?? "",
    conductedAt: o.conductedAt ? String(o.conductedAt) : undefined,
  };
}

function normalizeNeedGroup(raw: unknown, index: number): NeedGroup | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const id = String(o.id ?? "").trim();
  if (!id) return null;
  const orderRaw = Number(o.order);
  return {
    id,
    name: String(o.name ?? "").trim() || `그룹 ${index + 1}`,
    order: Number.isFinite(orderRaw) ? orderRaw : index,
  };
}

function normalizeNeedGroupMemberIds(
  raw: unknown,
  validGroupIds: Set<string>,
): Record<string, string[]> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: Record<string, string[]> = {};
  for (const [groupId, ids] of Object.entries(
    raw as Record<string, unknown>,
  )) {
    if (!validGroupIds.has(groupId) || !Array.isArray(ids)) continue;
    const seen = new Set<string>();
    out[groupId] = ids
      .map((id) => String(id ?? "").trim())
      .filter((id) => {
        if (!id || seen.has(id)) return false;
        seen.add(id);
        return true;
      });
  }
  return out;
}

export function normalizeStage7Hmw(
  partial: Partial<Stage7HmwData> | null | undefined,
): Stage7HmwData {
  if (!partial) return defaultStage7Hmw();
  const subjects = Array.isArray(partial.subjects)
    ? partial.subjects
        .map(normalizeSubject)
        .filter((s): s is Stage5SubjectRef => s !== null)
    : [];
  const questions = Array.isArray(partial.questions)
    ? partial.questions
        .map(normalizeQuestion)
        .filter((q): q is HmwQuestion => q !== null)
    : [];
  const needGroups = Array.isArray(partial.needGroups)
    ? partial.needGroups
        .map(normalizeNeedGroup)
        .filter((g): g is NeedGroup => g !== null)
        .sort((a, b) => a.order - b.order)
    : [];
  const needGroupMemberIds = normalizeNeedGroupMemberIds(
    partial.needGroupMemberIds,
    new Set(needGroups.map((g) => g.id)),
  );
  return {
    subjects,
    questions,
    needGroups,
    needGroupMemberIds,
    coreSelectionApplied: partial.coreSelectionApplied === true,
    stage5SyncedAt: String(partial.stage5SyncedAt ?? ""),
    kevinGeneratedAt: String(partial.kevinGeneratedAt ?? ""),
  };
}

/** 그룹에 속한 잠재 니즈 id */
export function placedHmwNeedIds(data: Stage7HmwData): Set<string> {
  const placed = new Set<string>();
  for (const ids of Object.values(data.needGroupMemberIds ?? {})) {
    for (const id of ids) placed.add(id);
  }
  return placed;
}

export function sortedHmwNeedGroups(data: Stage7HmwData): NeedGroup[] {
  return [...(data.needGroups ?? [])].sort((a, b) => a.order - b.order);
}

export function updateHmwQuestion(
  data: Stage7HmwData,
  id: string,
  hmwText: string,
  qualityTips?: HmwQualityTip[],
): Stage7HmwData {
  return {
    ...data,
    questions: data.questions.map((q) =>
      q.id === id
        ? {
            ...q,
            hmwText,
            kevinGenerated: false,
            ...(qualityTips ? { qualityTips } : {}),
          }
        : q,
    ),
  };
}

export function updateHmwLatentNeed(
  data: Stage7HmwData,
  id: string,
  latentNeedText: string,
): Stage7HmwData {
  return {
    ...data,
    questions: data.questions.map((q) =>
      q.id === id ? { ...q, latentNeedText, kevinGenerated: false } : q,
    ),
  };
}
