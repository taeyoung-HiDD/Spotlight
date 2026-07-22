import { formatCoachDialogBreaks } from "@/lib/coach/formatCoachDialog";
import type { CoachDialogItem } from "@/components/stage/motion/CoachSequentialDialog";
import {
  CONTEXTUAL_DIMENSIONS,
  type ContextualDimensionAnswers,
  type ContextualDimensionId,
  type ContextualDiscoveryStep,
} from "@/lib/stages/stage2/contextualDimensions";
import {
  formatAnswerList,
  normalizeAnswerValue,
} from "@/lib/stages/stage2/contextualAnswers";
import type { EmpathyMapData } from "@/lib/stages/stage2/empathyMap";
import type { CoachInputGuide } from "@/lib/coach/inputGuidance";
import { formatSelectedDimensionsLabel } from "@/lib/stages/stage2/selectContextualDimensions";
import { insightToQuestion } from "@/lib/stages/fieldResearch/toKnowInfoQuestions";

/** intro: 코치 안내 → research: 자동 사전 조사·코치 보완 질문 */
export type ContextualPrepPhase = "intro" | "research";

export interface ContextualPrepState {
  phase: ContextualPrepPhase;
  step: ContextualDiscoveryStep;
  answers: ContextualDimensionAnswers;
  /** 문제점 기준 자동 선정된 사전 조사 영역 */
  selectedDimensions?: ContextualDimensionId[];
  autoResearchComplete?: boolean;
  /** 코치 대화로 받은 보완 메모 */
  confirmNote?: string;
}

export function defaultContextualPrep(): ContextualPrepState {
  return {
    phase: "intro",
    step: "done",
    answers: {},
    selectedDimensions: [],
    autoResearchComplete: false,
  };
}

export function isContextualIntroActive(prep: ContextualPrepState): boolean {
  return prep.phase === "intro";
}

/** @deprecated discovery → intro */
export function isContextualDiscoveryActive(prep: ContextualPrepState): boolean {
  return isContextualIntroActive(prep);
}

export function isContextualResearchActive(prep: ContextualPrepState): boolean {
  return prep.phase === "research";
}

const LEGACY_STEPS = new Set([
  "keyword_select",
  "result_note",
  "unknowns",
  "confirm",
  "primary_users",
  "stakeholders",
  "situation",
  "environment",
  "competitors",
  "products_services",
  "policy",
  "infrastructure",
]);

function normalizeSelectedDimensions(
  raw: unknown,
  answers: ContextualDimensionAnswers,
): ContextualDimensionId[] {
  if (Array.isArray(raw)) {
    const ids = raw.filter(
      (x): x is ContextualDimensionId =>
        typeof x === "string" &&
        CONTEXTUAL_DIMENSIONS.some((d) => d.id === x),
    );
    if (ids.length) return ids;
  }
  return CONTEXTUAL_DIMENSIONS.filter(
    (d) => (answers[d.id]?.length ?? 0) > 0,
  ).map((d) => d.id);
}

/** 저장 데이터 마이그레이션 */
export function normalizeContextualPrep(raw: unknown): ContextualPrepState {
  const base = defaultContextualPrep();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Record<string, unknown>;

  const rawPhase = o.phase;
  let phase: ContextualPrepPhase = "intro";
  if (rawPhase === "research" || rawPhase === "refining") {
    phase = "research";
  } else if (rawPhase === "discovery") {
    phase = o.autoResearchComplete ? "research" : "intro";
  } else if (rawPhase === "intro") {
    phase = "intro";
  }

  const answers: ContextualDimensionAnswers = {};
  if (o.answers && typeof o.answers === "object") {
    for (const d of CONTEXTUAL_DIMENSIONS) {
      const v = (o.answers as Record<string, unknown>)[d.id];
      const normalized = normalizeAnswerValue(v);
      if (normalized.length) answers[d.id] = normalized;
    }
  }

  const confirmNote =
    typeof o.confirmNote === "string" ? o.confirmNote.trim() : "";

  const selectedDimensions = normalizeSelectedDimensions(
    o.selectedDimensions,
    answers,
  );

  const autoResearchComplete =
    o.autoResearchComplete === true ||
    (phase === "research" && selectedDimensions.length > 0);

  if (autoResearchComplete) phase = "research";

  return {
    phase,
    step: "done",
    answers,
    selectedDimensions,
    autoResearchComplete,
    confirmNote: confirmNote || undefined,
  };
}

function clipProblem(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

/** 작업 영역 가이드와 중복하지 않음 — 왼쪽 안내 확인·질문 수신용 짧은 코치 인트로 */
export function buildContextualDiscoveryIntroMessages(
  startingPoint: string,
): CoachDialogItem[] {
  const problem = startingPoint.trim();
  const messages: CoachDialogItem[] = [
    {
      type: "bubble",
      content: formatCoachDialogBreaks(
        problem
          ? `이제 맥락 이해하기 단계예요. 1단계에서 적어 두신 문제점을 기준으로, 현장 리서치 전에 맥락을 넓혀 둘 거예요.`
          : `이제 맥락 이해하기 단계예요. 현장 리서치 전에 맥락을 넓혀 두는 자리예요.`,
      ),
    },
    {
      type: "bubble",
      content: formatCoachDialogBreaks(
        `왼쪽 작업 영역에 사전 리서치 4단계 가이드와 예시, 이 단계가 왜 필요한지·어떻게 쓰이는지 정리해 두었어요.

가이드와 예시를 차근차근 읽어 보신 뒤, 이해가 안 되는 부분이나 추가로 궁금한 점이 있으면 아래에 말씀해 주세요.`,
      ),
    },
  ];

  if (problem) {
    messages.push({
      type: "bubble",
      content: formatCoachDialogBreaks(
        `이번에 기준으로 삼을 문제점은 「${clipProblem(problem, 72)}」예요. 궁금한 점을 정리하신 뒤, 작업 영역의 「다음으로 이동」을 누르면 이 문제에 맞는 영역을 자동으로 사전 조사할게요.`,
      ),
    });
  } else {
    messages.push({
      type: "bubble",
      content: formatCoachDialogBreaks(
        `궁금한 점을 정리하신 뒤, 작업 영역의 「다음으로 이동」을 누르면 4단계 가이드에 맞춰 사전 조사를 시작할게요.`,
      ),
    });
  }

  return messages;
}

export function buildResearchCoachKickoff(
  startingPoint: string,
  selected: ContextualDimensionId[],
  loading: boolean,
): CoachDialogItem[] {
  const label = formatSelectedDimensionsLabel(selected);
  if (loading) {
    return [
      {
        type: "bubble",
        content: formatCoachDialogBreaks(
          `4단계 사전 리서치 가이드에 맞춰 ${selected.length}개 영역(${label})을 선정했어요.\n\n사전 조사를 진행하는 중이에요. 왼쪽 캔버스 칸에 결과가 채워질 거예요.`,
        ),
      },
    ];
  }
  return [
    {
      type: "bubble",
      content: formatCoachDialogBreaks(
        `4단계 사전 리서치 가이드에 따라 선정한 ${selected.length}개 영역 — ${label} — 조사를 마쳤어요.\n\n왼쪽 캔버스에서 결과를 확인해 주세요. 빠진 관점·더 알고 싶은 점은 아래에 편하게 물어봐 주세요.`,
      ),
    },
    {
      type: "bubble",
      variant: "secondary",
      content:
        "※ AI·2차 자료 기반 가설입니다. 현장·사용자 조사로 반드시 검증하세요.",
    },
  ];
}

export function buildContextualSummary(
  problem: string,
  answers: ContextualDimensionAnswers,
  confirmNote?: string,
): string {
  const lines: string[] = [];
  if (problem.trim()) {
    lines.push(`[1단계 문제점]\n${problem.trim()}`);
  }
  for (const d of CONTEXTUAL_DIMENSIONS) {
    const items = answers[d.id];
    if (items?.length) {
      lines.push(`[${d.label}]\n${items.map((x) => `· ${x}`).join("\n")}`);
    }
  }
  if (confirmNote?.trim()) {
    lines.push(`[코치 보완 메모]\n${confirmNote.trim()}`);
  }
  return lines.join("\n\n");
}

export function deriveToKnowFromContextual(
  problem: string,
  answers: ContextualDimensionAnswers,
  selected?: ContextualDimensionId[],
): string[] {
  const p = problem.trim();
  const dims = selected?.length
    ? CONTEXTUAL_DIMENSIONS.filter((d) => selected.includes(d.id))
    : CONTEXTUAL_DIMENSIONS;

  const items: string[] = [];
  if (p) {
    const clipped = p.length > 48 ? `${p.slice(0, 48)}…` : p;
    items.push(
      `「${clipped}」은(는) 실제 사용자 경험에서 어떻게 드러나나요?`,
    );
  }

  for (const d of dims) {
    const list = answers[d.id];
    if (!list?.length) {
      items.push(
        `「${p.length > 48 ? `${p.slice(0, 48)}…` : p || "문제점"}」 해결과 관련된 ${d.label}은(는) 현장에서 어떻게 확인할 수 있나요?`,
      );
      continue;
    }
    const summary = formatAnswerList(list);
    const clippedSummary =
      summary.length > 56 ? `${summary.slice(0, 56)}…` : summary;
    items.push(insightToQuestion(d.id, clippedSummary, p, "목표 사용자"));
  }
  return items.slice(0, 12);
}

export function appendContextualCoachNote(
  prep: ContextualPrepState,
  message: string,
): ContextualPrepState {
  const note = message.trim();
  if (!note) return prep;
  const confirmNote = prep.confirmNote ? `${prep.confirmNote}\n${note}` : note;
  return { ...prep, confirmNote };
}

export function getContextualIntroInputGuide(): CoachInputGuide {
  return {
    title: "가이드 확인 · 질문 예시",
    hint: "왼쪽 가이드를 읽은 뒤, 이해가 안 되는 부분이나 궁금한 점을 물어보세요.",
    examples: [
      "4단계 가이드가 각각 뭘 의미하는지 더 설명해 주세요",
      "사전 조사 결과는 현장 조사에서 어떻게 쓰이나요?",
      "대상자 프로필 분석 항목이 뭐예요?",
    ],
    placeholder: "궁금한 점을 입력하세요…",
  };
}

export function getContextualRefineInputGuide(): CoachInputGuide {
  return {
    title: "맥락 보완 · 질문",
    hint: "사전 조사 결과를 본 뒤, 빠진 관점·궁금한 점을 말씀해 주세요.",
    examples: [
      "주 사용자에 ○○도 포함해 주세요",
      "경쟁 대안 쪽을 더 구체적으로 알고 싶어요",
      "정책·규제 쪽을 더 구체적으로 보완해 주세요",
    ],
    placeholder: "보완·질문을 입력하세요…",
  };
}
