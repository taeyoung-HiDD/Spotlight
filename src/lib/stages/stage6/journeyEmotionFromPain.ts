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

const POSITIVE_PATTERNS: Array<{ re: RegExp; weight: number }> = [
  { re: /만족|기쁘|즐겁|행복|뿌듯|설레|신나|든든|안심/, weight: 0.3 },
  { re: /좋았|좋아|편했|편하|편리|간편|수월|도움|익숙|재미|기대/, weight: 0.18 },
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

function collectBehaviorTexts(
  step: JourneyMapStep,
  itemsById: UserJourneyMapData["itemsById"],
): string[] {
  const zoneItems = resolveStepZoneItems(step, itemsById);
  return zoneItems.behavior
    .map((id) => itemsById[id])
    .filter((item): item is JourneyMapItem => Boolean(item?.text.trim()))
    .map((item) => item.text.trim());
}

/** 사용자 행동(언급·관찰) 텍스트의 긍·부정 톤 → -1 ~ +1 */
export function scoreBehaviorSentiment(texts: string[]): number {
  if (texts.length === 0) return 0;
  let total = 0;
  for (const text of texts) {
    let score = 0;
    for (const { re, weight } of POSITIVE_PATTERNS) {
      if (re.test(text)) score += weight;
    }
    for (const { re, weight } of SEVERITY_PATTERNS) {
      if (re.test(text)) score -= weight;
    }
    total += clamp(score, -0.6, 0.6);
  }
  return clamp(total / texts.length, -1, 1);
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
 * 사용자 행동과 Pain point 내용을 종합해 단계별 감정 점수를 자동 산정.
 * 행동 텍스트의 긍·부정 톤이 기준선을 잡고, Pain이 많을수록·강할수록
 * 아래로(부정) 내려갑니다. 둘 다 없으면 중립.
 */
export function scoreStepEmotion(
  step: JourneyMapStep,
  itemsById: UserJourneyMapData["itemsById"],
): JourneyEmotionPoint {
  const { texts, painCount } = collectPainTexts(step, itemsById);
  const severity = scorePainSeverity(texts);
  const behaviorTexts = collectBehaviorTexts(step, itemsById);
  const sentiment = scoreBehaviorSentiment(behaviorTexts);
  const zones = resolveStepZoneItems(step, itemsById);
  const hasOtherContent =
    zones.touchpoint.length > 0 ||
    resolveStepAiEntries(step, "touchpoint").some((t) => t.trim());

  let score: JourneyEmotionScore;
  if (painCount === 0 && severity === 0 && behaviorTexts.length === 0) {
    score = hasOtherContent ? 0.42 : 0;
  } else {
    // 행동 톤 중립·pain severity 1.0 → ~-0.27, 2.0+ → ~-1
    score = clamp(0.45 + sentiment * 0.4 - severity * 0.72, -1, 0.85);
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
