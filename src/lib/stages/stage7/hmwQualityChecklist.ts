import type {
  HmwQualityTip,
  HmwQualityTipId,
  HmwVariationCandidate,
  HmwVariationKind,
} from "@/lib/stages/stage7/hmwTypes";

const NEGATIVE_VERB_RE =
  /줄이|없애|제거|방지|피하|중단|억제|막다|차단|없애다|없앴|없애서/u;

const SOLUTION_HINT_RE =
  /앱|애플리케이션|기능|플랫폼|알고리즘|버튼|대시보드|챗봇|AI\s*모델|푸시\s*알림|센서|IoT|웨어러블/iu;

const SYMPTOM_RE = /불편|짜증|스트레스|힘들|고통|불만/u;

const TIP_NOTES: Record<HmwQualityTipId, string> = {
  1: "니즈에 나온 핵심 단어를 질문 안에 더 담아 보면, 아이디어가 니즈에서 멀어지지 않아요.",
  2: "증상보다 ‘이루고 싶은 상태’를 물어보면, 다음 단계에서 해결 방향이 더 잘 열려요.",
  3: "‘없애다·줄이다’ 대신 ‘늘리다·만들다·향상시키다’처럼 긍정 동사로 바꿔 보면 좋아요.",
  4: "한 가지 방법만 떠오르지 않게, 조금 더 열린 범위로 다듬어 보세요.",
  5: "특정 기능·도구 이름을 빼 두면, 더 다양한 아이디어가 나올 수 있어요.",
};

function tokenizeNeed(need: string): string[] {
  return need
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

/** 룰 기반 1차 5-Tip 점검 */
export function evaluateHmwQualityRules(
  hmwText: string,
  latentNeedText: string,
): HmwQualityTip[] {
  const text = hmwText.trim();
  const need = latentNeedText.trim();
  const tips: HmwQualityTip[] = [];

  const needTokens = tokenizeNeed(need);
  const textLower = text.toLowerCase();
  const overlap =
    needTokens.length === 0
      ? 0
      : needTokens.filter((t) => textLower.includes(t)).length /
        needTokens.length;

  const tip1Pass = overlap >= 0.15 || needTokens.length === 0;
  tips.push({
    id: 1,
    status: tip1Pass ? "pass" : "warn",
    ...(!tip1Pass ? { note: TIP_NOTES[1] } : {}),
  });

  const tip2Pass = !SYMPTOM_RE.test(text) || /할\s*수\s*있을까|하기\s*위해/u.test(text);
  const tip2Warn = SYMPTOM_RE.test(text) && !/하기\s*위해/u.test(text);
  tips.push({
    id: 2,
    status: tip2Warn ? "warn" : tip2Pass ? "pass" : "pass",
    ...(tip2Warn ? { note: TIP_NOTES[2] } : {}),
  });

  const tip3Warn = NEGATIVE_VERB_RE.test(text);
  tips.push({
    id: 3,
    status: tip3Warn ? "warn" : "pass",
    ...(tip3Warn ? { note: TIP_NOTES[3] } : {}),
  });

  const len = text.length;
  const tip4Warn = len < 18 || len > 120 || /오직|반드시|단\s*하나/u.test(text);
  tips.push({
    id: 4,
    status: tip4Warn ? "warn" : "pass",
    ...(tip4Warn ? { note: TIP_NOTES[4] } : {}),
  });

  const tip5Warn = SOLUTION_HINT_RE.test(text);
  tips.push({
    id: 5,
    status: tip5Warn ? "warn" : "pass",
    ...(tip5Warn ? { note: TIP_NOTES[5] } : {}),
  });

  return tips;
}

export function countTipPasses(tips: HmwQualityTip[]): number {
  return tips.filter((t) => t.status === "pass").length;
}

const KIND_PRIORITY: Record<HmwVariationKind, number> = {
  amp_up: 3,
  remove_bad: 2,
  explore_opposite: 1,
};

/** pass 수 우선, 동점이면 amp_up > remove_bad > explore_opposite */
export function pickBestHmwCandidate(
  candidates: HmwVariationCandidate[],
): HmwVariationCandidate | null {
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => {
    const passDiff = countTipPasses(b.tips) - countTipPasses(a.tips);
    if (passDiff !== 0) return passDiff;
    return KIND_PRIORITY[b.kind] - KIND_PRIORITY[a.kind];
  })[0]!;
}

/** LLM tip 결과를 룰 결과 위에 병합 (LLM note 우선) */
export function mergeQualityTips(
  ruleTips: HmwQualityTip[],
  llmTips: HmwQualityTip[],
): HmwQualityTip[] {
  const byId = new Map(ruleTips.map((t) => [t.id, t]));
  for (const tip of llmTips) {
    const prev = byId.get(tip.id);
    if (!prev) {
      byId.set(tip.id, tip);
      continue;
    }
    // warn이 하나라도 있으면 warn 유지, note는 LLM 우선
    const status =
      prev.status === "warn" || tip.status === "warn" ? "warn" : "pass";
    const note = tip.note?.trim() || prev.note;
    byId.set(tip.id, {
      id: tip.id,
      status,
      ...(note ? { note } : {}),
    });
  }
  return [1, 2, 3, 4, 5].map((id) => {
    const tip = byId.get(id as HmwQualityTipId);
    return (
      tip ?? {
        id: id as HmwQualityTipId,
        status: "pass" as const,
      }
    );
  });
}

export function buildHeuristicCandidates(
  latentNeedText: string,
  draftText: string,
): HmwVariationCandidate[] {
  const kinds: HmwVariationKind[] = [
    "amp_up",
    "remove_bad",
    "explore_opposite",
  ];
  return kinds.map((kind) => ({
    kind,
    text: draftText,
    tips: evaluateHmwQualityRules(draftText, latentNeedText),
  }));
}
