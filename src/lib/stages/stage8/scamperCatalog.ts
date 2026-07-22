export type ScamperLetter = "S" | "C" | "A" | "M" | "P" | "E" | "R";

export type ScamperStep = {
  letter: ScamperLetter;
  label: string;
  title: string;
  prompt: string;
  example: string;
};

export const SCAMPER_STEPS: ScamperStep[] = [
  {
    letter: "S",
    label: "대체",
    title: "Substitute · 대체",
    prompt: "구성 요소·재료·방식 중 무엇을 다른 것으로 바꿀 수 있을까요?",
    example: "앱 알림 대신 카카오톡 메시지로 예상 시간을 알려준다면?",
  },
  {
    letter: "C",
    label: "결합",
    title: "Combine · 결합",
    prompt: "다른 기능·서비스·경험과 합치면 어떤 아이디어가 나올까요?",
    example: "배달 추적 + 캘린더 일정을 한 화면에서 보여준다면?",
  },
  {
    letter: "A",
    label: "응용",
    title: "Adapt · 응용",
    prompt: "다른 분야의 비슷한 해결을 우리 문제에 가져오면 어떨까요?",
    example: "자율주행차의 센서처럼 매장 재고를 실시간 인식한다면?",
  },
  {
    letter: "M",
    label: "변경",
    title: "Modify · 변경",
    prompt: "크기·속도·빈도·강도를 바꾸면 어떻게 달라질까요?",
    example: "도착 30분 전이 아니라 5분 전에만 알려준다면?",
  },
  {
    letter: "P",
    label: "다른 용도",
    title: "Put to other uses · 다른 용도",
    prompt: "이 아이디어를 다른 상황·사용자에게 쓰면 어떨까요?",
    example: "배달 알림을 회의실 예약 알림에도 응용한다면?",
  },
  {
    letter: "E",
    label: "제거",
    title: "Eliminate · 제거",
    prompt: "빼도 되는 단계·기능·마찰이 있다면 무엇일까요?",
    example: "앱 설치 없이 문자만으로 예상 시간을 받는다면?",
  },
  {
    letter: "R",
    label: "재배치",
    title: "Rearrange · 재배치",
    prompt: "순서·역할·흐름을 뒤바꾸면 어떤 변형이 나올까요?",
    example: "배달 후가 아니라 주문 직후에 일정 조정을 먼저 제안한다면?",
  },
];
