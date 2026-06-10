import {
  COACH_ASK_PLACEHOLDER,
  COACH_MESSAGE_PLACEHOLDER,
  COACH_TALK_PLACEHOLDER,
} from "@/lib/coach/constants";
import type { Stage1CollectStep } from "@/lib/stages/stage1/collectFlow";

/** 코치가 사용자 입력을 기다릴 때 표시하는 예시 가이드 */
export interface CoachInputGuide {
  /** 짧은 라벨 (예: "문제점 예시") */
  title: string;
  /** 한 줄 안내 */
  hint?: string;
  /** 따라 하기 쉬운 예시 문장 (2~4개 권장) */
  examples: string[];
  /** true면 예시는 참고용 — 클릭 시 입력란에만 채움(즉시 전송 없음) */
  examplesReferenceOnly?: boolean;
  /** true면 예시 칩을 복수 선택(토글) 후 한 번에 전송 */
  examplesMultiSelect?: boolean;
  placeholder?: string;
}

export const COACH_INPUT_GUIDANCE_SYSTEM_RULE = `
## 입력 대기 시 예시 가이드 (필수)
사용자에게 답변·입력을 요청하는 턴에서는 반드시:
1. 질문은 한 가지만 한다.
2. 질문 직후, 따르기 쉬운 **구체적 예시 2~3개**를 짧은 문장으로 제시한다. (예: "예를 들어 — '…' / '…' 처럼요.")
3. 예시는 해당 단계·슬롯에 맞고, 사용자가 그대로 말해도 되는 수준으로 쓴다.
4. 예시만 던지고 질문을 빼지 않는다.
5. 답변 본문은 문장마다 줄바꿈(빈 줄)을 넣어 읽기 쉽게 쓴다. 한 덩어리로 이어 쓰지 않는다.
`.trim();

export const DEFAULT_COACH_INPUT_GUIDE: CoachInputGuide = {
  title: "이렇게 말해보세요",
  hint: "편한 말투로 한두 문장이면 충분해요.",
  examples: [
    "예를 들어 이런 식으로 말씀해 주셔도 돼요.",
    "짧게 한 문장만 들려주셔도 괜찮아요.",
  ],
  placeholder: COACH_MESSAGE_PLACEHOLDER,
};

const STAGE1_COLLECT_GUIDES: Record<Stage1CollectStep, CoachInputGuide> = {
  starting_point: {
    title: "문제점 참고 예시",
    hint: "아래는 다른 팀이 쓴 예시예요. 그대로 보내지 말고, 비슷한 톤으로 직접 입력해 주세요. 사업안·솔루션이 아니라 고객의 문제·상황 한 줄이면 돼요.",
    examples: [
      "지하철에서 한 손으로 뭔가를 해야 할 때 불편했어요",
      "소상공인 가게에서 재고를 매일 손으로 세는 게 막막했어요",
      "아이가 숙제할 때 부모가 계속 옆에 있어야 해요",
    ],
    examplesReferenceOnly: true,
    placeholder: "어떤 문제·상황에서 시작하시나요?",
  },
  project_name: {
    title: "프로젝트 이름 예시",
    hint: "문제점과 같아도 되고, 팀이 기억하기 쉬운 짧은 이름이면 돼요.",
    examples: [
      "지하철 원핸드",
      "소상공인 재고 도우미",
      "숙제 옆자리 부모",
    ],
    placeholder: "프로젝트 이름을 입력하세요",
  },
  team_collaboration: {
    title: "팀으로 함께하기",
    hint: "같이 하시면 초대 링크로 팀원을 부르고, 팀원은 Hopes·Fears부터 참여해요.",
    examples: ["네, 같이 하고 싶어요", "팀으로 초대할게요", "아니요, 혼자 할게요"],
    placeholder: "함께 할지 알려 주세요…",
  },
  hopes: {
    title: "Hopes · 바라는 것 예시",
    hint: "이 과정을 통해 얻고 싶은 것을 말해 주세요.",
    examples: [
      "실제 사용자를 만나 볼 수 있었으면 해요",
      "막연한 아이디어가 검증됐는지 알고 싶어요",
      "팀원과 같은 언어로 문제를 정리하고 싶어요",
    ],
    placeholder: "이번 과정에서 얻고 싶은 것은?",
  },
  fears: {
    title: "Fears · 걱정되는 것 예시",
    hint: "걱정되거나 막히는 부분을 솔직하게.",
    examples: [
      "리서치만 하다 끝날까 봐 걱정돼요",
      "시간이 없어서 대충 넘어갈까 봐 불안해요",
      "코칭이 답을 대신 정해 줄까 봐 걱정돼요",
    ],
    placeholder: "무엇이 걱정되나요?",
  },
  principle: {
    title: "원칙 동의",
    hint: "이해하셨다면 아래처럼 짧게 답해 주세요.",
    examples: ["이해했어요", "네, 알겠어요", "응, 괜찮아요"],
    placeholder: "이해했어요",
  },
  team_invite: {
    title: "초대",
    hint: "링크를 보낸 뒤 아래 버튼으로 Hopes 단계로 넘어가세요.",
    examples: [],
    placeholder: "",
  },
  hopes_gate: {
    title: "다음 단계",
    hint: "아래 버튼을 누르면 Hopes·Fears 대화가 시작돼요.",
    examples: [],
    placeholder: "",
  },
};

const STAGE_WORK_GUIDES: Partial<Record<number, CoachInputGuide>> = {
  1: {
    title: "검토 · 수정 예시",
    hint: "바꾸고 싶은 항목을 말하거나, 예시처럼 입력해 보세요.",
    examples: [
      "문제점을 '카페 주문 대기 줄이 길 때'로 바꿔줘",
      "희망을 '실제 매장 사장님 인터뷰 3명'으로 수정해줘",
      "걱정은 '시간이 부족한데 괜찮을까'로 바꿔줘",
    ],
    placeholder: "수정 요청이나 질문을 입력하세요…",
  },
  2: {
    title: "맥락 이해 · 대화 예시",
    hint: "사전 리서치 4단계 결과를 보고 빠진 관점·궁금한 점을 Kevin에게 물어보세요.",
    examples: [
      "시장·트렌드 쪽 조사를 더 구체적으로 보완해 줘",
      "유사 사례 연구 관점에서 실패 요인도 추가해 줘",
      "대상자 프로필에 프리랜서 세그먼트도 넣어 줘",
    ],
    placeholder: COACH_ASK_PLACEHOLDER,
  },
  3: {
    title: "사용자 조사 준비 · 예시",
    hint: "To-know 질문 다듬기 · 조사 방법(FGD·인터뷰 등)이 궁금하면 Kevin에게 물어보세요.",
    examples: [
      "FGD랑 인뎁스 인터뷰 차이가 뭐예요?",
      "우리 문제에는 섀도잉이 맞을까요?",
      "데스크리서치로 확인할 To-know 질문 예시를 줘",
    ],
    placeholder: COACH_ASK_PLACEHOLDER,
  },
  4: {
    title: "데이터 정리 · 대화 예시",
    hint: "포스트잇·미디어 정리나 Kevin 디브리핑 결과가 궁금하면 물어보세요.",
    examples: [
      "발견한 것에는 어떤 내용을 적으면 좋을까요?",
      "디브리핑 요청 결과에서 우선 확인할 점은?",
      "테마별로 어떻게 묶으면 패턴이 보일까요?",
    ],
    placeholder: COACH_ASK_PLACEHOLDER,
  },
  5: {
    title: "니즈 분석하기 · 대화 예시",
    hint: "언급·관찰 아래 잠재 니즈를 같이 짚을 때.",
    examples: [
      "이 언급 아래에 있을 수 있는 니즈를 더 구체화해줘",
      "관찰 포스트잇이랑 잠재 니즈가 맞는지 봐줘",
      "이 잠재 니즈를 더 구체적인 문장으로 바꿔줘",
    ],
    placeholder: COACH_ASK_PLACEHOLDER,
  },
};

export function getStage1CollectInputGuide(
  step: Stage1CollectStep,
  hasStartingHint?: boolean,
): CoachInputGuide {
  if (step === "starting_point" && hasStartingHint) {
    return {
      ...STAGE1_COLLECT_GUIDES.starting_point,
      hint: "프로젝트 제목이 문제점이면 「맞아요」 또는 예시처럼 다시 말해 주세요.",
      examples: [
        "맞아요",
        "아니요, 지하철에서 한 손으로 쓸 때 불편했어요",
        "조금 달라요. 소상공인 재고 관리가 막막했어요",
      ],
    };
  }
  return STAGE1_COLLECT_GUIDES[step];
}

export function getStageWorkInputGuide(stageId: number): CoachInputGuide {
  return STAGE_WORK_GUIDES[stageId] ?? DEFAULT_COACH_INPUT_GUIDE;
}

/** API 컨텍스트에 붙일 텍스트 */
export function formatInputGuideForContext(guide: CoachInputGuide): string {
  const lines = [
    "[현재 입력 가이드]",
    `- ${guide.title}`,
    guide.hint ? `- 안내: ${guide.hint}` : "",
    `- 예시: ${guide.examples.map((e) => `「${e}」`).join(" / ")}`,
  ].filter(Boolean);
  return lines.join("\n");
}
