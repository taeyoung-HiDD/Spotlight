import { STAGE_META } from "@/lib/stages/constants";
import { formatJourneyPhases } from "@/lib/stages/journeyPhases";

/** 강조 스타일 — 마크다운 별표 대신 구조화 */
export type StageTextEmphasis = "strong" | "gold";

export type StageTextPart = {
  text: string;
  emphasis?: StageTextEmphasis;
};

export type StageIntroMessage =
  | {
      type: "bubble";
      variant?: "primary" | "secondary";
      parts: StageTextPart[];
    }
  | {
      type: "highlight";
      label: string;
      parts: StageTextPart[];
    };

export type StageConfigEntry = {
  stageNumber: number;
  /** true: 인트로(중앙 코치) → work(좌우 분할) / false: 진입 즉시 work */
  isConversationalInput: boolean;
  /** true: 인트로 후 대화로 슬롯 수집 (단계 1) */
  hasConversationalCollection?: boolean;
  introStatusLabel?: string;
  introStatusSub?: string;
  workStatusLabel?: string;
  workStatusSub?: string;
  /** 대화형 단계만 — 인트로 코치 발화 */
  introMessages?: StageIntroMessage[];
};

export type InteractionMode = "intro" | "work";

const CONVERSATIONAL_STAGES = new Set([1, 6, 10, 11]);

function metaLabel(stageNumber: number): string {
  return STAGE_META[stageNumber]?.label ?? `단계 ${stageNumber}`;
}

function metaTitle(stageNumber: number): string {
  return STAGE_META[stageNumber]?.title ?? "작업";
}

/** 단계 1 · 첫 방문 환영 (진단은 onboarding 단계에서) */
const STAGE_1_INTRO: StageIntroMessage[] = [
  {
    type: "bubble",
    parts: [
      { text: "안녕하세요. " },
      { text: "Spotlight", emphasis: "strong" },
      { text: "에 오신 걸 환영해요. 저는 코치 " },
      { text: "Kevin", emphasis: "gold" },
      { text: "예요." },
    ],
  },
  {
    type: "bubble",
    parts: [
      { text: "디자인씽킹이나 창업이 " },
      { text: "처음이어도 괜찮아요", emphasis: "strong" },
      { text: ". 누구나 한 걸음씩 따라올 수 있게, 옆에서 같이 갈게요." },
    ],
  },
  {
    type: "highlight",
    label: "안심하고 시작하세요",
    parts: [
      {
        text: "정답을 맞혀야 하는 시험이 아니에요. 모르는 건 질문하고, 막히면 같이 풀어요.",
      },
    ],
  },
  {
    type: "bubble",
    variant: "secondary",
    parts: [
      { text: "우리가 함께 갈 길은 " },
      { text: "여섯 가지 큰 흐름", emphasis: "strong" },
      { text: "으로 나눠져 있어요. 세부 단계는 옆에서 천천히 맞춰 갈게요." },
    ],
  },
  {
    type: "highlight",
    label: "함께 갈 여정",
    parts: [{ text: formatJourneyPhases() }],
  },
  {
    type: "bubble",
    parts: [
      { text: "이 여정은 " },
      { text: "사업 계획보다 고객의 문제", emphasis: "strong" },
      { text: "에서 출발해, " },
      { text: "아이디어와 컨셉을 순서대로", emphasis: "strong" },
      {
        text: " 만들어 가는 과정이에요. 처음엔 문제점을 같이 잡고, 그다음에 펼치고 다듬어요.",
      },
    ],
  },
  {
    type: "bubble",
    variant: "secondary",
    parts: [
      {
        text: "먼저 이름과 짧은 질문으로 코칭을 맞춘 뒤, 문제점과 프로젝트 이름을 정리해요.",
      },
    ],
  },
];

/** 단계 10 · 사용성 테스트 (플레이스홀더 인트로) */
const STAGE_10_INTRO: StageIntroMessage[] = [
  {
    type: "bubble",
    parts: [
      { text: "테스트 결과를 " },
      { text: "해석하는 자리", emphasis: "strong" },
      { text: "예요. 통과·회귀·다음 실험을 함께 판단해요." },
    ],
  },
  {
    type: "bubble",
    variant: "secondary",
    parts: [
      { text: "숫자나 인상만이 아니라, " },
      { text: "사용자가 실제로 한 행동", emphasis: "gold" },
      { text: "에서 무엇이 바뀌었는지 짚어볼게요." },
    ],
  },
];

/** 단계 11 · 사업 타당성 */
const STAGE_11_INTRO: StageIntroMessage[] = [
  {
    type: "bubble",
    parts: [
      { text: "5대 렌즈로 " },
      { text: "사업 타당성", emphasis: "strong" },
      { text: "을 깊게 짚어볼게요. 아직 결론이 아니라 가설 상태로 둡니다." },
    ],
  },
  {
    type: "highlight",
    label: "외부 정보 원칙",
    parts: [
      {
        text: "지원사업·투자 라운드 같은 시점성 정보는 기억에서 만들지 않고, 확인 가능한 출처로만 말해요.",
      },
    ],
  },
];

function buildStageConfigs(): Record<number, StageConfigEntry> {
  const configs: Record<number, StageConfigEntry> = {};

  for (let n = 1; n <= 16; n++) {
    const isConversationalInput = CONVERSATIONAL_STAGES.has(n);
    const entry: StageConfigEntry = {
      stageNumber: n,
      isConversationalInput,
      introStatusLabel: "환영",
      introStatusSub: metaLabel(n),
      workStatusLabel: isConversationalInput ? "듣는 중" : "짚어주는 중",
      workStatusSub: metaTitle(n),
    };

    if (n === 1) {
      entry.hasConversationalCollection = true;
      entry.introMessages = STAGE_1_INTRO;
      entry.introStatusLabel = "환영";
      entry.introStatusSub = "방금 도착한 아이디어";
      entry.workStatusLabel = "듣는 중";
      entry.workStatusSub = "문제점 정리";
    } else if (n === 2) {
      entry.workStatusLabel = "듣는 중";
      entry.workStatusSub = "사전 조사하기";
    } else if (n === 3) {
      entry.workStatusLabel = "듣는 중";
      entry.workStatusSub = "사용자 조사 준비";
    } else if (n === 4) {
      entry.workStatusLabel = "듣는 중";
      entry.workStatusSub = "발견 정리";
    } else if (n === 5) {
      entry.workStatusLabel = "듣는 중";
      entry.workStatusSub = "사용자 여정 지도";
    } else if (n === 6) {
      entry.introStatusLabel = "함께 짚어보는 중";
      entry.introStatusSub = "니즈 분석하기";
      entry.workStatusLabel = "함께 짚어보는 중";
      entry.workStatusSub = "니즈 분석하기";
    } else if (n === 7) {
      entry.workStatusLabel = "짚어주는 중";
      entry.workStatusSub = "HMW 질문 만들기";
    } else if (n === 8) {
      entry.workStatusLabel = "함께 펼치는 중";
      entry.workStatusSub = "아이디어 펼치기";
    } else if (n === 9) {
      entry.workStatusLabel = "듣는 중";
      entry.workStatusSub = "우선순위";
    } else if (n === 10) {
      entry.workStatusLabel = "제안 중";
      entry.workStatusSub = "컨셉 · 스토리보드";
    } else if (n === 11) {
      entry.workStatusLabel = "제안 중";
      entry.workStatusSub = "시제품";
    } else if (n === 12) {
      entry.introMessages = STAGE_10_INTRO;
      entry.introStatusLabel = "짚어주는 중";
      entry.introStatusSub = "검증 결과";
    } else if (n === 13) {
      entry.introMessages = STAGE_11_INTRO;
      entry.introStatusLabel = "제안 중";
      entry.introStatusSub = "5대 렌즈";
    }

    configs[n] = entry;
  }

  return configs;
}

export const STAGE_CONFIG = buildStageConfigs();

export function getStageConfig(stageNumber: number): StageConfigEntry {
  return (
    STAGE_CONFIG[stageNumber] ?? {
      stageNumber,
      isConversationalInput: false,
    }
  );
}

export function getInitialInteractionMode(stageNumber: number): InteractionMode {
  return getStageConfig(stageNumber).isConversationalInput ? "intro" : "work";
}

export function isConversationalStage(stageNumber: number): boolean {
  return getStageConfig(stageNumber).isConversationalInput;
}
