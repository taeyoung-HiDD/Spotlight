export const STAGE_COUNT = 15;

export type StageMeta = {
  label: string;
  title: string;
  macro: string;
  /** 10–15: 서비스 확장 */
  isServiceExtension?: boolean;
};

export const STAGE_META: Record<number, StageMeta> = {
  1: { label: "온보딩", title: "문제점 다듬기", macro: "공감하기" },
  2: {
    label: "맥락 이해하기",
    title: "맥락 이해하기 (Contextual Research)",
    macro: "공감하기",
  },
  3: {
    label: "사용자 조사 준비하기",
    title: "사용자 조사 준비하기",
    macro: "공감하기",
  },
  4: { label: "분석·공감맵", title: "발견 정리하기", macro: "발견 정리하기" },
  5: {
    label: "Needs",
    title: "진짜 필요 찾기 · 니즈 분석하기",
    macro: "발견 정리하기",
  },
  6: {
    label: "User Journey",
    title: "사용자 여정 지도 그리기",
    macro: "발견 정리하기",
  },
  7: { label: "Ideation", title: "아이디어 펼치기", macro: "아이디어 만들기" },
  8: { label: "우선순위", title: "실행 순서 정하기", macro: "아이디어 만들기" },
  9: { label: "Concept", title: "컨셉 시트", macro: "아이디어 만들기" },
  10: {
    label: "프로토타입",
    title: "시제품 만들기",
    macro: "서비스 확장",
    isServiceExtension: true,
  },
  11: {
    label: "검증",
    title: "사용성 테스트",
    macro: "서비스 확장",
    isServiceExtension: true,
  },
  12: {
    label: "타당성",
    title: "사업 타당성",
    macro: "서비스 확장",
    isServiceExtension: true,
  },
  13: {
    label: "로드맵",
    title: "90일 실행 계획",
    macro: "서비스 확장",
    isServiceExtension: true,
  },
  14: {
    label: "피치 덱",
    title: "투자자용 덱",
    macro: "서비스 확장",
    isServiceExtension: true,
  },
  15: {
    label: "매칭",
    title: "투자·지원 연결",
    macro: "서비스 확장",
    isServiceExtension: true,
  },
};
