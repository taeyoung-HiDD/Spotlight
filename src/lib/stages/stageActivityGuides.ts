import { STAGE_META } from "@/lib/stages/constants";
import { getStagePurposeCopy } from "@/lib/stages/discovery/stagePurposeCopy";

export type StageGuideActivity = {
  title: string;
  description: string;
};

export type StageGuideExample = {
  label: string;
  content: string;
};

export type StageGuideLatentNeedsPairExample = {
  sourceKind: "quote" | "observation";
  sourceText: string;
  latentText: string;
  subjectName: string;
  kevinGenerated?: boolean;
  /** true: 잠재 니즈 포스트잇 펼침 / false: 미리보기 바 */
  expanded: boolean;
};

export type StageGuideUserJourneyItemExample = {
  kind: "quote" | "observation" | "latent_need";
  text: string;
};

export type StageGuideUserJourneyStepExample = {
  label: string;
  items: StageGuideUserJourneyItemExample[];
};

export type StageGuideVisualExample =
  | {
      type: "latent_needs_board";
      pairs: StageGuideLatentNeedsPairExample[];
      caption: string;
    }
  | {
      type: "user_journey_map";
      caption: string;
      activeSubjectName: string;
      activeSubjectContext: string;
      otherSubjectName?: string;
      expectations: string;
      steps: StageGuideUserJourneyStepExample[];
      poolItems: StageGuideUserJourneyItemExample[];
    };

export type StageActivityGuideContent = {
  stageNumber: number;
  headline: string;
  summary: string;
  activities: StageGuideActivity[];
  example: StageGuideExample;
  visualExample?: StageGuideVisualExample;
  tip?: string;
};

const GUIDE_OVERRIDES: Partial<Record<number, Omit<StageActivityGuideContent, "stageNumber">>> =
  {
    1: {
      headline: "문제점을 함께 다듬어요",
      summary:
        "아이디어를 한 문장으로 정리하고, 팀이 걱정하는 점과 기대하는 점을 나눠 봐요. 정답이 아니라 출발점을 만드는 단계예요.",
      activities: [
        {
          title: "문제 한 줄 적기",
          description:
            "누가, 어떤 상황에서, 무엇이 불편한지 일상 말로 적어 보세요.",
        },
        {
          title: "Hopes & Fears 나누기",
          description:
            "이 프로젝트에서 기대하는 것과 걱정되는 것을 각각 적어 팀의 마음을 맞춰요.",
        },
        {
          title: "팀 초대 (선택)",
          description: "함께할 멤버가 있으면 초대 링크로 프로젝트에 참여시켜요.",
        },
      ],
      example: {
        label: "문제점 예시",
        content:
          "「점심시간에 배달 음식이 자주 늦어서, 회의에 늦거나 식사를 거르게 된다」처럼 구체적인 상황이 좋아요.",
      },
      tip: "Kevin과 대화로 빠진 맥락을 채워도 괜찮아요.",
    },
    2: {
      headline: "맥락을 미리 살펴봐요",
      summary:
        "현장에 나가기 전, 시장·유사 사례·대상자·관련 이해관계자 네 가지 관점에서 사전 조사를 해요.",
      activities: [
        {
          title: "코치 안내 듣기",
          description: "Kevin이 단계 목적과 사전 조사 흐름을 짧게 안내해요.",
        },
        {
          title: "4영역 캔버스 채우기",
          description:
            "사람·환경·산업 풍경 영역에 조사 결과를 포스트잇처럼 쌓아요.",
        },
        {
          title: "보완 질문하기",
          description: "비어 있는 칸이나 애매한 가설은 코치 대화로 짚어요.",
        },
      ],
      example: {
        label: "사전 조사 예시",
        content:
          "「20대 직장인 3명이 출근 전에 10분 안에 아침을 해결하려 한다」— 대상과 상황이 보이면 3단계 To-know로 넘기기 쉬워요.",
      },
    },
    3: {
      headline: "조사 질문 목록을 만드세요",
      summary:
        "현장에서 무엇을 확인할지 CREMA To-know 표로 정리하고, 조사 방법을 골라요.",
      activities: [
        {
          title: "To-know 항목 검토",
          description:
            "1·2단계에서 나온 문제와 맥락을 바탕으로 자동 채워진 질문을 읽어요.",
        },
        {
          title: "조사 방법 선택",
          description: "인터뷰·관찰·그림 연상 등 방법을 항목마다 맞춰요.",
        },
        {
          title: "보내기·다음 단계",
          description: "현장에 가져갈 목록을 확인한 뒤 실제 조사를 준비해요.",
        },
      ],
      example: {
        label: "To-know 질문 예시",
        content:
          "「고객이 배달 앱을 열 때 가장 먼저 보는 정보는 무엇인가?」— 확인 가능한 질문 형태가 좋아요.",
      },
    },
    4: {
      headline: "들은 말과 본 것을 정리해요",
      summary:
        "조사 대상별로 언급·관찰·발견한 것을 색으로 나눠 적고, 다음 니즈 단계로 넘길 재료를 모아요.",
      activities: [
        {
          title: "공감맵 채우기",
          description: "말한 것·생각·느낌·들은 것 네 칸에 조사 인상을 옮겨요.",
        },
        {
          title: "데이터 정리 보드",
          description:
            "조사 대상 탭에서 언급(노랑)·관찰(연황)·발견(파랑) 포스트잇을 쌓아요.",
        },
        {
          title: "자료·음성 연결",
          description: "인터뷰 녹음이나 사진이 있으면 해당 대상에 붙여 두세요.",
        },
      ],
      example: {
        label: "언급 포스트잇 예시",
        content:
          "「배달이 늦으면 일정을 다시 짜야 해서 스트레스받아요」— 직접 들은 말은 가설이 아니라 ‘언급한 것’에 적어요.",
      },
    },
    5: {
      headline: "잠재 니즈를 찾아봐요",
      summary:
        "4단계 언급·관찰 아래에 숨은 필요를 보라 포스트잇으로 적어요. 아직 결론이 아니라 가설이에요.",
      activities: [
        {
          title: "조사 대상 고르기",
          description: "전체 또는 개별 버튼으로 보고 싶은 대상만 필터해요.",
        },
        {
          title: "잠재 니즈 확인·수정",
          description:
            "Kevin 초안을 읽고, 미리보기를 펼쳐 맞는지·빠진 게 있는지 다듬어요.",
        },
        {
          title: "직접 추가",
          description: "언급·관찰 카드 아래 「잠재 니즈 추가」로 포스트잇을 더할 수 있어요.",
        },
      ],
      example: {
        label: "잠재 니즈 작성 흐름",
        content:
          "4단계에서 가져온 조사 포스트잇(노랑·연황)을 기준으로, 그 아래 보라 포스트잇에 말 속 숨은 필요를 적어요.",
      },
      visualExample: {
        type: "latent_needs_board",
        caption:
          "왼쪽은 언급과 잠재 니즈를 펼친 모습, 오른쪽은 접힌 상태에서 미리보기로 보이는 모습이에요.",
        pairs: [
          {
            sourceKind: "quote",
            sourceText:
              "배달이 늦으면 일정을 다시 짜야 해서 스트레스받아요",
            latentText:
              "도착 전에 예상 시간을 알고 일정을 미리 조정하고 싶다",
            subjectName: "지민",
            kevinGenerated: true,
            expanded: true,
          },
          {
            sourceKind: "observation",
            sourceText: "앱에서 배달 현황을 여러 번 새로고침함",
            latentText: "배달 위치·도착 시각을 한눈에 확인하고 싶다",
            subjectName: "수현",
            kevinGenerated: true,
            expanded: false,
          },
        ],
      },
      tip: "보라 포스트잇은 검증이 필요한 가설이에요.",
    },
    6: {
      headline: "사용자 여정 지도를 그려요",
      summary:
        "페르소나 탭마다 User Journey Map을 그려요. 각 조사 대상의 행동 단계에 4·5단계 조사·니즈를 배치해 어느 구간에 니즈가 몰려 있는지 봐요.",
      activities: [
        {
          title: "페르소나 전환",
          description:
            "상단 탭으로 조사 대상을 바꿔 가며 페르소나별 여정을 그려요.",
        },
        {
          title: "여정 단계 확인",
          description:
            "문제 인지→탐색→선택→사용→사후 등 기본 단계를 팀 상황에 맞게 이름을 바꿔도 돼요.",
        },
        {
          title: "조사·니즈 배치",
          description:
            "아래 풀의 언급·관찰·잠재 니즈를 드래그해 해당 행동 단계에 놓아요.",
        },
      ],
      example: {
        label: "여정 배치 예시",
        content:
          "아래는 예시 여정 지도예요. 「사용·경험」 단계에 언급·잠재 니즈를 모아 두면, 이 페르소나에서 어느 구간을 먼저 풀지 한눈에 보여요.",
      },
      visualExample: {
        type: "user_journey_map",
        caption:
          "페르소나 탭으로 대상을 바꾸고, 아래 풀의 카드를 여정 단계로 끌어다 놓으면 됩니다. 단계 이름은 팀 상황에 맞게 바꿔도 돼요.",
        activeSubjectName: "지민",
        activeSubjectContext: "20대 직장인 · 점심시간 배달을 자주 이용",
        otherSubjectName: "수현",
        expectations:
          "점심시간에 일정이 밀리지 않고, 식사와 회의를 둘 다 지키고 싶다",
        steps: [
          { label: "문제 인지", items: [] },
          {
            label: "정보 탐색",
            items: [
              {
                kind: "observation",
                text: "배달 앱에서 예상 시간과 실제 도착이 자주 달라 보임",
              },
            ],
          },
          { label: "선택·결정", items: [] },
          {
            label: "사용·경험",
            items: [
              {
                kind: "quote",
                text: "배달이 늦으면 일정을 다시 짜야 해서 스트레스받아요",
              },
              {
                kind: "latent_need",
                text: "도착 전에 예상 시간을 알고 일정을 미리 조정하고 싶다",
              },
            ],
          },
          { label: "사후·반복", items: [] },
        ],
        poolItems: [
          {
            kind: "latent_need",
            text: "배달 위치·도착 시각을 한눈에 확인하고 싶다",
          },
        ],
      },
      tip: "니즈가 몰린 단계는 아이디어 만들기(7단계)에서 먼저 풀어 볼 후보가 돼요.",
    },
    7: {
      headline: "해결 방향을 많이 펼쳐요",
      summary:
        "여정 지도에서 니즈가 몰린 단계를 바탕으로 아이디어를 quantity-first로 뽑아요.",
      activities: [
        {
          title: "브레인스토밍",
          description: "여정·니즈 인사이트를 보고 해결 아이디어를 자유롭게 적어요.",
        },
        {
          title: "SCAMPER·그리드",
          description: "유도 질문이나 9칸 그리드로 변형·조합을 시도해요.",
        },
        {
          title: "가설 라벨 유지",
          description: "아직 검증 전이므로 ‘이렇게 하면 될 것 같다’ 수준으로 남겨 두세요.",
        },
      ],
      example: {
        label: "아이디어 예시",
        content:
          "「예상 도착 시간을 캘린더에 자동 반영하는 알림」— 기능·서비스·경험 중 무엇이든 괜찮아요.",
      },
    },
    8: {
      headline: "무엇부터 할지 순서를 정해요",
      summary:
        "나온 아이디어를 영향도·실행 난이도 등 기준으로 비교하고 팀이 합의할 우선순위를 잡아요.",
      activities: [
        {
          title: "기준 맞추기",
          description: "Kevin과 어떤 축으로 비교할지(가치·비용·속도 등) 먼저 정해요.",
        },
        {
          title: "매트릭스 배치",
          description: "아이디어를 2×2 또는 우선순위 표에 올려요.",
        },
        {
          title: "다음 단계 후보 고르기",
          description: "컨셉 시트로 가져갈 1~2개 방향을 골라요.",
        },
      ],
      example: {
        label: "우선순위 예시",
        content:
          "「알림 기능」은 구현은 쉽지만 체감 가치가 큼 → 먼저 시제품에 넣기로 팀 합의.",
      },
    },
    9: {
      headline: "한 장 컨셉으로 묶어요",
      summary:
        "선택한 방향을 팀이 같은 그림으로 볼 수 있게 컨셉 시트에 정리해요.",
      activities: [
        {
          title: "핵심 가치·대상 적기",
          description: "누구의 어떤 문제를 어떻게 풀지 한눈에 보이게 써요.",
        },
        {
          title: "차별점·흐름 스케치",
          description: "경쟁 대비 포인트와 사용 흐름을 짧게 그려요.",
        },
        {
          title: "다음 시제품 연결",
          description: "9단계 프로토타입에서 검증할 가설을 메모해 두세요.",
        },
      ],
      example: {
        label: "컨셉 시트 예시",
        content:
          "「바쁜 직장인의 점심 일정을 지켜 주는 스마트 배달 알림」— 한 문장 가치 + 3단계 사용 흐름.",
      },
    },
    10: {
      headline: "만져 볼 수 있게 만들어요",
      summary: "종이·피그마·코드 등 가벼운 시제품으로 아이디어를 검증할 준비를 해요.",
      activities: [
        {
          title: "스토리보드·플로우",
          description: "핵심 시나리오를 화면 순서로 그려요.",
        },
        {
          title: "프로토타입 제작",
          description: "AI·템플릿을 써서 빠르게 클릭·터치 가능한 형태를 만드세요.",
        },
        {
          title: "검증 질문 적기",
          description: "사용자에게 무엇을 물어볼지 10단계로 넘길 목록을 적어요.",
        },
      ],
      example: {
        label: "시제품 예시",
        content: "배달 앱 알림 설정 화면 3장 스토리보드 + ‘예상 시간 변경’ 푸시 목업.",
      },
    },
    11: {
      headline: "사용자에게 검증받아요",
      summary: "시제품을 실제 사용자에게 보여 주고, 가설이 맞는지 회귀·수정 포인트를 찾아요.",
      activities: [
        {
          title: "테스트 시나리오",
          description: "과제·질문·관찰 포인트를 짧게 정리해요.",
        },
        {
          title: "세션 기록",
          description: "말한 것·막힌 지점을 발견 정리처럼 남겨요.",
        },
        {
          title: "회귀 결정",
          description: "틀린 가설은 이전 단계로 돌아가 다시 다듬어요.",
        },
      ],
      example: {
        label: "검증 예시",
        content: "「알림이 5분 전에 와서 일정 조정에 도움이 됐다」— 발견으로 기록.",
      },
    },
    12: {
      headline: "사업으로 성립하는지 봐요",
      summary: "시장·수익·비용·경쟁·실행 다섯 렌즈로 사업 가능성을 점검해요.",
      activities: [
        {
          title: "5대 렌즈 채우기",
          description: "각 렌즈별 가설과 근거를 짧게 적어요.",
        },
        {
          title: "리스크 표시",
          description: "불확실한 항목은 가설·검증 필요로 남겨 두세요.",
        },
        {
          title: "90일 계획 연결",
          description: "다음 단계 로드맵에 넣을 실험·지표를 골라요.",
        },
      ],
      example: {
        label: "타당성 예시",
        content: "수익 렌즈: 「월 구독 4,900원, 직장인 1만 명이면 손익분기 ~8개월」— 숫자는 가설.",
      },
    },
    13: {
      headline: "90일 실행 계획을 세워요",
      summary: "검증·개발·고객 만남을 3개월 단위로 쪼개 실행 순서를 박아요.",
      activities: [
        {
          title: "마일스톤 나누기",
          description: "0→30→60→90일에 할 일을 적어요.",
        },
        {
          title: "담당·지표",
          description: "누가 무엇을 하고, 성공을 어떻게 측정할지 연결해요.",
        },
        {
          title: "피치 덱 준비",
          description: "투자·지원 설명에 쓸 스토리 재료를 모아요.",
        },
      ],
      example: {
        label: "로드맵 예시",
        content: "1개월: 인터뷰 10명 · 2개월: 알림 MVP · 3개월: 파일럿 50명.",
      },
    },
    14: {
      headline: "투자자용 덱을 만듭니다",
      summary: "12장 슬라이드 흐름으로 문제·해결·시장·팀 스토리를 정리해요.",
      activities: [
        {
          title: "슬라이드 뼈대",
          description: "템플릿에 맞춰 한 슬라이드 한 메시지로 채워요.",
        },
        {
          title: "코치·AI 보조",
          description: "스토리보드·수치는 가설 표시를 유지한 채 다듬어요.",
        },
        {
          title: "발표 모드 연습",
          description: "14단계 매칭 전에 발표 리허설을 해요.",
        },
      ],
      example: {
        label: "슬라이드 예시",
        content: "4번 슬라인: 「직장인 68%가 점심 배달 지연으로 일정을 바꾼 경험」— 출처·가설 구분.",
      },
    },
    15: {
      headline: "투자·지원과 연결해요",
      summary: "프로그램·투자자 매칭에 지원하고, 피치·자료실을 제출 형태로 정리해요.",
      activities: [
        {
          title: "지원서 초안",
          description: "프로젝트 요약·팀·트랙션을 폼에 맞춰 적어요.",
        },
        {
          title: "자료실 연결",
          description: "이전 단계 산출물 링크를 모아 제출 패키지를 만들어요.",
        },
        {
          title: "매칭 일정",
          description: "피드백·미팅 일정을 캘린더에 반영해요.",
        },
      ],
      example: {
        label: "지원 예시",
        content: "「조기창업패키지」— 문제 정의 1페이지 + 시제품 링크 + 90일 로드맵 PDF.",
      },
    },
  };

export function getStageActivityGuide(
  stageNumber: number,
): StageActivityGuideContent {
  const override = GUIDE_OVERRIDES[stageNumber];
  if (override) {
    return { stageNumber, ...override };
  }

  const meta = STAGE_META[stageNumber];
  const purpose = getStagePurposeCopy(stageNumber);
  const title = meta?.title ?? `단계 ${stageNumber}`;

  return {
    stageNumber,
    headline: title,
    summary: purpose.purpose,
    activities: [
      {
        title: "목적 이해하기",
        description: purpose.purpose,
      },
      {
        title: "작업 영역 채우기",
        description: purpose.placeholderLines.join(" "),
      },
      {
        title: "코치와 맞추기",
        description:
          "오른쪽 Kevin과 진행 방식을 맞춘 뒤, 왼쪽 작업을 이어가세요.",
      },
    ],
    example: {
      label: "진행 예시",
      content: `${title}에서 나온 한 가지 인사이트를 포스트잇이나 메모로 남겨 두면 다음 단계가 수월해요.`,
    },
  };
}
