/** 마스터 스펙 §4.4 · §1.7 — 진입 후 3질문 수준 진단 */
export type UserCoachingLevel = "beginner" | "expert";

export type DiagnosticQuestionId = "dt_flow" | "research" | "ideation";

export interface DiagnosticQuestionDef {
  id: DiagnosticQuestionId;
  title: string;
  coachQuestion: string;
}

export const LEVEL_DIAGNOSTIC_QUESTIONS: DiagnosticQuestionDef[] = [
  {
    id: "dt_flow",
    title: "디자인씽킹 흐름",
    coachQuestion:
      "디자인씽킹을 ‘문제 이해 → 아이디어 → 시제품 → 검증’처럼 단계로 밟아본 적이 있나요?",
  },
  {
    id: "research",
    title: "리서치 메서드",
    coachQuestion:
      "사용자 인터뷰·관찰·사용자 조사처럼, 사람을 만나 들어본 경험이 있나요?",
  },
  {
    id: "ideation",
    title: "아이디어 발산",
    coachQuestion:
      "포스트잇·스케치·브레인스토밍처럼, 아이디어를 많이 펼쳐본 경험이 있나요?",
  },
];

/** 답변 키워드 → 점수 (0=초보, 1=중간, 2=숙련) */
const LEVEL_SCORE_PATTERNS: { score: number; pattern: RegExp }[] = [
  { score: 2, pattern: /익숙|잘 알|여러 번|자주|워크숍|전문|숙련|많이 해봤/i },
  { score: 1, pattern: /가끔|조금|한두 번|들어봤|대략|어느 정도/i },
  { score: 0, pattern: /처음|첫|없어|모르|낯설|어렵|잘 모르/i },
];

export function scoreDiagnosticAnswer(text: string): number {
  const t = text.trim();
  if (/건너뛰|패스|skip/i.test(t)) return 0;
  for (const { score, pattern } of LEVEL_SCORE_PATTERNS) {
    if (pattern.test(t)) return score;
  }
  return 1;
}

export function resolveCoachingLevel(
  scores: number[],
  skipped?: boolean,
): UserCoachingLevel {
  if (skipped) return "beginner";
  const total = scores.reduce((a, b) => a + b, 0);
  return total >= 4 ? "expert" : "beginner";
}

/** 검토 패널 등 짧은 뱃지 — 초보/전문가 라벨 없음 */
export function levelCoachingPaceBadge(level: UserCoachingLevel): string {
  return level === "expert" ? "핵심 짚어 가기" : "차근차근 함께";
}

/** @deprecated levelCoachingPaceBadge 사용 */
export function levelLabel(level: UserCoachingLevel): string {
  return levelCoachingPaceBadge(level);
}

/** 진단 직후·검토 화면용 — 맞춤 코칭 방식을 풀어서 설명 */
export function levelCoachingPaceMessage(
  level: UserCoachingLevel,
  options?: { skippedDiagnostic?: boolean },
): string {
  if (options?.skippedDiagnostic) {
    return [
      "처음이셔도 괜찮아요.",
      "하나씩 차근차근 코치와 만들어 가요.",
      "모든 단계를 빠짐없이 거치면서, 어렵지 않게 탄탄한 결과물을 함께 만들어 갈게요.",
    ].join(" ");
  }

  if (level === "beginner") {
    return [
      "하나씩 차근차근 코치와 만들어 가요.",
      "되도록 모든 단계를 거쳐가며, 어렵지 않게 탄탄한 결과물을 함께 만들어 갈게요.",
    ].join(" ");
  }

  return [
    "단계마다 핵심을 짚어 가며, 빠짐없이 탄탄한 결과물을 만들 수 있게 맞출게요.",
    "필요할 때만 예시를 드리고, 스스로의 속도로 점검할 수 있도록 옆에서 돕겠습니다.",
  ].join(" ");
}

/** AI 코치 시스템 컨텍스트용 (사용자 UI에 직접 노출하지 않음) */
export function levelCoachToneHint(level: UserCoachingLevel): string {
  return level === "expert"
    ? "코칭은 짧고 점검 톤으로, 예시는 필요할 때만 제시한다. 단계는 건너뛰지 않는다."
    : "코칭은 천천히, 예시를 충분히 들며 함께 손잡는 톤으로 한다. 단계는 건너뛰지 않는다.";
}
