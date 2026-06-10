import type { UiLocale } from "@/lib/i18n/uiLocale";
import type { ContextualPrepState } from "@/lib/stages/stage2/contextualDiscoveryFlow";
import type { ContextualDimensionResearchMap } from "@/lib/stages/stage2/contextualDimensionResearch";

/** Nielsen Norman 그룹 스타일 공감맵 4영역 (+ 중앙 페르소나) */

export type EmpathyQuadrantId = "says" | "thinks" | "does" | "feels";

export interface EmpathyStickyItem {
  id: string;
  text: string;
  fromSuggestion?: boolean;
}

export interface EmpathyMapData {
  personaName: string;
  /** 중앙 한 줄 요약 표시 — 예:「15년차 직장인」(자동 생성) */
  personaContext: string;
  /** Kevin·사용자가 말한 상황 원문(길어도 됨) → 요약·썸네일 생성 입력 */
  personaSituationRaw: string;
  /** 페르소나 이미지 — 자동 DiceBear 또는 사용자가 붙인 URL·Kevin JSON */
  personaThumbnailUrl: string;
  /** 코치와 페르소나 맥락 QnA 완료 후 공감맵 네 칸 편집 허용 */
  personaQnaComplete: boolean;
  /** 사전 조사에서 정리한 관점/가설 메모 */
  contextualInsights: string;
  /** 아직 알 수 없어 실제 사용자·현장 조사로 확인할 항목 */
  toKnowUnknowns: string[];
  /** 맥락 이해하기 코치 대화(항목별 구체화) 상태 */
  contextualPrep: ContextualPrepState;
  /** 항목별 사전 조사 실행 결과 (가설·2차 자료) */
  contextualDimensionResearch: ContextualDimensionResearchMap;
  quadrants: Record<EmpathyQuadrantId, EmpathyStickyItem[]>;
}

export interface EmpathyQuadrantDef {
  id: EmpathyQuadrantId;
  labelEn: string;
  labelKo: string;
  description: string;
  /** 영역별 민트·청록 톤 (다크 테마용 opacity) */
  accentClass: string;
  coachSuggestions: string[];
}

export const EMPATHY_QUADRANTS: EmpathyQuadrantDef[] = [
  {
    id: "says",
    labelEn: "SAYS",
    labelKo: "말함",
    description:
      "사람이 바깥으로 꺼낸 말이에요. 인용처럼 짧게 적어도 돼요.",
    accentClass: "border-teal-400/35 bg-teal-950/20",
    coachSuggestions: [
      "더 큰 게 좋을까?",
      "뭘 미리 알아봐야 할지 모르겠어요",
      "어디부터 보면 될까요?",
    ],
  },
  {
    id: "thinks",
    labelEn: "THINKS",
    labelKo: "생각함",
    description: "겉으로 안 드러나는 생각·걱정·기대예요.",
    accentClass: "border-cyan-400/35 bg-cyan-950/25",
    coachSuggestions: [
      "내가 헷갈리면 다들 어떻게 볼까",
      "뭘 놓치고 있는 거 아닐까",
      "나에게 맞는 게 뭔지 확신이 안 서요",
    ],
  },
  {
    id: "does",
    labelEn: "DOES",
    labelKo: "행동함",
    description: "실제로 하는 행동·습관을 적어요.",
    accentClass: "border-emerald-400/35 bg-emerald-950/20",
    coachSuggestions: [
      "사이트에서 스펙 비교표를 본다",
      "매장 가서 두 모델을 나란히 본다",
      "주변에 어떤 샀는지 물어본다",
    ],
  },
  {
    id: "feels",
    labelEn: "FEELS",
    labelKo: "느낌",
    description: "이 상황에서의 감정 한 단어나 짧은 표현.",
    accentClass: "border-green-400/35 bg-green-950/15",
    coachSuggestions: [
      "조바심 난다",
      "설렘 반 불안 반",
      "누구 믿어야 할지 모르겠다",
    ],
  },
];

export function emptyEmpathyMapQuadrants(): Record<
  EmpathyQuadrantId,
  EmpathyStickyItem[]
> {
  return {
    says: [],
    thinks: [],
    does: [],
    feels: [],
  };
}

/** 각 영역에 스티커 최소 개수 · 중앙 이름 필수 */
export const EMPATHY_MAP_MIN_PER_QUADRANT = 2;

/** 분면 제목 아래 안내 (Nielsen Norman 공감맵 용어) */
export const EMPATHY_QUADRANT_HINTS: Record<
  UiLocale,
  Record<EmpathyQuadrantId, string>
> = {
  ko: {
    says: "사용자가 말한 내용",
    thinks: "사용자가 생각하는 내용",
    does: "사용자의 행동",
    feels: "사용자가 느끼는 감정",
  },
  en: {
    says: "What a user says",
    thinks: "What a user thinks",
    does: "What a user does",
    feels: "What a user feels",
  },
};

/** 포스트잇 빈 칸 예시 — 분면마다 하나 */
export const EMPATHY_QUADRANT_POSTIT_EXAMPLES: Record<
  UiLocale,
  Record<EmpathyQuadrantId, string>
> = {
  ko: {
    says: "더 큰 게 좋을까?",
    thinks: "뭘 놓치고 있는 거 아닐까",
    does: "사이트에서 스펙 비교표를 본다",
    feels: "조바심 난다",
  },
  en: {
    says: "What size should I get?",
    thinks: "What if I'm missing something?",
    does: "Compares specs on the website",
    feels: "Feeling anxious",
  },
};

export function empathyQuadrantHint(
  id: EmpathyQuadrantId,
  locale: UiLocale = "ko",
): string {
  return EMPATHY_QUADRANT_HINTS[locale][id];
}

export function empathyQuadrantPostitExample(
  id: EmpathyQuadrantId,
  locale: UiLocale = "ko",
): string {
  return EMPATHY_QUADRANT_POSTIT_EXAMPLES[locale][id];
}

/** 공감맵 분면 포스트잇 — 가로 4 · 세로 3 (최대 12) */
export const EMPATHY_QUADRANT_POSTIT_COLS = 4;
export const EMPATHY_QUADRANT_POSTIT_ROWS = 3;
export const EMPATHY_QUADRANT_MAX_VISIBLE =
  EMPATHY_QUADRANT_POSTIT_COLS * EMPATHY_QUADRANT_POSTIT_ROWS;

export function empathyPostitGridPlacement(index: number): {
  row: number;
  col: number;
} {
  const grid = EMPATHY_QUADRANT_POSTIT_COLS;
  return {
    row: Math.floor(index / grid) + 1,
    col: (index % grid) + 1,
  };
}

/** 데스크톱 공감맵 중앙 원과 겹치지 않도록 분면별 안쪽 여백 */
export function empathyQuadrantTowardCenterPad(id: EmpathyQuadrantId): string {
  switch (id) {
    case "says":
      return "pb-9 pr-9 pt-1 pl-4 sm:pb-10 sm:pl-5 sm:pr-[3.75rem]";
    case "thinks":
      return "pb-9 pl-9 pt-1 pr-1 sm:pb-10 sm:pl-[3.75rem]";
    case "does":
      return "pt-9 pr-9 pb-1 pl-4 sm:pt-10 sm:pl-5 sm:pr-[3.75rem]";
    case "feels":
      return "pt-9 pl-9 pb-1 pr-1 sm:pt-10 sm:pl-[3.75rem]";
    default:
      return "";
  }
}

export function empathyMapGatePassed(data: EmpathyMapData): boolean {
  const nameOk = data.personaName.trim().length > 0;
  const quadrantsOk = EMPATHY_QUADRANTS.every(
    (q) => data.quadrants[q.id].length >= EMPATHY_MAP_MIN_PER_QUADRANT,
  );
  return nameOk && quadrantsOk;
}
