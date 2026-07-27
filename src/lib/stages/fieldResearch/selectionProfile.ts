/**
 * 극단 사용자·조사 세그먼트가 공유하는 선정 기준 스키마.
 * - selectionCriteria ≡ segmentation_variables (칩)
 * - criterionDetails: 칩별 「왜 이 대상에 이 기준인가」
 * - reasoning ≡ reason (유형 전체 선정 이유)
 */

import { sanitizeCoachKoreanText } from "@/lib/coach/sanitizeCoachKorean";
import type { RespondentRole } from "@/lib/stages/fieldResearch/types";

export type SelectionCriterionDetail = {
  label: string;
  /** 이 대상(세그먼트)에 이 기준이 붙은 이유 */
  why: string;
};

export interface SelectionProfileFields {
  selectionCriteria: string[];
  criterionDetails: SelectionCriterionDetail[];
  reasoning: string;
}

/** 단순 인구통계 라벨 감지 — 구체성 테스트 분기용 */
const DEMOGRAPHIC_ONLY =
  /^(?:\d{1,2}\s*대(?:\s*[초중후]반)?(?:\s*[-~]\s*\d{1,2}\s*대(?:\s*[초중후]반)?)?|\d{2,3}\s*세(?:\s*[-~]\s*\d{2,3}\s*세)?|(?:남|여)성?|남자|여자)?\s*(?:직장인|회사원|주부|학생|대학생|취준생|자영업|프리랜서|공무원|학부모|엄마|아빠)?\s*$/u;

const AGE_BAND = /\d{1,2}\s*대|\d{2,3}\s*세/;
const ROLE_WORD =
  /직장인|회사원|주부|학생|대학생|취준생|자영업|프리랜서|공무원|학부모/;

export function normalizeSelectionCriteria(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const value of raw) {
    if (typeof value !== "string") continue;
    const text = sanitizeCoachKoreanText(value.trim()).slice(0, 40);
    if (!text || out.includes(text)) continue;
    out.push(text);
    if (out.length >= 5) break;
  }
  return out;
}

export function normalizeReasoning(raw: unknown, max = 360): string {
  if (typeof raw !== "string") return "";
  return sanitizeCoachKoreanText(raw.trim()).slice(0, max);
}

export function normalizeCriterionDetails(
  raw: unknown,
  fallbackLabels: string[] = [],
): SelectionCriterionDetail[] {
  const out: SelectionCriterionDetail[] = [];
  if (Array.isArray(raw)) {
    for (const item of raw) {
      if (typeof item === "string") {
        const label = sanitizeCoachKoreanText(item.trim()).slice(0, 40);
        if (label) out.push({ label, why: "" });
        continue;
      }
      if (!item || typeof item !== "object") continue;
      const o = item as Record<string, unknown>;
      const label = sanitizeCoachKoreanText(
        String(o.label ?? o.name ?? o.criterion ?? "").trim(),
      ).slice(0, 40);
      if (!label) continue;
      const why = normalizeReasoning(o.why ?? o.reason ?? o.rationale, 180);
      if (!out.some((d) => d.label === label)) out.push({ label, why });
      if (out.length >= 5) break;
    }
  }
  if (!out.length && fallbackLabels.length) {
    return fallbackLabels.map((label) => ({ label, why: "" }));
  }
  // labels 배열과 동기화
  if (fallbackLabels.length && out.length) {
    const byLabel = new Map(out.map((d) => [d.label, d]));
    return fallbackLabels.map(
      (label) => byLabel.get(label) ?? { label, why: "" },
    );
  }
  return out.slice(0, 5);
}

/** reason / reasoning / segmentationVariables / criterionDetails 별칭 수용 */
export function readSelectionProfile(
  raw: Record<string, unknown> | null | undefined,
): SelectionProfileFields {
  if (!raw) {
    return { selectionCriteria: [], criterionDetails: [], reasoning: "" };
  }
  const criteria = normalizeSelectionCriteria(
    raw.selectionCriteria ??
      raw.segmentationVariables ??
      raw.segmentation_variables ??
      raw.criteria ??
      raw.axes,
  );
  const criterionDetails = normalizeCriterionDetails(
    raw.criterionDetails ?? raw.criteriaDetails ?? raw.criterion_whys,
    criteria,
  );
  const labels = criterionDetails.length
    ? criterionDetails.map((d) => d.label)
    : criteria;
  const reasoning = normalizeReasoning(
    raw.reasoning ?? raw.reason ?? raw.selectionReason,
  );
  return {
    selectionCriteria: labels,
    criterionDetails:
      criterionDetails.length > 0
        ? criterionDetails
        : labels.map((label) => ({ label, why: "" })),
    reasoning,
  };
}

export function isDemographicOnlyLabel(text: string): boolean {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t || t.length > 40) return false;
  if (DEMOGRAPHIC_ONLY.test(t)) return true;
  const hasAge = AGE_BAND.test(t);
  const hasRole = ROLE_WORD.test(t);
  if (!hasAge && !hasRole) return false;
  if (
    /자취|동거|본가|결혼|혼인|대출|지원|소득|금융|육아|이직|프리랜스|거주지|부모/.test(
      t,
    )
  ) {
    return false;
  }
  return hasAge || (hasRole && t.split(" ").length <= 3);
}

export function demographicSpecificityCoachPrompt(domainHint?: string): string {
  const domain =
    domainHint?.trim() || "관련 도메인(예: 금융·자산·소비·주거)";
  return `연령대나 직업 외에 이 분들의 ${domain} 행동을 가르는 가장 결정적인 환경적 차이는 무엇일까요? 예를 들어 거주 형태(자취/본가)나 부모님의 경제적 지원 여부 같은 변수가 될 수 있어요.`;
}

export type SegmentationHypothesis = {
  id: string;
  label: string;
  selectionCriteria: string[];
  criterionDetails: SelectionCriterionDetail[];
  reasoning: string;
  confidence: "hypothesis";
};

function hyp(
  id: string,
  label: string,
  details: SelectionCriterionDetail[],
  reasoning: string,
): SegmentationHypothesis {
  return {
    id,
    label,
    selectionCriteria: details.map((d) => d.label),
    criterionDetails: details,
    reasoning,
    confidence: "hypothesis",
  };
}

/**
 * 카드(역할·라벨)마다 다른 선정 기준 가설.
 * 같은 가설 세트를 모든 카드에 쓰지 않는다.
 */
export function suggestHypothesesForTarget(
  problem: string,
  role: RespondentRole,
  targetLabel: string,
): SegmentationHypothesis[] {
  const p = problem.trim();
  const label = targetLabel.trim();
  const financial = /금융|자산|저축|투자|돈|월급|경제|사회\s*초년/.test(p);
  const early = /초반|입사\s*초기|사회\s*초년|첫\s*직장/.test(label);
  const late = /후반|경력|이직|결혼/.test(label);

  if (financial) {
    if (role === "heavy" || early) {
      return [
        hyp(
          "hyp-solo-early",
          "자취 · 부모 지원 거의 없음",
          [
            {
              label: "자취 유무",
              why: "주거비가 고정 지출이 되면 저축·투자 여력이 바로 갈려요.",
            },
            {
              label: "부모 경제 지원",
              why: "지원이 끊긴 초년은 금융 앱·가계부를 ‘생존 도구’로 쓰기 쉬워요.",
            },
            {
              label: "첫 월급·연차",
              why: "입사 초기는 금융 자아·습관이 막 생기는 극단 구간이에요.",
            },
          ],
          "Heavy: 스스로 생활비를 꾸리는 사회 초년의 금융 긴장을 깊게 보기 위한 가설이에요.",
        ),
        hyp(
          "hyp-loan-early",
          "학자금·생활비 대출이 있는 초년",
          [
            {
              label: "학자금·대출",
              why: "상환 압박이 소비·저축 우선순위를 강하게 규정해요.",
            },
            {
              label: "소득 대비 고정비",
              why: "월급 대비 고정비가 크면 ‘남는 돈’ 감각이 왜곡돼요.",
            },
          ],
          "대출 부담이 큰 쪽은 자산관리 니즈가 더 날카롭게 드러날 수 있어요. (가설)",
        ),
      ];
    }
    if (role === "light" || late) {
      return [
        hyp(
          "hyp-career-late",
          "이직·소득 변동이 있는 전환기",
          [
            {
              label: "고용 형태",
              why: "정규/계약/프리랜스에 따라 금융 상품 접근·위험이 달라요.",
            },
            {
              label: "소득 안정성",
              why: "변동 소득기에는 기존 저축 루틴이 깨지거나 새로 생겨요.",
            },
            {
              label: "이직 경험",
              why: "경력 중반은 ‘돈 관리를 다시 짜는’ 계기가 자주 와요.",
            },
          ],
          "Light/전환기: 금융 습관이 느슨해지거나 재정비되는 경계를 보려는 가설이에요.",
        ),
        hyp(
          "hyp-marriage-late",
          "결혼·동거를 앞둔 자산 합산 고민",
          [
            {
              label: "혼인·동거 계획",
              why: "공동 지출·공동 계좌 논의가 금융 니즈를 바꿉니다.",
            },
            {
              label: "부모 지원 변화",
              why: "지원이 줄거나 주택 자금으로 바뀌는 시점이 후반에 많아요.",
            },
          ],
          "생애 이벤트 직전은 금융 도구 사용이 급변하는 극단이에요. (가설)",
        ),
      ];
    }
    return [
      hyp(
        "hyp-family-control",
        "가족과 동거 · 일부 지원",
        [
          {
            label: "동거 여부",
            why: "주거비가 낮으면 투자·소비 실험 여지가 달라 양 끝과 대비돼요.",
          },
          {
            label: "부모 경제 지원",
            why: "부분 지원은 ‘자립’과 ‘의존’ 사이 기준선이 됩니다.",
          },
          {
            label: "혼인 여부",
            why: "미혼·동거 여부가 가계 단위를 갈라 대조에 좋아요.",
          },
        ],
        "대조군: Heavy/Light와 비교해 무엇이 특이한지 가늠하는 기준선 가설이에요.",
      ),
    ];
  }

  if (role === "secondary") {
    if (financial) {
      return [
        hyp(
          "hyp-secondary-fin",
          "직장 동료·커뮤니티에서 금융을 함께 배우는 쪽",
          [
            {
              label: "또래 영향",
              why: "극단만큼은 아니어도 또래 규범이 저축·투자 시작을 밀어요.",
            },
            {
              label: "금융 학습 채널",
              why: "커뮤니티·인플루언서로 배우는 패턴은 양 끝과 다른 니즈를 보여요.",
            },
          ],
          "2순위: 극단 다음으로 면접 가치가 큰 ‘사회적 학습’ 그룹 가설이에요.",
        ),
        hyp(
          "hyp-secondary-goal",
          "구체적 목표(여행·이직·내 집)로 돈을 모으는 쪽",
          [
            {
              label: "목표 저축",
              why: "목표가 있으면 도구 사용이 뚜렷해 잠재 니즈가 읽혀요.",
            },
            {
              label: "계획 기간",
              why: "단기·중기 목표가 Heavy/Light와 다른 리듬을 만들어요.",
            },
          ],
          "2순위: 목표 지향 저축 그룹으로 극단 사례를 보완하는 가설이에요.",
        ),
      ];
    }
    return [
      hyp(
        "hyp-secondary-gen",
        "문제를 가끔 겪지만 대안을 적극 찾는 쪽",
        [
          {
            label: "문제 경험 빈도",
            why: "중간 빈도라도 대안 탐색이 활발하면 니즈가 잘 보여요.",
          },
          {
            label: "대안 탐색",
            why: "극단이 아니어도 ‘해결을 찾는 행동’이 인사이트 원천이에요.",
          },
        ],
        "2순위: 양 극단을 보완하는 중간·능동 그룹 가설이에요.",
      ),
    ];
  }

  if (role === "heavy") {
    return [
      hyp(
        "hyp-freq-high",
        "문제를 가장 자주·깊게 겪는 쪽",
        [
          {
            label: "문제 경험 빈도",
            why: "빈도가 높을수록 우회 행동·도구가 쌓여 잠재 니즈가 보여요.",
          },
          {
            label: "생활 맥락",
            why: "문제가 터지는 일상 장면이 Heavy를 정의해요.",
          },
        ],
        "Heavy 극단을 잡기 위한 가설이에요.",
      ),
    ];
  }
  if (role === "light") {
    return [
      hyp(
        "hyp-freq-low",
        "거의 안 겪거나 우회하는 쪽",
        [
          {
            label: "문제 경험 빈도",
            why: "안 겪는 이유를 알면 보편의 경계를 그을 수 있어요.",
          },
          {
            label: "대안 행동",
            why: "다른 우회가 있으면 니즈가 ‘없음’이 아니라 ‘다른 해법’일 수 있어요.",
          },
        ],
        "Light 극단을 잡기 위한 가설이에요.",
      ),
    ];
  }
  return [
    hyp(
      "hyp-control",
      "비슷한 역할의 일반 대조군",
      [
        {
          label: "역할 유사성",
          why: "역할이 비슷해야 양 끝과의 차이를 공정히 비교해요.",
        },
        {
          label: "문제 비핵심",
          why: "극단이 아닌 중간 사례가 기준선이 됩니다.",
        },
      ],
      "대조군 기준선 가설이에요.",
    ),
  ];
}

/** @deprecated 역할 무시 공통 목록 — suggestHypothesesForTarget 사용 */
export function suggestSegmentationHypotheses(
  problem: string,
): SegmentationHypothesis[] {
  return suggestHypothesesForTarget(problem, "heavy", "");
}

const CRITERIA_HINTS: Array<{ pattern: RegExp; chip: string }> = [
  { pattern: /자취|혼자\s*살/, chip: "자취 유무" },
  { pattern: /본가|부모\s*집|동거|같이\s*살/, chip: "동거·본가 여부" },
  { pattern: /결혼|혼인|미혼|비혼/, chip: "혼인 여부" },
  { pattern: /부모.{0,6}지원|용돈|경제적\s*지원/, chip: "부모 경제 지원" },
  { pattern: /학자금|대출/, chip: "학자금·대출" },
  { pattern: /이직|프리랜스|계약직|정규직/, chip: "고용 형태" },
  { pattern: /월급|소득|연봉/, chip: "소득 안정성" },
  { pattern: /남성|여성|남자|여자|성별/, chip: "성별" },
  { pattern: /거주지|수도권|지방|서울/, chip: "거주지" },
];

export function extractSelectionProfileFromUtterance(
  text: string,
): SelectionProfileFields | null {
  const t = text.trim();
  if (t.length < 8) return null;
  const selectionCriteria = CRITERIA_HINTS.filter((h) => h.pattern.test(t)).map(
    (h) => h.chip,
  );
  if (!selectionCriteria.length && !isDemographicOnlyLabel(t)) {
    if (t.length < 20) return null;
    return {
      selectionCriteria: ["생활 맥락"],
      criterionDetails: [
        {
          label: "생활 맥락",
          why: "말씀하신 상황이 행동을 가르는 변수로 보여요.",
        },
      ],
      reasoning: `${t.slice(0, 160)}${t.length > 160 ? "…" : ""} (가설)`,
    };
  }
  if (!selectionCriteria.length) return null;
  return {
    selectionCriteria: selectionCriteria.slice(0, 5),
    criterionDetails: selectionCriteria.slice(0, 5).map((label) => ({
      label,
      why: "대화에서 반복·강조된 구분이에요. (가설)",
    })),
    reasoning: `말씀하신 맥락(${selectionCriteria.join(" · ")})이 행동을 가르는 변수로 보여요. (가설)`,
  };
}

/** 총 인원을 세그먼트/카드 인원 비율로 재분배 (최소 1명 유지 시 여유분부터) */
export function redistributeCounts(counts: number[], total: number): number[] {
  const n = counts.length;
  if (n === 0) return [];
  const safeTotal = Math.max(n, Math.min(30, Math.round(total)));
  const currentSum = counts.reduce((a, b) => a + Math.max(0, b), 0) || n;
  const raw = counts.map((c) =>
    Math.max(1, Math.round((Math.max(0, c) / currentSum) * safeTotal)),
  );
  let sum = raw.reduce((a, b) => a + b, 0);
  // 합 맞추기
  let i = 0;
  while (sum > safeTotal && i < 100) {
    const idx = i % n;
    if (raw[idx]! > 1) {
      raw[idx]! -= 1;
      sum -= 1;
    }
    i += 1;
  }
  i = 0;
  while (sum < safeTotal && i < 100) {
    raw[i % n]! += 1;
    sum += 1;
    i += 1;
  }
  return raw;
}
