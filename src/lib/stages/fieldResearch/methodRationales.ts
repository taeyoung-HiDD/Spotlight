/**
 * CORE 1 — 리서치 방법별 「이 문제에 적합한 이유」.
 * 카탈로그 요약(방법 정의)을 되풀이하지 않고, 문제 맥락 × 방법의 고유 장점을 연결한다.
 */

import { sanitizeCoachKoreanText } from "@/lib/coach/sanitizeCoachKorean";
import { getResearchMethodEntry } from "@/lib/stages/fieldResearch/researchMethodCatalog";
import type { ResearchMethodId } from "@/lib/stages/fieldResearch/types";

const RATIONALE_MAX = 280;

/** 문제 문장에서 잡아낼 도메인 키워드 (긴 표현 우선) */
const DOMAIN_KEYWORDS = [
  "자산 관리",
  "금융 관리",
  "돈 관리",
  "가계부",
  "소비 습관",
  "충동 소비",
  "생활비",
  "월급",
  "저축",
  "투자",
  "금융",
  "자산",
  "통장",
  "결제",
  "배달",
  "육아",
  "돌봄",
  "주거",
  "자취",
  "이직",
  "구직",
  "학습",
  "공부",
  "운동",
  "건강",
  "식단",
  "쇼핑",
  "출퇴근",
  "통근",
  "업무",
  "협업",
  "고객 응대",
  "예약",
  "진료",
  "약",
  "여행",
  "이사",
] as const;

/** 방법 정의를 되풀이할 때 자주 나오는 일반 표현 — 이유에만 있으면 부적합 */
const GENERIC_RATIONALE_MARKERS = [
  "맥락·습관·감정",
  "맥락과 습관",
  "습관·감정",
  "말과 행동의 차이",
  "말과 행동",
  "1:1로 깊게",
  "실제 환경에서 1:1",
  "실제 생활 공간에서 인터뷰",
  "실제 행동을 관찰",
  "사용·업무 현장을 따라가며",
  "사용자 공간에서",
  "직접 써 보며 불편",
  "몸으로 확인해요",
] as const;

function compact(text: string): string {
  return text.replace(/\s+/g, "").toLowerCase();
}

function clipProblemTopic(problem: string, max = 36): string {
  const t = problem.trim().replace(/\s+/g, " ");
  if (!t) return "이 문제";
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function dedupeDomainHints(hints: string[]): string[] {
  // 짧은 토큰이 긴 토큰에 포함되면 제거 (금융 ⊂ 금융 관리)
  return hints.filter(
    (h, i) =>
      !hints.some(
        (other, j) =>
          i !== j && other.includes(h) && other.length > h.length,
      ),
  );
}

/** 문제 정의에서 도메인 단서(명사·주제 조각)를 뽑는다 */
export function extractProblemDomainHints(problem: string): string[] {
  const text = problem.trim();
  if (!text) return [];

  const found: string[] = [];

  // 「자산·금융 관리」처럼 가운데점이 끼인 복합 주제도 잡는다
  const compound = text.match(
    /[가-힣]{2,}(?:[·・][가-힣]{2,})+[·・\s]*(?:관리|습관|경험|문제)?/,
  );
  if (compound?.[0]) {
    const c = compound[0].replace(/\s+/g, " ").trim();
    if (c.length >= 2) found.push(c);
  }

  for (const kw of DOMAIN_KEYWORDS) {
    if (text.includes(kw) && !found.includes(kw)) found.push(kw);
    if (found.length >= 6) break;
  }

  const quoted = text.match(/[「『"“]([^」』"”]{2,24})[」』"”]/g);
  if (quoted) {
    for (const q of quoted) {
      const inner = q.replace(/^[「『"“]|[」』"”]$/g, "").trim();
      if (inner.length >= 2 && !found.includes(inner)) found.push(inner);
      if (found.length >= 7) break;
    }
  }

  return dedupeDomainHints(found).slice(0, 5);
}

function domainAnchor(problem: string): string {
  const hints = extractProblemDomainHints(problem);
  if (!hints.length) return clipProblemTopic(problem, 28);
  // 가장 구체적인(긴) 단서 하나만 쓴다 — 「금융 관리·금융」처럼 중복 결합 방지
  return [...hints].sort((a, b) => b.length - a.length)[0] ?? hints[0];
}

function looksFinancial(problem: string): boolean {
  return (
    /금융|자산|저축|투자|돈|월급|경제|가계부|통장|소비/.test(problem) ||
    /finance|asset|money|budget/.test(problem.toLowerCase())
  );
}

export function buildHeuristicMethodRationale(
  methodId: ResearchMethodId,
  problem: string,
): string {
  const topic = domainAnchor(problem);
  const financial = looksFinancial(problem);

  let text = "";
  if (methodId === "home_visit_in_depth") {
    text = financial
      ? `가계부·뱅킹 앱·현금 봉투처럼 「${topic}」에 쓰는 물건과 자리를 직접 보면, 인터뷰에서 빠뜨리기 쉬운 실제 돈 나누기·기록 습관을 함께 확인할 수 있어요.`
      : `「${topic}」 맥락의 생활·업무 공간에서 도구·메모·배치를 보며, 말로만 들으면 놓치기 쉬운 우회 습관과 감정 단서를 같이 짚을 수 있어요.`;
  } else if (methodId === "shadowing") {
    text = financial
      ? `월급일·결제·이체처럼 「${topic}」 결정이 순간적으로 일어나는 장면을 따라가면, 「아끼는 편」 같은 자기보고와 실제 소비·저축 행동의 갭을 잡을 수 있어요.`
      : `「${topic}」 관련 행동이 실제로 벌어지는 순간을 따라가며 관찰하면, 말로 정리한 루틴과 현장의 행동·우회가 어디서 갈리는지 볼 수 있어요.`;
  } else if (methodId === "be_the_customer") {
    text = financial
      ? `「${topic}」에 쓰는 금융·가계부 앱 흐름을 직접 따라가면, 이체·분류·알림에서 막히는 지점을 몸으로 확인해 인터뷰만으로는 안 보이는 마찰을 짚을 수 있어요.`
      : `「${topic}」에 맞닿은 서비스·도구를 직접 써 보면, 사용자가 어디서 멈추고 우회하는지 체감해 관찰·인터뷰 질문을 날카롭게 다듬을 수 있어요.`;
  } else {
    text = `「${topic}」 맥락에서 이 방법으로만 잡을 수 있는 현장 단서(행동·도구·감정)를 확인하려고 추천해요.`;
  }

  return sanitizeCoachKoreanText(text).slice(0, RATIONALE_MAX);
}

export function buildHeuristicMethodRecommendationReason(
  problem: string,
): string {
  const topic = domainAnchor(problem);
  const text = looksFinancial(problem)
    ? `「${topic}」처럼 말로는 정리해도 실제 습관·도구·결제 순간이 달라서, 현장 대화와 행동 관찰을 함께 쓰는 편이 원인(Why)에 가까워져요.`
    : `「${topic}」처럼 자기보고만으로는 빈칸이 생기기 쉬워, 현장 대화와 행동 관찰을 함께 보면 환경·우회·감정 단서를 보완할 수 있어요.`;
  return sanitizeCoachKoreanText(text).slice(0, RATIONALE_MAX);
}

export function buildHeuristicMethodRationales(
  problem: string,
  methodIds: ResearchMethodId[],
): Partial<Record<ResearchMethodId, string>> {
  const out: Partial<Record<ResearchMethodId, string>> = {};
  for (const id of methodIds) {
    out[id] = buildHeuristicMethodRationale(id, problem);
  }
  return out;
}

/** 카탈로그 요약·일반 방법 설명에 가깝거나, 문제 도메인 단서가 빠진 이유인지 */
export function isGenericMethodRationale(
  methodId: ResearchMethodId,
  rationale: string,
  problem: string,
): boolean {
  const text = rationale.trim();
  if (text.length < 12) return true;

  const entry = getResearchMethodEntry(methodId);
  if (entry) {
    const a = compact(text);
    const b = compact(entry.summary);
    if (a === b || a.includes(b) || b.includes(a)) return true;
    // 요약과 겹치는 핵심 구절이 많고 도메인 단서가 없으면 일반론으로 본다
    const summaryChunks = entry.summary
      .split(/[.,·]/)
      .map((s) => compact(s))
      .filter((s) => s.length >= 6);
    const overlap = summaryChunks.filter((c) => a.includes(c)).length;
    if (overlap >= 2) {
      const hints = extractProblemDomainHints(problem);
      const hasHint = hints.some((h) => text.includes(h));
      if (!hasHint) return true;
    }
  }

  // 방법 정의 문구가 보이면 도메인 단어를 끼워 넣었어도 일반론으로 본다
  if (GENERIC_RATIONALE_MARKERS.some((m) => text.includes(m))) return true;

  // 문제 도메인 단서가 하나도 없으면(문제엔 있는데 이유엔 없음) 일반론
  const hints = extractProblemDomainHints(problem);
  if (hints.length > 0 && !hints.some((h) => text.includes(h))) {
    // 단서가 「자산·금융 관리」처럼 가운데점 표기일 때 부분 매칭
    const looseHit = hints.some((h) => {
      const parts = h.split(/[·・\s]+/).filter((p) => p.length >= 2);
      return parts.length > 0 && parts.every((p) => text.includes(p));
    });
    if (!looseHit) return true;
  }

  return false;
}

export function hasGenericMethodRationales(
  problem: string,
  methodIds: ResearchMethodId[],
  rationales: Partial<Record<ResearchMethodId, string>>,
): boolean {
  if (!methodIds.length) return false;
  return methodIds.some((id) => {
    const text = rationales[id]?.trim() ?? "";
    return !text || isGenericMethodRationale(id, text, problem);
  });
}

/**
 * AI/저장된 이유가 일반론이면 문제 맞춤 휴리스틱으로 교체한다.
 * 이미 구체적인 이유는 유지한다.
 */
export function ensureSpecificMethodRationales(
  problem: string,
  methodIds: ResearchMethodId[],
  rationales: Partial<Record<ResearchMethodId, string>> | undefined,
  comboReason?: string,
): {
  methodRationales: Partial<Record<ResearchMethodId, string>>;
  methodRecommendationReason: string;
} {
  const next: Partial<Record<ResearchMethodId, string>> = {
    ...(rationales ?? {}),
  };
  for (const id of methodIds) {
    const current = next[id]?.trim() ?? "";
    if (!current || isGenericMethodRationale(id, current, problem)) {
      next[id] = buildHeuristicMethodRationale(id, problem);
    } else {
      next[id] = sanitizeCoachKoreanText(current).slice(0, RATIONALE_MAX);
    }
  }

  let methodRecommendationReason = (comboReason ?? "").trim();
  const comboHasDomain = extractProblemDomainHints(problem).some((h) => {
    if (methodRecommendationReason.includes(h)) return true;
    const parts = h.split(/[·・\s]+/).filter((p) => p.length >= 2);
    return parts.length > 0 && parts.every((p) => methodRecommendationReason.includes(p));
  });
  const comboLooksGeneric =
    !methodRecommendationReason ||
    /환경·도구·행동을 함께|직접 찾아가 대화|행동을 관찰하는 섀도잉|실제 행동과 .+ 습관을 깊게/.test(
      methodRecommendationReason,
    ) ||
    (!comboHasDomain &&
      methodRecommendationReason.length < 90 &&
      /추천해요|적합해요/.test(methodRecommendationReason));

  if (comboLooksGeneric) {
    methodRecommendationReason =
      buildHeuristicMethodRecommendationReason(problem);
  } else {
    methodRecommendationReason = sanitizeCoachKoreanText(
      methodRecommendationReason,
    ).slice(0, RATIONALE_MAX);
  }

  return { methodRationales: next, methodRecommendationReason };
}
