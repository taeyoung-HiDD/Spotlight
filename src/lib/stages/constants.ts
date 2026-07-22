export const STAGE_COUNT = 16;

export type StageMeta = {
  label: string;
  title: string;
  macro: string;
  /** 11–16: 서비스 확장 */
  isServiceExtension?: boolean;
};

export const STAGE_META: Record<number, StageMeta> = {
  1: { label: "문제 정의하기", title: "문제 정의하기", macro: "공감하기" },
  2: {
    label: "사전 조사하기",
    title: "사전 조사하기 (Pre-PMF Overview)",
    macro: "공감하기",
  },
  3: {
    label: "사용자 조사 준비하기",
    title: "사용자 조사 준비하기",
    macro: "공감하기",
  },
  4: { label: "분석·공감맵", title: "발견 정리하기", macro: "발견 정리하기" },
  5: {
    label: "User Journey",
    title: "사용자 여정 지도 그리기",
    macro: "발견 정리하기",
  },
  6: {
    label: "Needs",
    title: "진짜 필요 찾기 · 니즈 분석하기",
    macro: "발견 정리하기",
  },
  7: { label: "HMW", title: "HMW 질문 만들기", macro: "아이디어 만들기" },
  8: { label: "Ideation", title: "아이디어 펼치기", macro: "아이디어 만들기" },
  9: { label: "우선순위", title: "실행 순서 정하기", macro: "아이디어 만들기" },
  10: { label: "Concept", title: "컨셉 시트", macro: "아이디어 만들기" },
  11: {
    label: "프로토타입",
    title: "시제품 만들기",
    macro: "서비스 확장",
    isServiceExtension: true,
  },
  12: {
    label: "검증",
    title: "사용성 테스트",
    macro: "서비스 확장",
    isServiceExtension: true,
  },
  13: {
    label: "타당성",
    title: "사업 타당성",
    macro: "서비스 확장",
    isServiceExtension: true,
  },
  14: {
    label: "로드맵",
    title: "90일 실행 계획",
    macro: "서비스 확장",
    isServiceExtension: true,
  },
  15: {
    label: "피치 덱",
    title: "투자자용 덱",
    macro: "서비스 확장",
    isServiceExtension: true,
  },
  16: {
    label: "매칭",
    title: "투자·지원 연결",
    macro: "서비스 확장",
    isServiceExtension: true,
  },
};
