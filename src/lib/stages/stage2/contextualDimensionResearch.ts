import { formatAnswerList } from "@/lib/stages/stage2/contextualAnswers";
import {
  heuristicPeopleDimensionResearch,
  isPeopleContextualDimension,
  type PeopleResearchPriorContext,
} from "@/lib/stages/stage2/peopleContextualResearch";
import { sanitizeContextualFindings } from "@/lib/stages/stage2/sanitizeContextualFindings";
import {
  CONTEXTUAL_DIMENSIONS,
  getDimensionDef,
  type ContextualDimensionAnswers,
  type ContextualDimensionId,
} from "@/lib/stages/stage2/contextualDimensions";
import { getGuidelineForDimension } from "@/lib/stages/stage2/contextualResearchGuidelines";

export type ContextualResearchRunStatus = "idle" | "loading" | "done" | "error";

export interface ContextualDimensionResearchResult {
  status: ContextualResearchRunStatus;
  findings: string;
  errorMessage?: string;
  generatedAt?: string;
}

export type ContextualDimensionResearchMap = Partial<
  Record<ContextualDimensionId, ContextualDimensionResearchResult>
>;

export function emptyContextualDimensionResearch(): ContextualDimensionResearchMap {
  return {};
}

export function normalizeContextualDimensionResearch(
  raw: unknown,
): ContextualDimensionResearchMap {
  if (!raw || typeof raw !== "object") return {};
  const out: ContextualDimensionResearchMap = {};
  for (const d of CONTEXTUAL_DIMENSIONS) {
    const entry = (raw as Record<string, unknown>)[d.id];
    if (!entry || typeof entry !== "object") continue;
    const o = entry as Record<string, unknown>;
    const status = o.status;
    const findings =
      typeof o.findings === "string"
        ? sanitizeContextualFindings(o.findings.trim())
        : "";
    if (
      status !== "idle" &&
      status !== "loading" &&
      status !== "done" &&
      status !== "error"
    ) {
      continue;
    }
    out[d.id] = {
      status,
      findings,
      errorMessage:
        typeof o.errorMessage === "string" ? o.errorMessage.trim() : undefined,
      generatedAt:
        typeof o.generatedAt === "string" ? o.generatedAt : undefined,
    };
  }
  return out;
}

/** 저장 시 loading 상태는 idle로 정리 */
export function contextualResearchForSave(
  map: ContextualDimensionResearchMap,
): ContextualDimensionResearchMap {
  const out: ContextualDimensionResearchMap = {};
  for (const [id, entry] of Object.entries(map)) {
    if (!entry) continue;
    const key = id as ContextualDimensionId;
    out[key] = {
      ...entry,
      status: entry.status === "loading" ? "idle" : entry.status,
    };
  }
  return out;
}

export function heuristicDimensionResearch(
  problem: string,
  dimensionId: ContextualDimensionId,
  answers: ContextualDimensionAnswers,
  prior?: PeopleResearchPriorContext,
): string {
  if (isPeopleContextualDimension(dimensionId)) {
    return heuristicPeopleDimensionResearch(problem, dimensionId, answers, prior);
  }

  const def = getDimensionDef(dimensionId);
  const guideline = getGuidelineForDimension(dimensionId);
  const items = answers[dimensionId] ?? [];
  const listed =
    items.length > 0
      ? items.map((x) => `· ${x}`).join("\n")
      : "· (문제점만 기준 — AI·2차 자료로 가설 조사)";

  const problemLine = problem.trim()
    ? `문제점 「${problem.trim().slice(0, 120)}」`
    : "문제점 (1단계 미입력)";

  return sanitizeContextualFindings(
    [
      `[${def.label}] 사전 조사 메모 (가설·2차 자료 기반)`,
      `가이드: ${guideline.order}. ${guideline.title}`,
      "",
      problemLine,
      "",
      "정리한 후보",
      listed,
      "",
      "핵심 발견 (가설)",
      `· ${def.label} 관점에서 위 후보가 문제와 맞닿는 지점을 가설로 정리했어요.`,
      items.length
        ? `· ${formatAnswerList(items)} 등이 이 맥락의 중심 후보로 보입니다.`
        : `· 문제점과 ${def.label} 관점에서 연결 가능한 후보를 가설로 정리했어요.`,
      "",
      "참고할 관점",
      `· ${def.shortLabel} 축에서 함께 열어 두면 좋은 인접 역할·상황·제약을 짧게 적어 두었어요.`,
      `· 2차 자료·일반 지식 기반 추론이므로, 구체적 사실은 아직 가설 상태입니다.`,
      "",
      "※ AI·2차 자료 기반 가설입니다. 현장·사용자 조사로 검증하세요.",
    ].join("\n"),
  );
}

export interface ContextualResearchRequest {
  problem: string;
  dimensionId: ContextualDimensionId;
  dimensionLabel: string;
  answers: string[];
}
