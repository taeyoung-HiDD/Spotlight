import { STAGE_META } from "@/lib/stages/constants";
import { getStagePurposeCopy } from "@/lib/stages/discovery/stagePurposeCopy";
import type { UiLocale } from "@/lib/i18n/uiLocale";

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
  /** 가이드 예시용 Pain point 메모 */
  painPointText?: string;
};

export type StageGuideHmwPairExample = {
  latentNeedText: string;
  hmwText: string;
  subjectName: string;
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
    }
  | {
      type: "hmw_board";
      caption: string;
      latentNeedText: string;
      hmwText: string;
      subjectName: string;
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
      headline: "문제를 함께 정의해요",
      summary:
        "알고 계신 사용자 문제와 떠오른 아이디어를 모두 적고, 프로젝트 이름을 정해요. 팀원 초대는 내 프로젝트에서 할 수 있어요.",
      activities: [
        {
          title: "문제·아이디어 적기",
          description:
            "사용자가 겪는 문제, 떠오른 서비스·아이디어를 일상 말로 모두 적어 보세요.",
        },
        {
          title: "프로젝트 이름 정하기",
          description:
            "목록과 팀 초대에서 구분할 짧은 프로젝트 이름을 정해요.",
        },
      ],
      example: {
        label: "문제·아이디어 예시",
        content:
          "「점심 배달이 자주 늦어 점심을 거르게 된다」는 문제와 「실시간 예상 시간을 보여 주는 앱」 아이디어를 함께 적어도 좋아요.",
      },
      tip: "Kevin과 대화로 빠진 맥락을 채워도 괜찮아요.",
    },
    2: {
      headline: "시장 적합성을 미리 점검해요",
      summary:
        "입력한 문제를 기준으로 문제 정의·타겟·시장·경쟁·유사 서비스·비즈니스 모델을 한눈에 정리해, 초기 아이디어의 시장 적합성(Pre-PMF)을 사전 검토해요.",
      activities: [
        {
          title: "코치 안내 듣기",
          description: "Kevin이 단계 목적과 사전 조사 흐름을 짧게 안내해요.",
        },
        {
          title: "Pre-PMF 리포트 확인하기",
          description:
            "시장·경쟁·유사 서비스는 웹 자료로 근거를 붙여 자동 정리돼요.",
        },
        {
          title: "다음 활동 제안 읽기",
          description:
            "검토 결과 기준으로 이어갈 단계·활동과 구체 과제를 확인해요.",
        },
      ],
      example: {
        label: "사전 조사 예시",
        content:
          "「20대 직장인 대상 아침 식사 시장은 성장 중이며, 유사 서비스 A·B가 있다」— 시장과 경쟁이 보이면 3단계 사용자 조사로 검증하기 쉬워요.",
      },
    },
    3: {
      headline: "공감맵과 조사 질문을 준비하세요",
      summary:
        "2단계 타겟 유저별 공감맵으로 가설을 외부화한 뒤, To-know 표로 조사 질문과 방법을 정리해요.",
      activities: [
        {
          title: "타겟별 공감맵",
          description:
            "사전 조사에서 확정한 타겟 유저마다 말함·생각함·행동함·느낌을 채워요.",
        },
        {
          title: "To-know 항목 검토",
          description:
            "공감맵을 바탕으로 자동 채워진 질문을 읽고 다듬어요.",
        },
        {
          title: "조사 방법 선택",
          description: "인터뷰·관찰·그림 연상 등 방법을 항목마다 맞춰요.",
        },
      ],
      example: {
        label: "공감맵 말함(가설) 예시",
        content:
          "「재고 확인하려고 하루에도 몇 번 카운터로 와요」— 아직 조사 전이면 (가설)로 적어 두세요.",
      },
    },
    4: {
      headline: "조사 결과를 공감맵에 모아요",
      summary:
        "리서치 자료를 올리면 공감맵 네 칸에 배치되고, 그 아래에서 다학제적 분석을 이어가요.",
      activities: [
        {
          title: "리서치 자료 올리기",
          description:
            "조사 대상마다 영상·음성을 올리고 분석하면 말함·생각·행동·느낌에 맞춰 배치돼요.",
        },
        {
          title: "공감맵 확인·수정",
          description:
            "자동 배치된 포스트잇을 보고, 조사에서 들은·본 내용에 맞게 다듬어요.",
        },
        {
          title: "다학제적 분석",
          description:
            "리서치 자료를 올린 뒤 Kevin에게 「다학제적 분석」을 요청하세요. 전문가가 대화하듯 해설해 줘요.",
        },
      ],
      example: {
        label: "말함 포스트잇 예시",
        content:
          "「배달이 늦으면 일정을 다시 짜야 해서 스트레스받아요」— 직접 들은 말은 말함 칸에 적어요.",
      },
    },
    5: {
      headline: "사용자 여정 지도를 그려요",
      summary:
        "페르소나 탭마다 User Journey Map을 그려요. 각 조사 대상의 행동 단계에 4단계 언급·관찰을 배치해 어느 구간에 인사이트가 몰려 있는지 봐요.",
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
          title: "언급·관찰 배치",
          description:
            "아래 풀의 언급·관찰을 드래그해 해당 행동 단계에 놓아요. 잠재 니즈는 다음 단계에서 다뤄요.",
        },
      ],
      example: {
        label: "여정 배치 예시",
        content:
          "아래는 예시 여정 지도예요. 「사용·경험」 단계에 언급·관찰과 Pain point를 모아 두면, 이 페르소나에서 어느 구간을 먼저 풀지 한눈에 보여요.",
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
            ],
            painPointText:
              "예상 시간과 실제 도착이 달라 일정을 다시 짜야 하는 불편",
          },
          { label: "사후·반복", items: [] },
        ],
        poolItems: [
          {
            kind: "observation",
            text: "앱에서 배달 현황을 여러 번 새로고침함",
          },
        ],
      },
      tip: "인사이트가 몰린 단계는 다음 진짜 필요 찾기·HMW에서 먼저 풀어 볼 후보가 돼요.",
    },
    6: {
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
            "초안을 읽고, 미리보기를 펼쳐 맞는지·빠진 게 있는지 다듬어요.",
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
    7: {
      headline: "잠재 니즈를 HMW 질문으로 바꿔요",
      summary:
        "진짜 필요 찾기에서 도출한 잠재 니즈를 How Might We 질문으로 바꿔, 아이디어를 펼칠 출발점을 만듭니다. Kevin이 사전 HMW 질문 초안을 채워 두었어요.",
      activities: [
        {
          title: "니즈 → HMW 변환",
          description:
            "6단계 잠재 니즈를 보고 ‘어떻게 하면 …하기 위해 …할 수 있을까?’ 형태의 열린 질문으로 바꿔요. Kevin이 채워 둔 사전 초안을 출발점으로 다듬어도 좋아요.",
        },
        {
          title: "질문 다듬기",
          description:
            "목적(왜)·제약과 구체 상태(무엇을)가 함께 드러나게 다듬어, 다음 단계에서 솔루션을 떠올리기 쉽게 해요.",
        },
        {
          title: "가설 상태 유지",
          description:
            "HMW는 아직 답이 아니에요. 검증 전까지 질문·가설로 남겨 두세요.",
        },
      ],
      example: {
        label: "HMW 예시",
        content:
          "잠재 니즈 「도착 전에 예상 시간을 알고 일정을 미리 조정하고 싶다」→ HMW 「어떻게 하면 일정을 미리 조정하기 위해 배달 도착 전에 예상 시간을 알 수 있을까?」",
      },
      visualExample: {
        type: "hmw_board",
        caption: "왼쪽 잠재 니즈를 보고 오른쪽에 HMW 질문을 적어요.",
        latentNeedText:
          "도착 전에 예상 시간을 알고 일정을 미리 조정하고 싶다",
        hmwText:
          "어떻게 하면 일정을 미리 조정하기 위해 배달 도착 전에 예상 시간을 알 수 있을까?",
        subjectName: "민지",
      },
      tip: "HMW를 채운 뒤 8단계 아이디어 펼치기로 넘어가 보세요.",
    },
    8: {
      headline: "HMW에서 아이디어를 quantity-first로 펼쳐요",
      summary:
        "7단계 HMW 질문을 출발점으로 9칸 그리드에 아이디어를 적고, 스케치·SCAMPER로 변형을 더해요.",
      activities: [
        {
          title: "9 그리드 채우기",
          description: "빈 칸을 눌러 한 줄 제목·짧은 설명·스케치를 적어요.",
        },
        {
          title: "SCAMPER 보강",
          description: "막히면 7글자(S·C·A·M·P·E·R)로 같은 아이디어를 비틀어 봐요.",
        },
        {
          title: "가설 라벨 유지",
          description: "아직 검증 전이므로 ‘이렇게 하면 될 것 같다’ 수준으로 남겨 두세요.",
        },
      ],
      example: {
        label: "아이디어 예시",
        content:
          "「예상 도착 시간을 캘린더에 자동 반영하는 알림」— 3번 칸에 제목, 짧은 설명, 스케치를 함께.",
      },
      tip: "9칸을 다 채우지 않아도 9단계 우선순위 정하기로 넘어갈 수 있어요.",
    },
    9: {
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
    10: {
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
          description: "11단계 프로토타입에서 검증할 가설을 메모해 두세요.",
        },
      ],
      example: {
        label: "컨셉 시트 예시",
        content:
          "「바쁜 직장인의 점심 일정을 지켜 주는 스마트 배달 알림」— 한 문장 가치 + 3단계 사용 흐름.",
      },
    },
    11: {
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
          description: "사용자에게 무엇을 물어볼지 12단계로 넘길 목록을 적어요.",
        },
      ],
      example: {
        label: "시제품 예시",
        content: "배달 앱 알림 설정 화면 3장 스토리보드 + ‘예상 시간 변경’ 푸시 목업.",
      },
    },
    12: {
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
    13: {
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
    14: {
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
    15: {
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
          description: "16단계 매칭 전에 발표 리허설을 해요.",
        },
      ],
      example: {
        label: "슬라이드 예시",
        content: "4번 슬라인: 「직장인 68%가 점심 배달 지연으로 일정을 바꾼 경험」— 출처·가설 구분.",
      },
    },
    16: {
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
  locale: UiLocale = "ko",
): StageActivityGuideContent {
  const override = GUIDE_OVERRIDES[stageNumber];
  if (override) {
    return { stageNumber, ...override };
  }

  const purpose = getStagePurposeCopy(stageNumber, locale);
  const title =
    purpose.workCaption ||
    STAGE_META[stageNumber]?.title ||
    (locale === "en" ? `Stage ${stageNumber}` : `단계 ${stageNumber}`);

  if (locale === "en") {
    return {
      stageNumber,
      headline: title,
      summary: purpose.purpose,
      activities: [
        {
          title: "Understand the purpose",
          description: purpose.purpose,
        },
        {
          title: "Fill the work area",
          description: purpose.placeholderLines.join(" "),
        },
        {
          title: "Align with the coach",
          description:
            "Align how you’ll proceed with Kevin on the right, then continue on the left.",
        },
      ],
      example: {
        label: "Example",
        content: `Capture one insight from ${title} on a sticky note — it makes the next stage easier.`,
      },
    };
  }

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
