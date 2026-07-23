import type {
  NeedGroup,
  Stage5SubjectRef,
} from "@/lib/stages/stage5/latentNeedsTypes";

export interface HmwQuestion {
  id: string;
  latentNeedId: string;
  subjectId: string;
  /** 5단계 잠재 니즈 스냅샷 */
  latentNeedText: string;
  hmwText: string;
  kevinGenerated?: boolean;
}

export interface Stage7HmwData {
  subjects: Stage5SubjectRef[];
  questions: HmwQuestion[];
  /** 6단계 니즈 분류 그룹 스냅샷 */
  needGroups: NeedGroup[];
  /** 그룹 id → 잠재 니즈 id */
  needGroupMemberIds: Record<string, string[]>;
  stage5SyncedAt: string;
  kevinGeneratedAt: string;
}

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

function normalizeQuestion(raw: unknown): HmwQuestion | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const latentNeedId = String(o.latentNeedId ?? "").trim();
  const subjectId = String(o.subjectId ?? "").trim();
  const latentNeedText = String(o.latentNeedText ?? "").trim();
  if (!latentNeedId && !latentNeedText) return null;
  return {
    id: String(o.id ?? createHmwQuestionId()).trim() || createHmwQuestionId(),
    latentNeedId: latentNeedId || `orphan-${createHmwQuestionId()}`,
    subjectId,
    latentNeedText,
    hmwText: String(o.hmwText ?? ""),
    kevinGenerated: o.kevinGenerated === true,
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
    researchMethodId: (o.researchMethodId as Stage5SubjectRef["researchMethodId"]) ?? "",
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
  for (const [groupId, ids] of Object.entries(raw as Record<string, unknown>)) {
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
): Stage7HmwData {
  return {
    ...data,
    questions: data.questions.map((q) =>
      q.id === id ? { ...q, hmwText, kevinGenerated: false } : q,
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
