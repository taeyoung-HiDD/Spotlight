import { formatCoachDialogBreaks } from "@/lib/coach/formatCoachDialog";
import {
  buildAdaptedToKnowTable,
  type ToKnowSeedContext,
} from "@/lib/stages/fieldResearch/toKnowSeed";
import type { CremaToKnowBuildContext } from "@/lib/stages/fieldResearch/cremaToKnowV5";
import type {
  ToKnowDiscoveryStep,
  ToKnowPrepState,
  ToKnowRow,
} from "@/lib/stages/fieldResearch/types";

export type Stage3BaselineContext = CremaToKnowBuildContext;

export interface AdvanceToKnowDiscoveryResult {
  prep: ToKnowPrepState;
  coachReply: string;
  draftTable?: ToKnowRow[];
}

function clip(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

export function isToKnowDiscoveryActive(prep: ToKnowPrepState): boolean {
  return prep.phase === "discovery" && prep.step !== "done";
}

/** 코치 하이라이트 · 작업 영역 캡션 */
export const TO_KNOW_PURPOSE_LABEL = "To-know list를 만드는 이유";

export const TO_KNOW_PURPOSE_WORK_CAPTION =
  "사용자 조사 준비하기 — 제안한 문제를 더 깊게 파기 위한 조사 질문 목록";

/** 우측 코치 — 이번 단계 목적 설명 */
export function getToKnowPurposeExplanation(
  baseline: Stage3BaselineContext,
): string {
  const problem = baseline.startingPoint.trim();
  const lead = problem
    ? `1단계에서 적어 두신 「${clip(problem, 72)}」을(를) 더 깊고 정확하게 파보기 위해`
    : "제안하신 문제점을 더 깊고 정확하게 파보기 위해";

  return formatCoachDialogBreaks(
    `${lead}, 지금은 **사용자 조사 준비하기** 단계예요.

**To-know list**는 사용자 조사에 들어가기 **전**에, 무엇을·누구에게·어떤 방법으로 확인할지 적어 두는 **질문 목록**이에요. CREMA v5 형식(주제·질문·조사 방법)으로 정리하며, 확정 답이 아니라 검증할 **가설**이에요.`,
  );
}

export function buildDiscoveryKickoff(
  baseline: Stage3BaselineContext,
): string[] {
  const lines: string[] = [];

  const persona = baseline.personaName?.trim() ?? "";
  const situation = baseline.personaSituation?.trim() ?? "";
  const problem = baseline.startingPoint.trim();

  const targetHint = persona
    ? `${persona}님처럼`
    : "앞서 말씀해 주신 문제를 겪는";
  const contextHint = situation
    ? `컨텍스트는 「${clip(situation, 64)}」로 이해했어요.`
    : problem
      ? `컨텍스트는 「${clip(problem, 64)}」와 연결된 상황으로 보고 있어요.`
      : "컨텍스트는 일·생활에서 문제가 반복되는 상황으로 보고 있어요.";

  lines.push(
    formatCoachDialogBreaks(
      `앞에서 주신 내용을 바탕으로 보면, 이번 조사의 핵심 타겟은 ${targetHint} 사용자예요. ${contextHint}\n\n제가 이렇게 이해한 게 맞는지 먼저 확인하고, 그다음 대상 이름과 조사 범위를 함께 정할게요.`,
    ),
  );
  const unknownCount = baseline.unknowns?.length ?? 0;
  if (unknownCount) {
    lines.push(
      formatCoachDialogBreaks(
        `또, 단계 2에서 정리한 미확인 항목 ${unknownCount}개를 To-know 초안에 반영해 두었어요.`,
      ),
    );
  }

  lines.push(
    "제가 이렇게 이해한 내용이 맞는지 먼저 짧게 확인해 주세요. 확인되면 바로 대상 이름부터 질문을 이어갈게요.",
  );

  return lines;
}

function normalizeTargetAnswer(
  message: string,
  baseline: Stage3BaselineContext,
): string {
  const t = message.trim();
  if (!t) return t;
  if (
    baseline.personaName &&
    /^(네|맞|응|그래|맞아|맞습니다|그 사람|이 사람)/i.test(t)
  ) {
    const parts = [baseline.personaName.trim()];
    const situation = baseline.personaSituation?.trim() ?? "";
    if (situation) {
      parts.push(situation);
    }
    if (t.length > 4 && !/^(네|맞|응|그래)/i.test(t)) {
      parts.push(t);
    }
    return parts.join(" — ");
  }
  return t;
}

function seedContext(
  baseline: Stage3BaselineContext,
  prep: ToKnowPrepState,
): ToKnowSeedContext {
  const target =
    prep.targetPerson.trim() ||
    baseline.personaName?.trim() ||
    clip(baseline.personaSituation ?? "", 24);
  const situation =
    prep.situation.trim() ||
    baseline.personaSituation?.trim() ||
    baseline.startingPoint.trim();

  return {
    ...baseline,
    startingPoint: baseline.startingPoint.trim(),
    personaName: target,
    personaSituation: situation,
    discovery: {
      targetPerson: prep.targetPerson.trim(),
      situation: prep.situation.trim(),
      stakeholders: prep.stakeholders.trim(),
      competitiveContext: prep.competitiveContext.trim(),
    },
  };
}

function buildDraftTable(
  baseline: Stage3BaselineContext,
  prep: ToKnowPrepState,
): ToKnowRow[] {
  return buildAdaptedToKnowTable(seedContext(baseline, prep));
}

const USAGE_GUIDE = formatCoachDialogBreaks(`왼쪽 **To-know 표**에 리서치 준비 가이드 형식 초안을 넣어 두었어요. (가설)

**1단계 문제점**과 **2단계 사전 조사**를 바탕으로, 사용자 조사 전에 확인할 질문을 정리했어요.

**표 항목**
· **주제** — 사용자 · 현재 문제 · 행동 & 맥락 · 기존 솔루션 · 동기 & 목표 (표에서 이름·추가 수정 가능)
· **핵심 질문** — 현장에서 물어볼 질문 (문제점과 연결)
· **파악하고자 하는 정보** — 답으로 얻고 싶은 구체 내용
· **리서치 방법** — FGD · 인뎁스 인터뷰 · 섀도잉 등

질문을 추가·삭제하며 다듬어 보세요. 조사 방법이 궁금하면 방법 옆 ⓘ 아이콘을 보거나, 아래 입력창으로 Kevin에게 물어보세요.

아래 「다음으로 이동」을 누르면 왼쪽 To-know 표 화면으로 이어갈게요.`);

export function advanceToKnowDiscovery(
  message: string,
  prep: ToKnowPrepState,
  baseline: Stage3BaselineContext,
): AdvanceToKnowDiscoveryResult {
  const text = message.trim();
  if (!text) {
    return {
      prep,
      coachReply: "한 줄이라도 적어 주시면 다음으로 넘어갈게요.",
    };
  }

  switch (prep.step) {
    case "alignment": {
      const persona = baseline.personaName?.trim() ?? "";
      const next: ToKnowPrepState = {
        ...prep,
        step: "target",
      };
      return {
        prep: next,
        coachReply: formatCoachDialogBreaks(
          persona
            ? `좋아요. 2단계에서 **${persona}**님을 페르소나로 잡으셨어요. 조사할 **대상**이 이 분이 맞는지, 맞다면 어떤 분인지 한 줄로 알려주세요.`
            : "좋아요. 이번 조사에서 만나볼 **대상**은 어떤 분인가요?",
        ),
      };
    }
    case "target": {
      const targetPerson = normalizeTargetAnswer(text, baseline);
      const next: ToKnowPrepState = {
        ...prep,
        targetPerson,
        step: "situation",
      };
      const situationHint = baseline.startingPoint.trim()
        ? `문제 「${clip(baseline.startingPoint, 50)}」와 관련해, `
        : "";
      return {
        prep: next,
        coachReply: formatCoachDialogBreaks(
          `${situationHint}그 대상이 **지금 어떤 상황**에 있나요? 일·생활·문제가 터지는 맥락을 알려주세요.`,
        ),
      };
    }
    case "situation": {
      const next: ToKnowPrepState = {
        ...prep,
        situation: text,
        step: "stakeholders",
      };
      return {
        prep: next,
        coachReply: formatCoachDialogBreaks(
          "이 문제와 연결된 **다른 이해관계자**가 있나요? (가족, 동료, 파트너, 규제·지원 주체 등)",
        ),
      };
    }
    case "stakeholders": {
      const next: ToKnowPrepState = {
        ...prep,
        stakeholders: text,
        step: "competitive",
      };
      return {
        prep: next,
        coachReply: formatCoachDialogBreaks(
          "**경쟁·대안 환경**은 어떤가요? 지금 쓰는 방법, 경쟁 서비스, 잠재 대안이 있으면 알려주세요.",
        ),
      };
    }
    case "competitive": {
      const finalPrep: ToKnowPrepState = {
        ...prep,
        competitiveContext: text,
        step: "done",
        phase: "draft_shown",
      };
      const draftTable = buildDraftTable(baseline, finalPrep);
      return {
        prep: { ...finalPrep, phase: "refining" },
        coachReply: USAGE_GUIDE,
        draftTable,
      };
    }
    default:
      return {
        prep,
        coachReply: "왼쪽 표를 다듬어 보세요. 궁금한 점은 여기로 물어보시면 돼요.",
      };
  }
}

export function resolveToKnowPrepFromLoad(
  raw: unknown,
  toKnowTable: ToKnowRow[],
): ToKnowPrepState {
  const fallback: ToKnowPrepState = {
    phase: "discovery",
    step: "alignment",
    targetPerson: "",
    situation: "",
    stakeholders: "",
    competitiveContext: "",
  };

  if (toKnowTable.length > 0) {
    return {
      ...fallback,
      phase: "refining",
      step: "done",
    };
  }

  if (!raw || typeof raw !== "object") return fallback;

  const p = raw as Record<string, unknown>;
  const step = p.step as ToKnowDiscoveryStep | undefined;
  const phase = p.phase as ToKnowPrepState["phase"] | undefined;

  const resolved: ToKnowPrepState = {
    phase:
      phase === "discovery" ||
      phase === "draft_shown" ||
      phase === "refining"
        ? phase
        : "discovery",
    step:
      step === "alignment" ||
      step === "target" ||
      step === "situation" ||
      step === "stakeholders" ||
      step === "competitive" ||
      step === "done"
        ? step
        : "alignment",
    targetPerson: typeof p.targetPerson === "string" ? p.targetPerson : "",
    situation: typeof p.situation === "string" ? p.situation : "",
    stakeholders: typeof p.stakeholders === "string" ? p.stakeholders : "",
    competitiveContext:
      typeof p.competitiveContext === "string" ? p.competitiveContext : "",
  };

  // 이전 버전 데이터(step=target)도 풀이 확인 단계(alignment)부터 시작
  // 단, 이미 하나라도 수집된 값이 있으면 기존 진행 상태를 유지한다.
  const hasCollectedAny =
    resolved.targetPerson.trim() ||
    resolved.situation.trim() ||
    resolved.stakeholders.trim() ||
    resolved.competitiveContext.trim();

  if (
    resolved.phase === "discovery" &&
    resolved.step === "target" &&
    !hasCollectedAny
  ) {
    return { ...resolved, step: "alignment" };
  }

  return resolved;
}
