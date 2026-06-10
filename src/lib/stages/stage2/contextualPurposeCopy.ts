import { formatCoachDialogBreaks } from "@/lib/coach/formatCoachDialog";
import {
  CONTEXTUAL_RESEARCH_CAPTION,
  CONTEXTUAL_RESEARCH_TITLE,
  formatGuidelinesForCoach,
} from "@/lib/stages/stage2/contextualResearchGuidelines";

function clip(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

/** 코치 하이라이트 · 작업 영역 라벨 */
export const CONTEXTUAL_PURPOSE_LABEL = "맥락 이해하기를 하는 이유";

export const CONTEXTUAL_ROLE_LABEL = "이 단계의 역할";

export const CONTEXTUAL_USAGE_LABEL = "이렇게 쓰게 돼요";

export const CONTEXTUAL_WORK_CAPTION =
  "맥락 이해하기 — 사전 리서치 (Contextual Research) 4단계 가이드";

/** 맥락 이해하기 의도 — 코치·작업 영역 공통 */
export const CONTEXTUAL_INTENT_SUMMARY = CONTEXTUAL_RESEARCH_CAPTION;

/** 1단계 문제점을 반영한 「왜」 설명 */
export function getContextualPurposeWhy(startingPoint: string): string {
  const problem = startingPoint.trim();
  const lead = problem
    ? `1단계에서 적어 두신 「${clip(problem, 72)}」을(를) 기준으로 삼을게요. 아직 가설이므로, 현장에서 바로 확인하기 전에 맥락을 넓혀 두는 단계예요.`
    : "1단계에서 정리한 문제점은 아직 가설이에요. 현장에서 바로 확인하기 전에 맥락을 넓혀 두는 단계예요.";

  return formatCoachDialogBreaks(
    `${CONTEXTUAL_INTENT_SUMMARY}

${lead}

사전 리서치 4단계 가이드에 맞춰 시장·유사 사례·대상자 프로필·관련 대상자를 사전에 짚어 두고, 현장에서 물어볼 핵심 포인트를 도출합니다.`,
  );
}

/** 「역할」 — 이 단계에서 무엇을 만드는지 (코치·안내 전체) */
export function getContextualPurposeRole(): string {
  return formatCoachDialogBreaks(
    `${CONTEXTUAL_RESEARCH_TITLE} 4단계 가이드에 따라 1단계 문제점에 맞는 맥락 항목을 자동 선정·조사해 캔버스에 보여 드려요.

${formatGuidelinesForCoach()}

직접 칸을 채우지 않아도 되고, 빠진 관점·궁금한 점은 오른쪽 코치 대화로 보완하면 됩니다.`,
  );
}

/** 작업 패널 요약용 — 4단계 목록은 별도 패널에 표시 */
export function getContextualPurposeRoleBrief(): string {
  return formatCoachDialogBreaks(
    `4단계 사전 리서치 가이드에 따라 문제점에 맞는 맥락 항목을 자동 선정·조사해 캔버스에 채웁니다. 직접 칸을 채우지 않아도 되고, 보완은 코치 대화로 하면 됩니다.`,
  );
}

/** 「어떻게 쓰이게 되는지」 — 다음 단계 연결 */
export function getContextualPurposeUsage(): string {
  return formatCoachDialogBreaks(
    `정리한 항목은 단계 3 To-know list 초안과 조사 질문으로 넘어가요.

「최종 완료」 후에는 항목별 사전 조사(데스크·2차 자료)를 실행할 수 있어요. AI·자료 기반 내용은 가설이므로, 반드시 현장·사용자 조사로 검증해야 합니다.`,
  );
}

/** 코치 인트로 하이라이트용 — 왜 (한 블록) */
export function getContextualPurposeExplanation(startingPoint: string): string {
  return getContextualPurposeWhy(startingPoint);
}

/** 인트로 마무리 — 맥락 정리 시작 안내 */
export function buildContextualOrganizeKickoff(startingPoint: string): string {
  const problem = startingPoint.trim();
  if (problem) {
    return formatCoachDialogBreaks(
      `이제 「${clip(problem, 64)}」을 기준으로 맥락 캔버스를 채워 볼게요.

왼쪽 영역에 사전 조사 결과가 나타나고, 보완·질문은 아래 코치 대화로 이어가면 됩니다.`,
    );
  }
  return formatCoachDialogBreaks(
    `1단계 문제점이 아직 없으면, 아래에서 문제를 짧게 말씀해 주세요. 있으면 그걸 기준으로 캔버스를 채워 갈게요.

보완·질문은 코치 대화로 이어가면 됩니다.`,
  );
}
