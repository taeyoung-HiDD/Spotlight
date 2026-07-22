import { resolveStepAiEntries } from "@/lib/stages/stage6/journeyStepZones";
import { resolveStepZoneItems } from "@/lib/stages/stage6/journeyStepZones";
import type {
  JourneyMapItem,
  JourneyMapStep,
  UserJourneyMapData,
} from "@/lib/stages/stage6/userJourneyTypes";

/** -1(매우 부정) ~ +1(긍정). 0은 중립. */
export type JourneyEmotionScore = number;

export type JourneyEmotionPoint = {
  stepId: string;
  stepLabel: string;
  score: JourneyEmotionScore;
  emoji: string;
  ariaLabel: string;
  painCount: number;
  severity: number;
};

const SEVERITY_PATTERNS: Array<{ re: RegExp; weight: number }> = [
  { re: /포기|절망|최악|불가능|실패|분노|화나|견딜\s*수\s*없/, weight: 0.45 },
  {
    re: /좌절|막힘|심각|답답|불안|스트레스|불편|짜증|고통|실망|막막/,
    weight: 0.3,
  },
  {
    re: /아쉽|걱정|헷갈|혼란|번거|귀찮|오래|시간\s*걸|어렵|복잡|불편하/,
    weight: 0.15,
  },
];

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function collectPainTexts(
  step: JourneyMapStep,
  itemsById: UserJourneyMapData["itemsById"],
): { texts: string[]; painCount: number } {
  const zoneItems = resolveStepZoneItems(step, itemsById);
  const items = zoneItems.pain_point
    .map((id) => itemsById[id])
    .filter((item): item is JourneyMapItem => Boolean(item?.text.trim()));
  const aiBullets = resolveStepAiEntries(step, "pain_point")
    .map((line) => line.trim())
    .filter(Boolean);
  const texts = [...items.map((item) => item.text.trim()), ...aiBullets];
  return {
    texts,
    painCount: items.length + aiBullets.length,
  };
}

/** Pain point 문구 수·강도 → 심각도(0+) */
export function scorePainSeverity(texts: string[]): number {
  let severity = 0;
  for (const text of texts) {
    if (!text) continue;
    severity += 0.28;
    for (const { re, weight } of SEVERITY_PATTERNS) {
      if (re.test(text)) severity += weight;
    }
    severity += Math.min(text.length / 140, 0.22);
  }
  return severity;
}

export function emojiForEmotionScore(score: JourneyEmotionScore): string {
  if (score >= 0.45) return "😊";
  if (score >= 0.15) return "🙂";
  if (score >= -0.15) return "🤔";
  if (score >= -0.5) return "😕";
  return "☹️";
}

function ariaForScore(score: JourneyEmotionScore, painCount: number): string {
  const mood =
    score >= 0.45
      ? "긍정적"
      : score >= 0.15
        ? "다소 긍정"
        : score >= -0.15
          ? "중립·탐색"
          : score >= -0.5
            ? "다소 부정"
            : "부정적";
  if (painCount <= 0) return `감정 ${mood}`;
  return `감정 ${mood} · Pain point ${painCount}개 반영`;
}

/**
 * Pain point 카드·AI 문구의 수와 심각도로 단계별 감정 점수.
 * Pain이 많을수록·강할수록 아래로(부정), 없으면 완만한 긍정·중립.
 */
export function scoreStepEmotion(
  step: JourneyMapStep,
  itemsById: UserJourneyMapData["itemsById"],
): JourneyEmotionPoint {
  const { texts, painCount } = collectPainTexts(step, itemsById);
  const severity = scorePainSeverity(texts);
  const zones = resolveStepZoneItems(step, itemsById);
  const hasOtherContent =
    zones.behavior.length > 0 ||
    zones.touchpoint.length > 0 ||
    resolveStepAiEntries(step, "touchpoint").some((t) => t.trim());

  let score: JourneyEmotionScore;
  if (painCount === 0 && severity === 0) {
    score = hasOtherContent ? 0.42 : 0;
  } else {
    // severity 0.3 → ~0.25, 1.0 → ~-0.3, 2.0+ → ~-1
    score = clamp(0.55 - severity * 0.72, -1, 0.85);
  }

  return {
    stepId: step.id,
    stepLabel: step.label.trim() || "여정 단계",
    score,
    emoji: emojiForEmotionScore(score),
    ariaLabel: ariaForScore(score, painCount),
    painCount,
    severity,
  };
}

export function buildJourneyEmotionPoints(
  steps: JourneyMapStep[],
  itemsById: UserJourneyMapData["itemsById"],
): JourneyEmotionPoint[] {
  return [...steps]
    .sort((a, b) => a.order - b.order)
    .map((step) => scoreStepEmotion(step, itemsById));
}
