import { archiveStageNavLabel } from "@/lib/artifacts/archiveArtifactLabels";
import { STAGE_META } from "@/lib/stages/constants";
import type { UiLocale } from "@/lib/i18n/uiLocale";

export type StagePurposeCopy = {
  label: string;
  purpose: string;
  workCaption: string;
  placeholderLines: [string, string];
};

const STAGE_PURPOSE_KO: Partial<Record<number, StagePurposeCopy>> = {
  2: {
    label: "사전 조사하기를 하는 이유",
    purpose:
      "현장 조사 전에 입력한 문제를 기준으로 문제 정의·타겟·시장·경쟁·유사 서비스·비즈니스 모델을 점검해, 초기 아이디어의 시장 적합성(Pre-PMF)을 사전 검토하는 단계예요.",
    workCaption: "사전 조사하기 — Pre-PMF Overview",
    placeholderLines: [
      "문제 정의를 하고 있어요.",
      "리포트가 준비되면 결과를 확인하고 「다음으로 이동」을 눌러 주세요.",
    ],
  },
  3: {
    label: "공감맵과 조사 질문을 준비하는 이유",
    purpose:
      "현장 조사 전에 2단계에서 확정한 타겟 유저별 공감맵으로 가설을 외부화한 뒤, 무엇을·누구에게·어떤 방법으로 확인할지 To-know 질문 목록을 만드는 단계예요.",
    workCaption: "사용자 조사 준비하기 — 공감맵 · To-know",
    placeholderLines: [
      "2단계 타겟 유저별 공감맵을 먼저 채워요.",
      "이어서 To-know 질문과 조사 방법을 확인·수정한 뒤 다음 단계로 이어가세요.",
    ],
  },
  4: {
    label: "발견을 정리하는 이유",
    purpose:
      "사용자 조사에서 들은 말과 본 행동을 공감맵에 모아, 다음 니즈·아이디어 단계로 넘길 인사이트를 뽑는 자리예요.",
    workCaption: "발견 정리하기",
    placeholderLines: [
      "리서치 자료를 올리면 공감맵 네 칸에 배치되고,",
      "오른쪽 Kevin에게 다학제적 분석을 요청할 수 있어요.",
    ],
  },
  5: {
    label: "사용자 여정 지도를 그리는 이유",
    purpose:
      "조사 대상(페르소나)마다 사용자 행동 단계를 펼치고, 언급·관찰이 어느 구간에 몰려 있는지 한눈에 보는 단계예요. 들어오면 초안이 이미 배치되어 있으니, 위치만 다듬으면 돼요.",
    workCaption: "사용자 여정 지도 그리기 (User Journey Map)",
    placeholderLines: [
      "페르소나 탭을 선택하면 해당 조사 대상의 여정이 열려요.",
      "초안 배치를 보고, 필요하면 드래그로 위치를 다듬어 보세요.",
    ],
  },
  6: {
    label: "진짜 필요를 찾는 이유",
    purpose:
      "4단계 언급·관찰과 여정에서 본 흐름을 바탕으로, 조사 대상마다 말 아래에 있을 수 있는 잠재 니즈를 정리해요. 분류한 뒤에는 사분면으로 좋은 아이디어로 이어질 핵심 니즈를 최대 5개까지 골라요. 아직 결론이 아니에요.",
    workCaption: "니즈 분석하기",
    placeholderLines: [
      "조사 내용이 한 보드에 모여요.",
      "Kevin이 잠재 니즈 초안을 채워 두면, 이니셜로 누구 자료인지 구분하며 다듬어 보세요.",
    ],
  },
  7: {
    label: "HMW 질문을 만드는 이유",
    purpose:
      "6단계에서 선별한 핵심 잠재 니즈를 조사 대상·니즈 그룹별로 보며 ‘어떻게 하면 …하기 위해 …할 수 있을까?’ 형태의 열린 질문으로 바꿔, 아이디어를 펼치기 전에 탐색할 방향을 잡는 단계예요. Kevin이 Amp up / Remove bad / Explore opposite 세 변주로 사전 HMW 초안을 만들고, 품질 체크 후 가장 알맞은 하나를 채워 두었어요. 자유롭게 다듬어 보세요.",
    workCaption: "HMW 질문 만들기",
    placeholderLines: [
      "왼쪽에 잠재 니즈가 보이면,",
      "각 니즈마다 HMW 질문을 적어 보세요.",
    ],
  },
  8: {
    label: "아이디어를 펼치는 이유",
    purpose:
      "7단계 HMW 질문 전체를 출발점으로, 질문마다 칸을 두고 스케치·SCAMPER로 해결 방향을 quantity-first로 펼치는 단계예요. 아직 하나로 고르지 않아요.",
    workCaption: "아이디어 펼치기",
    placeholderLines: [
      "빈 칸을 눌러 제목·설명·스케치를 적고,",
      "막히면 SCAMPER로 같은 아이디어를 비틀어 보세요.",
    ],
  },
  9: {
    label: "실행 순서를 정하는 이유",
    purpose:
      "나온 아이디어 중 무엇부터 시도할지, 팀이 합의할 수 있게 우선순위를 잡는 단계예요.",
    workCaption: "우선순위 · 로드맵",
    placeholderLines: [
      "Kevin과 기준을 맞춘 뒤,",
      "왼쪽에 순서 초안이 채워질 예정이에요.",
    ],
  },
  10: {
    label: "컨셉 시트를 만드는 이유",
    purpose:
      "선택한 방향을 한 장으로 정리하고, AI 스토리보드 5컷으로 사용 흐름을 시각화해 다음 시제품 단계의 출발점을 만드는 자리예요.",
    workCaption: "컨셉 시트 + AI 스토리보드",
    placeholderLines: [
      "4 필드를 채운 뒤 스토리보드 문장을 적고,",
      "「AI 스토리보드 생성」으로 5컷 일러스트를 만들어 보세요.",
    ],
  },
  11: {
    label: "시제품을 만드는 이유",
    purpose:
      "컨셉·스토리보드를 실제 화면처럼 보이는 UI 목업으로 옮겨, 사용자 테스트 전에 팀이 같은 경험을 상상하게 해요.",
    workCaption: "시제품 만들기",
    placeholderLines: [
      "Mobile/Web을 고른 뒤 AI 시제품을 생성하고,",
      "미리보기에서 스토리보드 흐름이 살아 있는지 확인해 보세요.",
    ],
  },
};

const STAGE_PURPOSE_EN: Partial<Record<number, StagePurposeCopy>> = {
  2: {
    label: "Why desk research",
    purpose:
      "Before field research, review problem definition, target users, market, competition, similar services, and business model to check early market fit (Pre-PMF).",
    workCaption: "Desk research — Pre-PMF Overview",
    placeholderLines: [
      "We're shaping the problem definition.",
      "When the report is ready, review it and continue.",
    ],
  },
  3: {
    label: "Why prepare empathy maps & research questions",
    purpose:
      "Before field research, externalize hypotheses with empathy maps for each Stage 2 target user, then build a To-know question list for what, whom, and how to validate.",
    workCaption: "Prepare user research — Empathy · To-know",
    placeholderLines: [
      "Fill empathy maps for Stage 2 target users first.",
      "Then review To-know questions and methods before moving on.",
    ],
  },
  4: {
    label: "Why synthesize findings",
    purpose:
      "Bring together what you heard and observed in research so you can pull insights for needs and ideation next.",
    workCaption: "Synthesize findings",
    placeholderLines: [
      "Fill empathy maps from what you heard and saw in research,",
      "then note quotes, observations, and investigator insights on the synthesis board.",
    ],
  },
  5: {
    label: "Why map the user journey",
    purpose:
      "Lay out behavior steps for each research subject (persona) and place quotes and observations to see where insights cluster. A draft is placed on entry—you mainly refine positions.",
    workCaption: "User journey map",
    placeholderLines: [
      "Pick a persona tab to open that journey.",
      "Review the draft placement, then drag to fine-tune.",
    ],
  },
  6: {
    label: "Why find latent needs",
    purpose:
      "Review Stage 4 quotes and observations on one board, and note latent needs that may sit under what each subject said. After grouping, use the quadrant to pick up to 5 core needs most likely to lead to good ideas. These are still hypotheses.",
    workCaption: "Latent needs analysis",
    placeholderLines: [
      "Research notes appear on one board.",
      "When Kevin drafts latent needs, refine them by subject initials.",
    ],
  },
  7: {
    label: "Why write How Might We questions",
    purpose:
      "Turn the core latent needs selected in Stage 6 into open ‘How might we … in order to …?’ questions so ideation has a clear exploration direction. Kevin drafts three variations (amp up / remove the bad / explore the opposite), quality-checks them, and fills the best one—refine freely.",
    workCaption: "How Might We questions",
    placeholderLines: [
      "When latent needs appear on the left,",
      "write an HMW for each need.",
    ],
  },
  8: {
    label: "Why expand ideas",
    purpose:
      "Starting from all Stage 7 HMW questions, expand solution directions quantity-first—one cell per question—with sketches and SCAMPER. Don't pick one yet.",
    workCaption: "Ideation",
    placeholderLines: [
      "Tap empty cells for title, description, and sketch,",
      "or twist ideas with SCAMPER when stuck.",
    ],
  },
  9: {
    label: "Why prioritize",
    purpose:
      "Agree as a team which idea to try first among the options.",
    workCaption: "Priority · roadmap",
    placeholderLines: [
      "Align criteria with Kevin,",
      "then a draft order will appear on the left.",
    ],
  },
  10: {
    label: "Why make a concept sheet",
    purpose:
      "Capture the chosen direction on one sheet and visualize the flow with a 5-frame AI storyboard as the starting point for prototyping.",
    workCaption: "Concept sheet + AI storyboard",
    placeholderLines: [
      "Fill the four fields and storyboard captions,",
      "then generate 5-frame illustrations.",
    ],
  },
  11: {
    label: "Why prototype",
    purpose:
      "Turn the concept and storyboard into UI mockups so the team can imagine the same experience before user testing.",
    workCaption: "Build a prototype",
    placeholderLines: [
      "Choose Mobile/Web, generate an AI prototype,",
      "and check that the storyboard flow comes alive in preview.",
    ],
  },
};

function fallbackPurpose(
  stageNumber: number,
  locale: UiLocale,
): StagePurposeCopy {
  const title =
    archiveStageNavLabel(stageNumber, locale) ||
    STAGE_META[stageNumber]?.title ||
    `${locale === "en" ? "Stage" : "단계"} ${stageNumber}`;
  if (locale === "en") {
    return {
      label: `${title} — purpose`,
      purpose: `Align on what to do in ${title} with Kevin first, then draft and refine on the left.`,
      workCaption: title,
      placeholderLines: [
        "Use Kevin’s guidance on the right for purpose and flow.",
        "When the conversation wraps, a draft will appear here.",
      ],
    };
  }
  return {
    label: `${title} — 목적`,
    purpose: `${title} 단계에서 할 일을 Kevin과 먼저 맞춘 뒤, 왼쪽 작업 영역에 초안을 채우고 다듬어 가요.`,
    workCaption: title,
    placeholderLines: [
      "목적과 진행은 오른쪽 Kevin 안내를 참고해 주세요.",
      "대화가 끝나면 작업 초안이 여기 채워져요.",
    ],
  };
}

export function getStagePurposeCopy(
  stageNumber: number,
  locale: UiLocale = "ko",
): StagePurposeCopy {
  const table = locale === "en" ? STAGE_PURPOSE_EN : STAGE_PURPOSE_KO;
  return table[stageNumber] ?? fallbackPurpose(stageNumber, locale);
}
