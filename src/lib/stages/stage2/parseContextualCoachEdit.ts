import { STAGE2_EMPATHY_MAP_DEFLECT_HINT } from "@/lib/coach/empathyMapCoachRules";
import { COACH_EMPATHY_MAP_PROMPT_RULE } from "@/lib/coach/sanitizeCoachKorean";
import {
  mergeAnswerItems,
  parseAnswerTokens,
  splitListRespectingParens,
} from "@/lib/stages/stage2/contextualAnswers";
import {
  CONTEXTUAL_DIMENSIONS,
  type ContextualDimensionAnswers,
  type ContextualDimensionId,
} from "@/lib/stages/stage2/contextualDimensions";
import { filterDeclarativeBullets } from "@/lib/stages/stage2/sanitizeContextualFindings";

export type ContextualEditPatch = Partial<
  Record<ContextualDimensionId, string[]>
>;

const EDIT_LINE =
  /EDIT:(primary_users|stakeholders|situation|environment|competitors|products_services|policy|infrastructure)\|(.+)/i;

const DIMENSION_EDIT_SPECS: {
  id: ContextualDimensionId;
  labels: string[];
}[] = [
  { id: "primary_users", labels: ["주 사용자", "주사용자", "타겟", "고객"] },
  { id: "stakeholders", labels: ["이해 관계자", "이해관계자", "관계자"] },
  { id: "situation", labels: ["상황", "맥락", "상황·맥락"] },
  { id: "environment", labels: ["주변 환경", "환경"] },
  { id: "competitors", labels: ["경쟁", "대안", "경쟁·대안", "경쟁자"] },
  {
    id: "products_services",
    labels: ["연관 제품", "제품·서비스", "연관 제품·서비스", "제품", "서비스"],
  },
  { id: "policy", labels: ["정책", "규제", "정책·규제"] },
  { id: "infrastructure", labels: ["인프라"] },
];

function extractListPayload(raw: string): string[] {
  const cleaned = raw
    .trim()
    .replace(/^(?:에|에게)\s*/u, "")
    .replace(/(?:을|를)\s*(?:추가|넣|적|바꿔|수정|변경|갱신|해\s*주).*$/iu, "")
    .replace(/(?:추가|넣어|적어)\s*(?:해\s*주|주세요|줘).*$/iu, "")
    .trim();
  if (!cleaned) return [];
  return splitListRespectingParens(cleaned);
}

function isReplaceIntent(message: string): boolean {
  return /(?:바꿔|바꾸|수정|변경|교체|덮어)/u.test(message);
}

/** 사용자 발화 — 「주 사용자에 ○○ 추가」 등 */
export function parseContextualUserEdit(message: string): ContextualEditPatch | null {
  const text = message.trim();
  if (!text) return null;

  for (const spec of DIMENSION_EDIT_SPECS) {
    for (const label of spec.labels) {
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const patterns = [
        new RegExp(
          `${escaped}(?:에게|에)?\\s*(.+?)(?:을|를)?\\s*(?:추가|넣어|적어|바꿔|수정|변경|갱신)`,
          "iu",
        ),
        new RegExp(`${escaped}(?:에게|에)\\s*(.+)$`, "iu"),
      ];
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (!match?.[1]) continue;
        const items = extractListPayload(match[1]);
        if (items.length) {
          return { [spec.id]: items };
        }
      }
    }
  }

  return null;
}

export function applyContextualAnswerPatch(
  answers: ContextualDimensionAnswers,
  patch: ContextualEditPatch,
  options?: { replace?: boolean },
): ContextualDimensionAnswers {
  const next = { ...answers };
  const replace = options?.replace ?? false;
  for (const d of CONTEXTUAL_DIMENSIONS) {
    const items = patch[d.id];
    if (!items?.length) continue;
    const declarative = filterDeclarativeBullets(items);
    if (!declarative.length) continue;
    next[d.id] = replace
      ? declarative
      : filterDeclarativeBullets(mergeAnswerItems(next[d.id], declarative));
  }
  return next;
}

export function parseContextualCoachEdit(
  userMessage: string,
  coachReply: string,
): ContextualEditPatch | null {
  const line = coachReply.match(EDIT_LINE);
  if (line) {
    const id = line[1] as ContextualDimensionId;
    const items = parseAnswerTokens(line[2]);
    if (items.length) return { [id]: items };
  }

  const quoted = coachReply.match(/[「『]([^」』]+)[」』](?:을|를)?\s*(?:추가|반영|넣)/u);
  if (quoted?.[1]) {
    const fromUser = parseContextualUserEdit(userMessage);
    if (fromUser) {
      const dim = Object.keys(fromUser)[0] as ContextualDimensionId;
      const items = extractListPayload(quoted[1]);
      if (items.length) return { [dim]: items };
    }
  }

  return parseContextualUserEdit(userMessage);
}

export function stripContextualEditMetaLine(reply: string): string {
  return reply
    .replace(
      /\n?EDIT:(primary_users|stakeholders|situation|environment|competitors|products_services|policy|infrastructure)\|[^\n]+/gi,
      "",
    )
    .trim();
}

export const STAGE2_INTRO_CHAT_HINT = `
[맥락 이해하기 · 설명 페이지 — 왼쪽 가이드 확인 후 Q&A]
- 왼쪽 작업 영역에 사전 리서치 4단계 가이드·예시·단계 목적이 이미 표시되어 있습니다. 동일한 내용을 다시 길게 설명하지 마세요.
- 사용자가 가이드·예시를 읽고 이해했는지 확인하고, 궁금한 점만 짧고 명확하게 답하세요.
- 4단계 가이드(시장·트렌드 / 유사 사례 / 대상자 프로필 / 관련 대상자), 이 단계의 역할, To-know·현장 조사와의 연결에 대한 질문에 답할 수 있습니다.
- 아직 사전 조사 결과가 없습니다. 특정 영역 조사 내용을 채우거나 EDIT 줄을 넣지 마세요.
- 준비가 되었다면 작업 영역 「다음으로 이동」 버튼을 안내하세요.
`.trim();

export const STAGE2_RESEARCH_CHAT_HINT = `
[맥락 이해 · 사전 리서치 4단계 가이드 기반 자동 조사 후 코치 보완]
- 사전 리서치 가이드: 1)시장·트렌드 2)유사 사례 3)대상자 프로필(+Diary) 4)관련 대상자 사전 조사
- 왼쪽 캔버스는 문제점에 맞게 자동 선정된 영역의 사전 조사(가설) 결과입니다. 사용자가 직접 칸을 채우지 않았습니다.
- 주 사용자: **누구인지(세그먼트·역할)** 와 **특성·행태**를 보완하세요. 불편·니즈만 나열하지 마세요.
- 이해 관계자: **운영·공급·중개·규제** 주체만 보완하세요. 손님·이용자·소비자(주 사용자)는 stakeholders에 넣지 마세요.
- 빠진 관점 보완에 답하세요. 존댓말(~습니다/~입니다) 가설·관찰만 제안하고, 질문형·의문형·평서체(~이다/~다)는 쓰지 마세요.
- 사용자가 특정 영역 내용을 추가·수정하라고 하면, 확인 후 응답 맨 마지막 줄에 정확히 한 줄만 추가:
  EDIT:primary_users|학생(대학생, 고등학생), 직장인, 주부
  (항목 id: primary_users, stakeholders, situation, environment, competitors, products_services, policy, infrastructure)
- 수정·추가가 없으면 EDIT 줄을 넣지 마세요.
- ${COACH_EMPATHY_MAP_PROMPT_RULE}
${STAGE2_EMPATHY_MAP_DEFLECT_HINT}
`.trim();

export function contextualEditModeFromUser(message: string): "merge" | "replace" {
  return isReplaceIntent(message) ? "replace" : "merge";
}
