import { STAGE_META } from "@/lib/stages/constants";

export type StageNavDescription = {
  title: string;
  summary: string;
};

/** GNB 하단 단계 호버용 간략 설명 */
export const STAGE_NAV_DESCRIPTIONS: Record<number, StageNavDescription> = {
  1: {
    title: "문제 정의하기",
    summary:
      "사업안보다 고객 문제에서 출발해, 코치와 문제를 정의해요.",
  },
  2: {
    title: "사전 조사하기 (Pre-PMF Overview)",
    summary:
      "입력한 문제를 바탕으로 시장·경쟁·유사 서비스를 점검해, 초기 아이디어의 시장 적합성을 사전 검토하고 사용자 조사로 이어가요.",
  },
  3: {
    title: "사용자 조사 준비하기",
    summary:
      "2단계 타겟 유저별 공감맵을 먼저 그린 뒤, To-know와 리서치 계획을 정리해요.",
  },
  4: {
    title: "발견 정리하기",
    summary:
      "리서치 자료를 올리면 공감맵 네 칸에 배치되고, Kevin에게 다학제적 분석을 요청할 수 있어요.",
  },
  5: {
    title: "진짜 필요 찾기 · 니즈 분석하기",
    summary: "말한 것·행동·잠재 세 층으로 숨은 니즈를 함께 찾아요.",
  },
  6: {
    title: "사용자 여정 지도 그리기",
    summary:
      "User Journey Map으로 행동 단계를 나누고, 조사·니즈를 배치해 해결 우선순위를 봐요.",
  },
  7: {
    title: "HMW 질문 만들기",
    summary:
      "발견 정리하기에서 도출한 잠재 니즈를 How Might We 질문으로 바꿔, 아이디어를 펼칠 출발점을 만들어요.",
  },
  8: {
    title: "아이디어 펼치기",
    summary:
      "HMW 질문에서 9칸 그리드·스케치·SCAMPER로 해결 아이디어를 quantity-first로 펼쳐요.",
  },
  9: {
    title: "우선순위 정하기",
    summary: "영향과 실현 가능성으로 지금 손댈 아이디어를 고르세요.",
  },
  10: {
    title: "컨셉 시트",
    summary: "한 줄 컨셉·기능·스토리보드로 솔루션을 한 장에 정리해요.",
  },
  11: {
    title: "시제품 만들기",
    summary: "컨셉을 바탕으로 체험 가능한 화면·프로토타입을 만들어요.",
  },
  12: {
    title: "사용성 테스트",
    summary: "사용자와 함께 검증하며 가설이 맞는지 확인해요.",
  },
  13: {
    title: "사업 타당성",
    summary: "Desirability·Viability·Feasibility 렌즈로 사업 가능성을 봐요.",
  },
  14: {
    title: "90일 실행 계획",
    summary: "단기 마일스톤과 자원·리스크를 실행 로드맵으로 잡아요.",
  },
  15: {
    title: "피치 덱",
    summary: "투자자·지원사업용 스토리와 덱 구조를 다듬어요.",
  },
  16: {
    title: "투자·지원 연결",
    summary: "프로그램 매칭과 신청 준비로 외부 세계와 연결해요.",
  },
};

export function getStageNavDescription(stage: number): StageNavDescription {
  const meta = STAGE_META[stage];
  const custom = STAGE_NAV_DESCRIPTIONS[stage];
  if (custom) return custom;
  return {
    title: meta?.title ?? `단계 ${stage}`,
    summary: meta?.label ?? "이 단계에서 산출물을 채워 나가요.",
  };
}
