/** 단계 1 가이드 방식 선택에 따른 코칭 레벨 (내부 매핑) */
export type UserCoachingLevel = "beginner" | "expert";

/** 검토 패널 등 짧은 뱃지 */
export function levelCoachingPaceBadge(level: UserCoachingLevel): string {
  return level === "expert" ? "할 일 중심" : "단계별 안내";
}

/** @deprecated levelCoachingPaceBadge 사용 */
export function levelLabel(level: UserCoachingLevel): string {
  return levelCoachingPaceBadge(level);
}

/** 가이드 방식 선택 직후·검토 화면용 */
export function levelCoachingPaceMessage(level: UserCoachingLevel): string {
  if (level === "beginner") {
    return [
      "단계별 안내 방식으로 맞출게요.",
      "각 단계의 의미와 방법을 설명하고, 예시를 충분히 들으며 함께 만들어 갈게요.",
    ].join(" ");
  }

  return [
    "할 일 중심 방식으로 맞출게요.",
    "해야 할 일만 짧게 보여 드리고, 코치는 필요할 때만 핵심을 짚어 드릴게요.",
  ].join(" ");
}

/** AI 코치 시스템 컨텍스트용 (사용자 UI에 직접 노출하지 않음) */
export function levelCoachToneHint(level: UserCoachingLevel): string {
  return level === "expert"
    ? "[가이드 방식: 할 일 중심] 단계 진입·안내 발화는 두 문장 이내. 코칭은 짧고 점검 톤. 단계 의미·방법 설명은 요청 시에만. 할 일 위주로 안내. 단계는 건너뛰지 않는다."
    : "[가이드 방식: 단계별 안내] 코칭은 천천히, 단계의 의미·방법·예시를 충분히 설명. 함께 손잡는 톤. 단계는 건너뛰지 않는다.";
}
