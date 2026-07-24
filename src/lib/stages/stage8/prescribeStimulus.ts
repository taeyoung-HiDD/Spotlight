import type { HmwQuestion } from "@/lib/stages/stage7/hmwTypes";
import type {
  IdeaGridData,
  IdeaStimulusType,
} from "@/lib/stages/stage8/ideaGridTypes";
import { filledIdeaCount } from "@/lib/stages/stage8/ideaGridTypes";

export type StimulusPrescription = {
  type: IdeaStimulusType;
  reason: string;
};

const DIRECTION_KEYWORDS = [
  "알림",
  "푸시",
  "메시지",
  "문자",
  "앱",
  "대시보드",
  "센서",
  "자동",
  "재고",
];

/** 임베딩 없이 자극 우선순위 근사 */
export function prescribeStimulus(
  grid: IdeaGridData,
  hmwQuestions: HmwQuestion[],
): StimulusPrescription {
  const filled = filledIdeaCount(grid);
  const ideas = grid.slots.filter((s) => s?.title.trim());

  // 3순위: 특정 HMW에 아이디어 0개
  for (const q of hmwQuestions) {
    if (!q.hmwText.trim()) continue;
    const count = ideas.filter((s) => s?.sourceHmwId === q.id).length;
    if (count === 0) {
      return {
        type: "team_persona",
        reason: "아직 아이디어가 없는 HMW가 있어요. 팀 관점 질문으로 비어 있는 쪽을 건드려 볼까요?",
      };
    }
  }

  // 1순위: 아이디어가 없거나 적음
  if (filled === 0) {
    return {
      type: "principle_card",
      reason: "아직 칸이 비어 있어요. 원리 카드로 첫 방향을 열어 볼까요?",
    };
  }
  if (filled < 3) {
    return {
      type: "scamper",
      reason: "아직 양이 적어요. SCAMPER로 이미 낸 아이디어를 비틀어 볼까요?",
    };
  }

  // 2순위: 한 방향 몰림 (같은 SCAMPER 3회+ 또는 키워드 반복)
  const letterCounts = new Map<string, number>();
  for (const idea of ideas) {
    const letter = idea?.scamperLetter;
    if (!letter) continue;
    letterCounts.set(letter, (letterCounts.get(letter) ?? 0) + 1);
  }
  for (const count of letterCounts.values()) {
    if (count >= 3) {
      return {
        type: "principle_card",
        reason: "같은 SCAMPER 변주가 많이 쌓였어요. 원리 카드로 다른 각도를 열어 볼까요?",
      };
    }
  }

  for (const keyword of DIRECTION_KEYWORDS) {
    const hits = ideas.filter((idea) =>
      `${idea?.title ?? ""} ${idea?.description ?? ""}`.includes(keyword),
    ).length;
    if (hits >= 3) {
      return {
        type: "principle_card",
        reason: `「${keyword}」 쪽 아이디어가 몰려 있어요. 원리 카드로 다른 풀이를 열어 볼까요?`,
      };
    }
  }

  return {
    type: "scamper",
    reason: "SCAMPER로 한 번 더 비틀어 볼까요?",
  };
}

export function hmwIdeaCoverage(
  grid: IdeaGridData,
  hmwQuestions: HmwQuestion[],
): Array<{ question: HmwQuestion; count: number; index: number }> {
  return hmwQuestions
    .filter((q) => q.hmwText.trim())
    .map((question, index) => ({
      question,
      index: index + 1,
      count: grid.slots.filter(
        (s) => s?.sourceHmwId === question.id && s.title.trim(),
      ).length,
    }));
}
