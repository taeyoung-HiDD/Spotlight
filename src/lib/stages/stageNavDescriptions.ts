import { STAGE_META } from "@/lib/stages/constants";

export type StageNavDescription = {
  title: string;
  summary: string;
};

/** GNB 하단 단계 호버용 간략 설명 */
export const STAGE_NAV_DESCRIPTIONS: Record<number, StageNavDescription> = {
  1: {
    title: "문제점 다듬기",
    summary:
      "사업안보다 고객 문제에서 출발해, 코치와 문제점·Hopes·Fears를 정리해요.",
  },
  2: {
    title: "맥락 이해하기 (Contextual Research)",
    summary:
      "실제 리서치 전 관련 정보를 사전 파악해, 표로 맥락을 정리하고 To-know·사전 조사로 이어가요.",
  },
  3: {
    title: "사용자 조사 준비하기",
    summary:
      "누구를 어떤 방식으로 조사할지 To-know와 리서치 계획을 먼저 정리해요.",
  },
  4: {
    title: "발견 정리하기",
    summary:
      "공감맵 후 언급·관찰·발견한 것을 정리해요. 발견한 것은 조사 중 떠오른 인사이트를 직접 적어요.",
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
    title: "아이디어 펼치기",
    summary: "브레인스토밍으로 가능한 해결 방향을 넓게 펼쳐요.",
  },
  8: {
    title: "우선순위 정하기",
    summary: "영향과 실현 가능성으로 지금 손댈 아이디어를 고르세요.",
  },
  9: {
    title: "컨셉 시트",
    summary: "한 줄 컨셉·기능·스토리보드로 솔루션을 한 장에 정리해요.",
  },
  10: {
    title: "시제품 만들기",
    summary: "컨셉을 바탕으로 체험 가능한 화면·프로토타입을 만들어요.",
  },
  11: {
    title: "사용성 테스트",
    summary: "사용자와 함께 검증하며 가설이 맞는지 확인해요.",
  },
  12: {
    title: "사업 타당성",
    summary: "Desirability·Viability·Feasibility 렌즈로 사업 가능성을 봐요.",
  },
  13: {
    title: "90일 실행 계획",
    summary: "단기 마일스톤과 자원·리스크를 실행 로드맵으로 잡아요.",
  },
  14: {
    title: "피치 덱",
    summary: "투자자·지원사업용 스토리와 덱 구조를 다듬어요.",
  },
  15: {
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
