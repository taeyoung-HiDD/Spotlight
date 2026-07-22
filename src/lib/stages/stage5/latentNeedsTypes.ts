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

export interface Stage5LatentNeedsData {
  subjects: Stage5SubjectRef[];
  postits: Stage5BoardPostit[];
  stage4SyncedAt: string;
  kevinGeneratedAt: string;
}

export function defaultStage5LatentNeeds(): Stage5LatentNeedsData {
  return {
    subjects: [],
    postits: [],
    stage4SyncedAt: "",
    kevinGeneratedAt: "",
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
  return {
    ...data,
    subjects,
    postits: data.postits.filter((p) => allowed.has(p.subjectId)),
  };
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
  });
}

export function hasLatentNeedsContent(data: Stage5LatentNeedsData): boolean {
  return data.postits.some((p) => p.text.trim());
}
