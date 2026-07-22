import {
  COACH_ASK_PLACEHOLDER,
  COACH_ASK_PLACEHOLDER_EN,
  COACH_MESSAGE_PLACEHOLDER,
  COACH_MESSAGE_PLACEHOLDER_EN,
} from "@/lib/coach/constants";
import type { Stage1CollectStep } from "@/lib/stages/stage1/collectFlow";
import type { UiLocale } from "@/lib/i18n/uiLocale";

/** 코치가 사용자 입력을 기다릴 때 표시하는 예시 가이드 */
export interface CoachInputGuide {
  title: string;
  hint?: string;
  examples: string[];
  examplesReferenceOnly?: boolean;
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

const DEFAULT_COACH_INPUT_GUIDE_KO: CoachInputGuide = {
  title: "이렇게 말해보세요",
  hint: "편한 말투로 한두 문장이면 충분해요.",
  examples: [
    "예를 들어 이런 식으로 말씀해 주셔도 돼요.",
    "짧게 한 문장만 들려주셔도 괜찮아요.",
  ],
  placeholder: COACH_MESSAGE_PLACEHOLDER,
};

const DEFAULT_COACH_INPUT_GUIDE_EN: CoachInputGuide = {
  title: "Try saying it like this",
  hint: "A casual sentence or two is enough.",
  examples: [
    "You can phrase it however feels natural.",
    "Even one short sentence is fine.",
  ],
  placeholder: COACH_MESSAGE_PLACEHOLDER_EN,
};

export const DEFAULT_COACH_INPUT_GUIDE = DEFAULT_COACH_INPUT_GUIDE_KO;

const STAGE1_COLLECT_GUIDES_KO: Record<Stage1CollectStep, CoachInputGuide> = {
  starting_point: {
    title: "문제·아이디어 참고 예시",
    hint: "누구·상황·니즈·왜 중요한지를 알려 주세요. 솔루션 이름만 있어도 괜찮아요.",
    examples: [
      "점심시간에 카페 대기 줄이 길어 식사 시간을 확보하지 못하는 직장인이 있어요",
      "배달 지연을 미리 알 수 없어 점심을 거르는 경우가 많아요",
      "실시간 예상 시간을 보여 주는 서비스 아이디어가 있어요 — 대기 불안을 줄이고 싶어요",
    ],
    examplesReferenceOnly: true,
    placeholder: "사용자 문제, 떠오른 아이디어를 모두 적어 주세요…",
  },
  project_name: {
    title: "프로젝트 이름 예시",
    hint: "문제·아이디어와 같아도 되고, 팀이 기억하기 쉬운 짧은 이름이면 돼요.",
    examples: ["지하철 원핸드", "소상공인 재고 도우미", "숙제 옆자리 부모"],
    placeholder: "프로젝트 이름을 입력하세요",
  },
  team_collaboration: {
    title: "팀으로 함께하기",
    hint: "같이 하시면 초대 링크로 팀원을 부를 수 있어요.",
    examples: ["네, 같이 하고 싶어요", "팀으로 초대할게요", "아니요, 혼자 할게요"],
    placeholder: "함께 할지 알려 주세요…",
  },
  team_invite: {
    title: "초대",
    hint: "링크를 보낸 뒤 아래 버튼으로 검토 단계로 넘어가세요.",
    examples: [],
    placeholder: "",
  },
};

const STAGE1_COLLECT_GUIDES_EN: Record<Stage1CollectStep, CoachInputGuide> = {
  starting_point: {
    title: "Problem / idea examples",
    hint: "Who, situation, need, and why it matters. A solution name alone is fine too.",
    examples: [
      "Office workers lose lunch time because cafe queues are so long at noon",
      "I often skip lunch when delivery runs late and I can’t see ETA",
      "I have an idea for live wait-time — I want to reduce anxiety while waiting",
    ],
    examplesReferenceOnly: true,
    placeholder: "Write the user problem and any ideas you have…",
  },
  project_name: {
    title: "Project name examples",
    hint: "It can match the problem, or just be a short name the team will remember.",
    examples: ["Subway One-Hand", "Shop Inventory Helper", "Homework Sidekick"],
    placeholder: "Enter a project name",
  },
  team_collaboration: {
    title: "Work as a team",
    hint: "If you collaborate, you can invite teammates with a link.",
    examples: ["Yes, I'd like to collaborate", "I'll invite my team", "No, I'll go solo"],
    placeholder: "Tell me if you'll work together…",
  },
  team_invite: {
    title: "Invite",
    hint: "Send the link, then continue to review with the button below.",
    examples: [],
    placeholder: "",
  },
};

const STAGE_WORK_GUIDES_KO: Partial<Record<number, CoachInputGuide>> = {
  1: {
    title: "검토 · 수정 예시",
    hint: "바꾸고 싶은 항목을 말하거나, 예시처럼 입력해 보세요.",
    examples: [
      "문제점을 '카페 주문 대기 줄이 길 때'로 바꿔줘",
      "프로젝트 이름을 '점심 배달 대기'로 수정해줘",
    ],
    placeholder: "수정 요청이나 질문을 입력하세요…",
  },
  2: {
    title: "추가 조사 요청",
    hint: "궁금한 항목을 말씀하시면 웹 조사 후 결과를 코치 대화에 정리해 드려요.",
    examples: [
      "한국 시장 규모와 성장률을 더 구체적으로 조사해 줘",
      "경쟁 서비스 실패 사례도 찾아서 알려 줘",
      "프리랜서 세그먼트 관점에서 타겟을 더 조사해 줘",
    ],
    placeholder: COACH_ASK_PLACEHOLDER,
  },
  3: {
    title: "사용자 조사 준비 · 예시",
    hint: "공감맵(가설) 채우기 · To-know·조사 방법이 궁금하면 Kevin에게 물어보세요.",
    examples: [
      "첫 번째 타겟 말함 칸에 넣을 가설 예시를 줘",
      "FGD랑 인뎁스 인터뷰 차이가 뭐예요?",
      "우리 문제에는 섀도잉이 맞을까요?",
    ],
    placeholder: COACH_ASK_PLACEHOLDER,
  },
  4: {
    title: "조사 결과 분석",
    hint: "리서치 자료를 올린 뒤, Kevin에게 다학제적 분석을 요청하세요. 전문가 이름은 「○○님」으로 이어서 물을 수 있어요.",
    examples: [
      "다학제적 분석 부탁해요",
      "전문가 해설 들려줘",
      "심리학자님, 이 불안감은 어디서 올까요?",
    ],
    placeholder: COACH_ASK_PLACEHOLDER,
  },
  5: {
    title: "사용자 여정 지도 · 대화 예시",
    hint: "여정 단계 배치나 인사이트가 몰린 구간이 궁금할 때.",
    examples: [
      "이 페르소나 여정에서 빠진 단계가 있을까?",
      "배치한 관찰이 이 단계와 맞는지 봐줘",
      "언급이 몰린 단계를 어떻게 읽으면 좋을까?",
    ],
    placeholder: COACH_ASK_PLACEHOLDER,
  },
  6: {
    title: "니즈 분석하기 · 대화 예시",
    hint: "언급·관찰 아래 잠재 니즈를 같이 짚을 때.",
    examples: [
      "이 언급 아래에 있을 수 있는 니즈를 더 구체화해줘",
      "관찰 포스트잇이랑 잠재 니즈가 맞는지 봐줘",
      "이 잠재 니즈를 더 구체적인 문장으로 바꿔줘",
    ],
    placeholder: COACH_ASK_PLACEHOLDER,
  },
  7: {
    title: "HMW 질문 · 대화 예시",
    hint: "잠재 니즈를 열린 질문으로 바꿀 때.",
    examples: [
      "이 잠재 니즈를 HMW 질문으로 바꿔줘",
      "질문이 너무 좁은 것 같아 — 더 넓게 다시 써줘",
      "솔루션을 넣지 않고 질문만 다듬어 줘",
    ],
    placeholder: COACH_ASK_PLACEHOLDER,
  },
  8: {
    title: "아이디어 펼치기 · 대화 예시",
    hint: "HMW에서 아이디어를 quantity-first로 뽑을 때.",
    examples: [
      "이 HMW에서 기능 아이디어 3개만 짧게 제안해줘",
      "같은 아이디어를 SCAMPER A로 비틀어줘",
      "9칸 중 빈 칸에 넣을 한 줄 제목 예시를 줘",
    ],
    placeholder: COACH_ASK_PLACEHOLDER,
  },
  10: {
    title: "컨셉 시트 · 대화 예시",
    hint: "한 줄·기능·스토리보드를 다듬을 때.",
    examples: [
      "한 줄 설명을 더 짧게 다시 써 줘",
      "스토리보드 3번 컷 문장을 더 구체적으로",
      "진짜 동기를 한 문장으로 정리해 줘",
    ],
    placeholder: COACH_ASK_PLACEHOLDER,
  },
  11: {
    title: "시제품 · 대화 예시",
    hint: "플랫폼·화면 흐름이 궁금할 때.",
    examples: [
      "모바일로 다시 생성해 줘",
      "스토리보드 흐름이 미리보기에 잘 보이는지 봐줘",
      "첫 화면 카피를 더 짧게",
    ],
    placeholder: COACH_ASK_PLACEHOLDER,
  },
};

const STAGE_WORK_GUIDES_EN: Partial<Record<number, CoachInputGuide>> = {
  1: {
    title: "Review · edit examples",
    hint: "Say what to change, or type like the examples.",
    examples: [
      "Change the problem to 'long cafe queues at order time'",
      "Rename the project to 'Lunch delivery wait'",
    ],
    placeholder: "Type an edit request or question…",
  },
  2: {
    title: "Ask for more research",
    hint: "Tell me what you're curious about—I'll research and summarize in chat.",
    examples: [
      "Dig into Korean market size and growth rate",
      "Find failure cases of competing services",
      "Research the freelance segment as a target",
    ],
    placeholder: COACH_ASK_PLACEHOLDER_EN,
  },
  3: {
    title: "Research prep · examples",
    hint: "Ask about empathy-map hypotheses, To-know questions, or methods.",
    examples: [
      "Give sample quotes for the first target's Says quadrant",
      "What's the difference between FGD and in-depth interview?",
      "Is shadowing a fit for our problem?",
    ],
    placeholder: COACH_ASK_PLACEHOLDER_EN,
  },
  4: {
    title: "Research findings analysis",
    hint: "Ask Kevin for multi-disciplinary analysis. Address an expert by name for follow-ups.",
    examples: [
      "Please run a multi-disciplinary analysis",
      "Anthropologist, is there a cultural angle here?",
      "Put that Says example on the left empathy map",
    ],
    placeholder: COACH_ASK_PLACEHOLDER_EN,
  },
  5: {
    title: "Journey map · chat examples",
    hint: "When arranging steps or spotting where insights cluster.",
    examples: [
      "Is a step missing in this persona's journey?",
      "Does this observation fit this step?",
      "How should I read a step crowded with quotes?",
    ],
    placeholder: COACH_ASK_PLACEHOLDER_EN,
  },
  6: {
    title: "Needs analysis · chat examples",
    hint: "When refining latent needs under quotes and observations.",
    examples: [
      "Make the latent need under this quote more specific",
      "Check if this observation matches the latent need",
      "Rewrite this latent need as a clearer sentence",
    ],
    placeholder: COACH_ASK_PLACEHOLDER_EN,
  },
  7: {
    title: "HMW · chat examples",
    hint: "When turning latent needs into open questions.",
    examples: [
      "Turn this latent need into an HMW question",
      "This question feels too narrow — widen it",
      "Refine the question without embedding a solution",
    ],
    placeholder: COACH_ASK_PLACEHOLDER_EN,
  },
  8: {
    title: "Ideation · chat examples",
    hint: "When expanding ideas from HMW, quantity-first.",
    examples: [
      "Suggest three short feature ideas from this HMW",
      "Twist the same idea with SCAMPER A",
      "Give one-line titles for empty grid cells",
    ],
    placeholder: COACH_ASK_PLACEHOLDER_EN,
  },
  10: {
    title: "Concept sheet · chat examples",
    hint: "When refining the one-liner, features, or storyboard.",
    examples: [
      "Rewrite the one-liner shorter",
      "Make storyboard cut 3 more concrete",
      "Compress the true need into one sentence",
    ],
    placeholder: COACH_ASK_PLACEHOLDER_EN,
  },
  11: {
    title: "Prototype · chat examples",
    hint: "When checking platform or screen flow.",
    examples: [
      "Regenerate for mobile",
      "Does the storyboard flow show up clearly in preview?",
      "Shorten the first-screen copy",
    ],
    placeholder: COACH_ASK_PLACEHOLDER_EN,
  },
};

export function getStage1CollectInputGuide(
  step: Stage1CollectStep,
  hasStartingHint?: boolean,
  locale: UiLocale = "ko",
): CoachInputGuide {
  const table =
    locale === "en" ? STAGE1_COLLECT_GUIDES_EN : STAGE1_COLLECT_GUIDES_KO;
  if (step === "starting_point" && hasStartingHint) {
    if (locale === "en") {
      return {
        ...table.starting_point,
        hint: "If the project title is the problem, say “Yes” or restate it like the examples.",
        examples: [
          "Yes, that's right",
          "No — it was hard to use one-handed on the subway",
          "A bit different. Inventory for small shops feels overwhelming",
        ],
      };
    }
    return {
      ...table.starting_point,
      hint: "프로젝트 제목이 문제점이면 「맞아요」 또는 예시처럼 다시 말해 주세요.",
      examples: [
        "맞아요",
        "아니요, 지하철에서 한 손으로 쓸 때 불편했어요",
        "조금 달라요. 소상공인 재고 관리가 막막했어요",
      ],
    };
  }
  return table[step];
}

export function getStageWorkInputGuide(
  stageId: number,
  locale: UiLocale = "ko",
): CoachInputGuide {
  const table = locale === "en" ? STAGE_WORK_GUIDES_EN : STAGE_WORK_GUIDES_KO;
  const fallback =
    locale === "en" ? DEFAULT_COACH_INPUT_GUIDE_EN : DEFAULT_COACH_INPUT_GUIDE_KO;
  return table[stageId] ?? fallback;
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
