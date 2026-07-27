import type { PrePmfOverviewData } from "@/lib/stages/stage2/prePmfOverview";
import {
  prePmfPersonDisplayName,
  prePmfPersonDisplayLabels,
} from "@/lib/stages/stage2/prePmfOverview";
import { COACH_KOREAN_LABEL_RULE, sanitizeCoachKoreanText } from "@/lib/coach/sanitizeCoachKorean";
import { readSelectionProfile } from "@/lib/stages/fieldResearch/selectionProfile";
import type { SelectionCriterionDetail } from "@/lib/stages/fieldResearch/selectionProfile";
import { normalizeRespondentRole } from "@/lib/stages/fieldResearch/extremeUserRole";
import {
  ensureTopicQuestionsCoverage,
  heuristicTopicInterviewQuestions,
  normalizeTopicInterviewQuestions,
  type TopicInterviewQuestion,
} from "@/lib/stages/fieldResearch/topicInterviewQuestions";
import type {
  FieldResearchData,
  ResearchMethodId,
  RespondentRole,
} from "@/lib/stages/fieldResearch/types";
import {
  getDtFieldResearchCatalog,
  isDtFieldResearchMethod,
} from "@/lib/stages/fieldResearch/researchMethodCatalog";

export type Stage3ResearchPath = "field_interview";
export type Stage3GuideMethodTab = "shadowing" | "home_visit_in_depth";

function normalizeMethodIds(raw: unknown): ResearchMethodId[] {
  if (!Array.isArray(raw)) return [];
  const out: ResearchMethodId[] = [];
  for (const value of raw) {
    if (typeof value !== "string") continue;
    const id = value.trim() as ResearchMethodId;
    if (!isDtFieldResearchMethod(id) || out.includes(id)) continue;
    out.push(id);
  }
  return out;
}

function normalizeMethodRationales(
  raw: unknown,
): Partial<Record<ResearchMethodId, string>> {
  if (!raw || typeof raw !== "object") return {};
  const out: Partial<Record<ResearchMethodId, string>> = {};
  for (const [key, value] of Object.entries(raw as Record<string, unknown>)) {
    const id = key.trim() as ResearchMethodId;
    if (!isDtFieldResearchMethod(id)) continue;
    if (typeof value !== "string") continue;
    const text = sanitizeCoachKoreanText(value.trim()).slice(0, 240);
    if (text) out[id] = text;
  }
  return out;
}

export interface Stage3ResearchSegment {
  id: string;
  label: string;
  recommendedCount: number;
  selectedCount: number;
  selectionCriteria: string[];
  criterionDetails: SelectionCriterionDetail[];
  reasoning: string;
  /** @deprecated reasoning과 동일 — 하위 호환 */
  reason: string;
  role?: RespondentRole;
}

export interface Stage3ResearchPrep {
  /** AI가 문제에 맞춰 추천한 리서치 방법 */
  recommendedMethods: ResearchMethodId[];
  /** 사용자가 최종 선택한 리서치 방법 */
  selectedMethods: ResearchMethodId[];
  /** 방법 추천 이유(코치 한 줄) */
  methodRecommendationReason: string;
  /** 방법별 적합 이유 — 왜 이 방법이 이 문제에 맞는지(방법 id → 한 문장) */
  methodRationales: Partial<Record<ResearchMethodId, string>>;
  recommendedParticipantCount: number;
  /** 권장 인원이 이렇게 결정된 이유(코치 한 줄) */
  participantCountReason: string;
  selectedParticipantCount: number;
  segments: Stage3ResearchSegment[];
  keyQuestionGuides: string[];
  /** 주제(문제 정의)와 직결된 대상자별 확인 질문 — To-know 표에 반영 */
  topicQuestions: TopicInterviewQuestion[];
  selectedPath: Stage3ResearchPath;
  activeGuideMethod: Stage3GuideMethodTab;
  recommendationsGenerated: boolean;
}

export function emptyStage3ResearchPrep(): Stage3ResearchPrep {
  return {
    recommendedMethods: [],
    selectedMethods: [],
    methodRecommendationReason: "",
    methodRationales: {},
    recommendedParticipantCount: 5,
    participantCountReason: "",
    selectedParticipantCount: 5,
    segments: [],
    keyQuestionGuides: [],
    topicQuestions: [],
    selectedPath: "field_interview",
    activeGuideMethod: "shadowing",
    recommendationsGenerated: false,
  };
}

function clip(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return sanitizeCoachKoreanText(value.trim()).slice(0, max);
}

function normalizeCriteria(raw: unknown): string[] {
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

function normalizeSegment(raw: unknown, index: number): Stage3ResearchSegment | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const label = clip(o.label, 100);
  if (!label) return null;
  const recommendedCount = Math.min(
    20,
    Math.max(0, Math.round(Number(o.recommendedCount) || 0)),
  );
  const selectedCount = Math.min(
    20,
    Math.max(0, Math.round(Number(o.selectedCount) || recommendedCount || 1)),
  );
  const profile = readSelectionProfile(o);
  const reasoning = profile.reasoning;
  const role = normalizeRespondentRole(o.role) ?? undefined;
  return {
    id: clip(o.id, 40) || `seg-${index}-${label.slice(0, 8)}`,
    label,
    recommendedCount: recommendedCount || 1,
    selectedCount: selectedCount || recommendedCount || 1,
    selectionCriteria: profile.selectionCriteria,
    criterionDetails: profile.criterionDetails,
    reasoning,
    reason: reasoning,
    role,
  };
}

/** 세그먼트 간 선정 기준이 동일하면 역할을 기준으로 살짝 분화 (후처리) */
function diversifyIdenticalCriteria(
  segments: Stage3ResearchSegment[],
): Stage3ResearchSegment[] {
  if (segments.length < 2) return segments;
  const key = (s: Stage3ResearchSegment) =>
    [...s.selectionCriteria].sort().join("|");
  const groups = new Map<string, number[]>();
  segments.forEach((s, i) => {
    const k = key(s);
    if (!k) return;
    const list = groups.get(k) ?? [];
    list.push(i);
    groups.set(k, list);
  });
  const next = segments.map((s) => ({ ...s }));
  for (const indexes of groups.values()) {
    if (indexes.length < 2) continue;
    indexes.forEach((idx, order) => {
      const seg = next[idx]!;
      const role =
        seg.role ??
        (order === 0
          ? "heavy"
          : order === 1
            ? "light"
            : order === 2
              ? "secondary"
              : "control");
      const suffix =
        role === "heavy"
          ? "경험 빈도(많음)"
          : role === "light"
            ? "경험 빈도(적음)"
            : role === "secondary"
              ? "2순위 보완"
              : "중간 대비";
      if (!seg.selectionCriteria.includes(suffix)) {
        seg.selectionCriteria = [...seg.selectionCriteria, suffix].slice(0, 5);
        seg.criterionDetails = [
          ...seg.criterionDetails,
          {
            label: suffix,
            why:
              role === "heavy"
                ? "같은 겉라벨이라도 경험 강도가 높은 쪽을 Heavy로 분리해요."
                : role === "light"
                  ? "같은 겉라벨이라도 경험이 적은 쪽을 Light로 분리해요."
                  : role === "secondary"
                    ? "양 극단 다음으로 면접 가치가 있어 2순위로 보완해요."
                    : "양 끝과 비교할 중간 기준선이에요.",
          },
        ].slice(0, 5);
      }
      if (!seg.reasoning.trim()) {
        seg.reasoning = `${seg.label}은(는) ${suffix} 관점에서 나눠 본 가설이에요.`;
        seg.reason = seg.reasoning;
      }
    });
  }
  return next;
}

export function normalizeStage3ResearchPrep(
  raw: unknown,
): Stage3ResearchPrep {
  const base = emptyStage3ResearchPrep();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<Stage3ResearchPrep>;
  const segments = diversifyIdenticalCriteria(
    Array.isArray(o.segments)
      ? o.segments
          .map((s, idx) => normalizeSegment(s, idx))
          .filter((s): s is Stage3ResearchSegment => s !== null)
          .slice(0, 6)
      : [],
  );
  const keyQuestionGuides = Array.isArray(o.keyQuestionGuides)
    ? o.keyQuestionGuides
        .filter((q): q is string => typeof q === "string" && q.trim().length > 0)
        .map((q) => sanitizeCoachKoreanText(q.trim()).slice(0, 240))
        .slice(0, 6)
    : [];
  const topicQuestions = normalizeTopicInterviewQuestions(o.topicQuestions);
  const recommendedParticipantCount = Math.min(
    30,
    Math.max(
      1,
      Math.round(Number(o.recommendedParticipantCount) || base.recommendedParticipantCount),
    ),
  );
  const selectedParticipantCount = Math.min(
    30,
    Math.max(
      1,
      Math.round(Number(o.selectedParticipantCount) || recommendedParticipantCount),
    ),
  );
  const selectedPath: Stage3ResearchPath = "field_interview";
  const activeGuideMethod =
    o.activeGuideMethod === "home_visit_in_depth" ? "home_visit_in_depth" : "shadowing";
  let recommendedMethods = normalizeMethodIds(o.recommendedMethods);
  if (!recommendedMethods.length && o.recommendationsGenerated === true) {
    recommendedMethods = ["home_visit_in_depth", "shadowing"];
  }
  const selectedMethods = normalizeMethodIds(o.selectedMethods);
  const rationales = normalizeMethodRationales(o.methodRationales);
  const filteredRationales: Partial<Record<ResearchMethodId, string>> = {};
  for (const id of recommendedMethods) {
    if (rationales[id]) filteredRationales[id] = rationales[id];
  }

  return {
    recommendedMethods,
    // 추천 방법만 사용 — 선택은 항상 추천 방법과 동일하게 유지
    selectedMethods: selectedMethods.length ? selectedMethods : recommendedMethods,
    methodRecommendationReason: clip(o.methodRecommendationReason, 240),
    methodRationales: filteredRationales,
    recommendedParticipantCount,
    participantCountReason: clip(o.participantCountReason, 240),
    selectedParticipantCount,
    segments,
    keyQuestionGuides,
    topicQuestions,
    selectedPath,
    activeGuideMethod,
    recommendationsGenerated: o.recommendationsGenerated === true,
  };
}

export function migratePrepWorkflowPhase(
  _raw: unknown,
): FieldResearchData["prepWorkflowPhase"] {
  // To-know list를 조사 계획 세우기 CORE 3로 통합 — 단일 research_prep 단계로 운영
  return "research_prep";
}

export function researchPrepGatePassed(prep: Stage3ResearchPrep): boolean {
  return (
    prep.recommendationsGenerated &&
    prep.selectedMethods.length >= 1 &&
    prep.selectedParticipantCount >= 1
  );
}

/** 권장 인원 결정 이유 — AI/휴리스틱 값이 없으면 인원·세그먼트 기반 기본 문구 */
export function participantCountReasonText(prep: Stage3ResearchPrep): string {
  const reason = prep.participantCountReason?.trim() ?? "";
  if (reason) return reason;
  const count = prep.recommendedParticipantCount ?? 5;
  const segCount = prep.segments?.length ?? 0;
  if (segCount > 1) {
    return `정성 조사는 5~8명이면 반복되는 행동 패턴이 드러나요. ${segCount}개 세그먼트를 비교·대조하려고 세그먼트별 인원을 합쳐 총 ${count}명을 권장해요.`;
  }
  return `정성 조사는 5명 안팎이면 반복되는 행동 패턴이 충분히 드러나므로, 깊이 있는 인터뷰가 가능한 ${count}명을 권장해요.`;
}

export function totalSelectedFromSegments(prep: Stage3ResearchPrep): number {
  if (!prep.segments.length) return prep.selectedParticipantCount;
  return prep.segments.reduce((sum, s) => sum + Math.max(0, s.selectedCount), 0);
}

export function heuristicResearchPrep(
  problem: string,
  pre: PrePmfOverviewData,
): Stage3ResearchPrep {
  const problemLower = problem.toLowerCase();
  const looksFinancial =
    /금융|자산|저축|투자|돈|월급|경제|자취|사회\s*초년/.test(problem) ||
    /finance|asset|money/.test(problemLower);

  const targets = pre.targetUsers.filter(
    (u, i) => prePmfPersonDisplayName(u, i, "타겟").trim() || u.reason.trim(),
  );

  const withProfile = (
    seg: Omit<Stage3ResearchSegment, "reason" | "reasoning" | "criterionDetails"> & {
      reason: string;
      criterionDetails?: SelectionCriterionDetail[];
    },
  ): Stage3ResearchSegment => {
    const criterionDetails =
      seg.criterionDetails ??
      seg.selectionCriteria.map((label) => ({ label, why: "" }));
    return {
      ...seg,
      criterionDetails,
      reasoning: seg.reason,
      reason: seg.reason,
    };
  };

  let segments: Stage3ResearchSegment[] = targets.slice(0, 4).map((user, idx) => {
    const label = prePmfPersonDisplayName(user, idx, "타겟");
    const count = idx === 0 ? 3 : idx === 1 ? 2 : 1;
    const fromReason = user.reason.trim();
    const reason =
      fromReason.slice(0, 280) ||
      "2단계 사전 조사에서 정리한 타겟을, 문제와 맞닿는 생활·직업 맥락으로 나눠 조사해요.";
    return withProfile({
      id: `seg-${idx}-${label.slice(0, 6)}`,
      label,
      recommendedCount: count,
      selectedCount: count,
      selectionCriteria: fromReason
        ? ["사전 조사 타겟 구분"]
        : ["직업", "생활 맥락"],
      reason,
      role: idx === 0 ? "heavy" : idx === 1 ? "light" : "control",
    });
  });

  type SegDraft = Omit<
    Stage3ResearchSegment,
    "reason" | "reasoning" | "criterionDetails"
  > & { reason: string; reasoning?: string };

  if (!segments.length && looksFinancial) {
    const drafts: SegDraft[] = [
      {
        id: "seg-solo-no-support",
        label: "자취 · 부모 경제 지원 거의 없는 사회 초년생",
        recommendedCount: 2,
        selectedCount: 2,
        selectionCriteria: ["자취 유무", "부모 경제 지원", "직장 연차"],
        reason:
          "금융 자아·자산 관리는 주거비 부담과 부모 지원 여부에 따라 저축·소비 패턴이 크게 갈려요. 자취하면서 스스로 생활비를 꾸리는 쪽을 먼저 깊게 봐요.",
        role: "heavy",
      },
      {
        id: "seg-career-shift",
        label: "이직·프리랜스 전환기 직장인",
        recommendedCount: 2,
        selectedCount: 2,
        selectionCriteria: ["고용 형태", "소득 안정성", "금융 도구 사용"],
        reason:
          "소득이 불안정해지는 전환기는 금융 앱·가계부 습관이 깨지거나 새로 생기는 순간이에요. 극단 사례로 보편 패턴을 찾으려고 소수를 넣어요.",
        role: "light",
      },
      {
        id: "seg-peer-learn",
        label: "또래 커뮤니티로 금융을 배우는 사회 초년생",
        recommendedCount: 1,
        selectedCount: 1,
        selectionCriteria: ["또래 영향", "금융 학습 채널"],
        reason:
          "양 극단 다음으로, 사회적 학습이 저축·투자 시작을 미는 2순위 그룹이에요. 극단만큼 강하지 않아도 니즈가 잘 드러나요.",
        role: "secondary",
      },
      {
        id: "seg-family-support",
        label: "가족과 동거 · 일부 지원을 받는 사회 초년생",
        recommendedCount: 1,
        selectedCount: 1,
        selectionCriteria: ["동거 여부", "부모 경제 지원", "혼인 여부"],
        reason:
          "같은 연령·직장이라도 동거·지원이 있으면 위험 감수·투자 시작 시점이 달라져요. 양 끝과 비교할 대조군이에요.",
        role: "control",
      },
    ];
    segments = drafts.map((d) => withProfile(d));
  } else if (!segments.length) {
    const drafts: SegDraft[] = [
      {
        id: "seg-default",
        label: "문제를 가장 자주 겪는 핵심 이용자",
        recommendedCount: 2,
        selectedCount: 2,
        selectionCriteria: ["문제 경험 빈도", "직업·역할"],
        reason:
          "문제 정의와 가장 맞닿은 일상·역할을 기준으로 핵심 이용자를 먼저 깊이 조사해요.",
        role: "heavy",
      },
      {
        id: "seg-contrast-light",
        label: "거의 안 겪거나 우회하는 이용자",
        recommendedCount: 2,
        selectedCount: 2,
        selectionCriteria: ["문제 경험 빈도", "대안 행동"],
        reason:
          "Light 극단으로, 왜 덜 겪는지·어떻게 우회하는지를 봐요.",
        role: "light",
      },
      {
        id: "seg-secondary",
        label: "가끔 겪지만 대안을 적극 찾는 이용자",
        recommendedCount: 1,
        selectedCount: 1,
        selectionCriteria: ["대안 탐색", "문제 경험 빈도"],
        reason:
          "양 극단 다음 2순위 — 중간 빈도라도 해결을 찾는 행동이 활발한 그룹이에요.",
        role: "secondary",
      },
    ];
    segments = drafts.map((d) => withProfile(d));
  }

  segments = segments.map((s) =>
    withProfile({
      ...s,
      reason: s.reason || s.reasoning,
      criterionDetails:
        s.criterionDetails?.length
          ? s.criterionDetails
          : s.selectionCriteria.map((label) => ({
              label,
              why: `${s.label}에게 이 축이 행동을 가르는 이유로 보여요. (가설)`,
            })),
    }),
  );

  const recommendedParticipantCount = Math.max(
    5,
    segments.reduce((sum, s) => sum + s.recommendedCount, 0),
  );
  const participantCountReason =
    segments.length > 1
      ? `정성 조사는 5~8명이면 반복되는 행동 패턴이 드러나요. ${segments.length}개 세그먼트를 선정 기준으로 비교·대조하려고 세그먼트별 인원을 합쳐 총 ${recommendedParticipantCount}명을 권장해요.`
      : `정성 조사는 5명 안팎이면 반복되는 행동 패턴이 충분히 드러나므로, 깊이 있는 인터뷰가 가능한 ${recommendedParticipantCount}명을 권장해요.`;
  const problemHint = problem.trim().slice(0, 80);
  const keyQuestionGuides = [
    problemHint
      ? `최근에 「${problemHint}」와 비슷한 상황을 겪은 적이 있나요? 그때 어떻게 대처했나요?`
      : "최근에 비슷한 문제를 겪은 적이 있나요? 그때 어떻게 대처했나요?",
    "그 순간 가장 답답했던 점은 무엇이었나요?",
    "지금 쓰는 대안이나 우회 방법이 있다면, 왜 그걸 계속 쓰고 있나요?",
  ];
  const topicQuestions = ensureTopicQuestionsCoverage(
    problem,
    heuristicTopicInterviewQuestions(problem),
  );

  const recommendedMethods: ResearchMethodId[] = [
    "home_visit_in_depth",
    "shadowing",
  ];

  return {
    recommendedMethods,
    selectedMethods: recommendedMethods,
    methodRecommendationReason:
      "사용자 환경·도구·행동을 함께 봐야 하므로, 직접 찾아가 대화하는 인뎁스 인터뷰와 행동을 관찰하는 섀도잉 조합을 추천해요.",
    methodRationales: {
      home_visit_in_depth:
        "사용자의 실제 환경에서 1:1로 깊게 대화해야 맥락·습관·감정을 함께 들으며 문제의 근본 원인(Why)을 파악할 수 있어요.",
      shadowing:
        "말로는 설명하지 못하는 행동과 우회 방식을 직접 관찰해, 겉으로 드러나지 않는 잠재 니즈의 단서를 잡을 수 있어요.",
    },
    recommendedParticipantCount,
    participantCountReason,
    selectedParticipantCount: recommendedParticipantCount,
    segments,
    keyQuestionGuides,
    topicQuestions,
    selectedPath: "field_interview",
    activeGuideMethod: "home_visit_in_depth",
    recommendationsGenerated: true,
  };
}

export function buildResearchPrepPrompt(
  problem: string,
  prePmfSummary: string,
  targetLabels: string[],
): string {
  const methodCatalog = getDtFieldResearchCatalog()
    .map((m) => `- ${m.id} (${m.label}): ${m.summary}`)
    .join("\n");

  return `
당신은 사용자 조사 준비 코치입니다. 1·2단계 문제 정의와 사전 조사를 바탕으로, 문제에 맞는 리서치 방법·조사 대상·인원·핵심 질문 가이드를 한국어로 제안합니다.

규칙:
- 모든 내용은 **가설**이며 존댓말(~해요/~예요)로 씁니다.
${COACH_KOREAN_LABEL_RULE}
- recommendedMethods: 아래 **Design Thinking 공감(Empathize) 리서치 방법 id** 중 문제에 가장 적합한 1~3개만 고릅니다.
- **설문(survey)·데스크리서치(desk_research)·FGD(fgd)·기타(other)는 절대 추천하지 않습니다.**
- methodRecommendationReason: 왜 그 방법 조합이 이 문제에 맞는지 한 문장.
- methodRationales: recommendedMethods **각각의 id를 키**로, "왜 이 방법이 이 문제·타겟에 적합한지"를 문제 맥락과 연결해 한 문장씩 씁니다.
- recommendedParticipantCount: 총 권장 인원 (보통 5~8명, B2B는 3~6명도 가능)
- participantCountReason: 왜 그 인원이 적정한지 한 문장 (정성 조사 특성·세그먼트 수·B2B 등 문제 맥락과 연결)
- segments: 3~5개. Extreme User 스펙트럼으로 배치합니다. **나이대만으로 나누지 마세요.** (「20대 초반 직장인 / 20대 후반 직장인」처럼 연령 밴드만 다른 분할은 금지)
  - label: 문제와 직결된 **구체적 속성 조합**(자취·부모 지원·혼인·소득 안정성 등). 연령만 바꾼 라벨 금지.
  - role: "heavy" | "light" | "secondary" | "control".
    - heavy·light: **1순위 양 극단** (필수, 각 최소 1개)
    - secondary: **2순위 후보** — 극단 다음으로 면접·관찰 가치가 큰 그룹 (필수 1~2개)
    - control: 대조군 기준선 (0~1개, 선택)
  - selectionCriteria: 세그먼트마다 **서로 다른** 구분 축 2~4개. 두 세그먼트가 같은 칩 목록을 공유하면 안 됩니다.
  - criterionDetails: selectionCriteria 각 항목에 대해 {label, why} — **이 대상에게 왜 이 기준이 붙는지** 한 문장. 유형 공통 문구 복붙 금지.
  - recommendedCount: 세그먼트별 인원 (합 = recommendedParticipantCount). 1순위(heavy+light)에 더 많은 인원을 배분하고, secondary는 그보다 적게.
  - reason / reasoning: 유형 전체 선정 이유 1~2문장 + 위 기준들과 연결. secondary에는 「왜 극단 다음 우선순위인지」를 명시.
- keyQuestionGuides: 과거 행동·맥락을 묻는 질문 3~4개. **문제 정의 속 구체 소재(도메인 명사)를 질문 안에 직접 포함**합니다. (미래 가정·솔루션 검증 질문 금지)
- topicQuestions: 실제로 물어볼 인터뷰 질문 가이드. {category, question} 형태로 **15~18개** 만듭니다. 조사 대상 모두에게 동일하게 묻고 극단 사용자 간 답변을 비교하는 단일 가이드이므로, 대상별로 나누지 않습니다 (subject 필드 없음).
  - category는 "사용자" | "현재 문제" | "행동 & 맥락" | "기존 솔루션" | "동기 & 목표". **5개 카테고리를 모두 쓰고, 카테고리당 3~4개**를 배분합니다.
  - **모든 질문에 문제 정의 속 구체 소재(도메인 명사·상황)를 직접 넣습니다.** 예: 금융 주제라면 월급·저축·가계부·금융 앱 등. 「평소 하루를 어떻게 보내시나요?」 「일상에서 무엇을 가장 중요하게 여기시나요?」처럼 어느 주제에나 통하는 일반 질문은 금지.
  - 과거의 실제 행동·경험·감정을 묻습니다(최근 언제·어떤 상황·어떻게). 미래 가정·솔루션 검증 질문 금지.
  - 경험이 적은 응답자(라이트·초보)도, 많은 응답자(헤비)도 답할 수 있게 특정 서비스·경력을 전제하지 않는 표현을 씁니다.
  - 응답자에게 직접 존댓말로 묻는 문장으로, 물음표로 끝냅니다.
- JSON만 출력

Design Thinking 공감 리서치 방법 (이 목록만 사용):
${methodCatalog}

문제 정의:
${problem || "(없음)"}

사전 조사 요약:
${prePmfSummary || "(없음)"}

타겟 힌트: ${targetLabels.join(" · ") || "(없음)"}

출력 형식:
{"recommendedMethods":["home_visit_in_depth","shadowing"],"methodRecommendationReason":"...","methodRationales":{"home_visit_in_depth":"...","shadowing":"..."},"recommendedParticipantCount":6,"participantCountReason":"...","segments":[{"label":"자취·부모 지원 거의 없는 사회 초년생","role":"heavy","selectionCriteria":["자취 유무","부모 경제 지원","첫 월급·연차"],"criterionDetails":[{"label":"자취 유무","why":"주거비가 저축 여력을 바로 가릅니다."},{"label":"부모 경제 지원","why":"지원이 없으면 금융 도구를 생존형으로 씁니다."},{"label":"첫 월급·연차","why":"입사 초기는 금융 습관이 생기는 극단입니다."}],"recommendedCount":2,"reason":"...","reasoning":"..."},{"label":"소득 변동이 큰 이직·프리랜스 전환기","role":"light","selectionCriteria":["고용 형태","소득 안정성","이직 경험"],"criterionDetails":[{"label":"고용 형태","why":"고용 형태에 따라 금융 접근이 달라집니다."},{"label":"소득 안정성","why":"변동기에는 저축 루틴이 깨지거나 재정비됩니다."},{"label":"이직 경험","why":"경력 전환은 돈 관리를 다시 짜는 계기입니다."}],"recommendedCount":2,"reason":"...","reasoning":"..."},{"label":"또래 커뮤니티로 금융을 배우는 사회 초년생","role":"secondary","selectionCriteria":["또래 영향","금융 학습 채널"],"criterionDetails":[{"label":"또래 영향","why":"극단 다음으로 또래 규범이 행동을 밉니다."},{"label":"금융 학습 채널","why":"커뮤니티 학습은 양 끝과 다른 니즈를 보여 줍니다."}],"recommendedCount":1,"reason":"양 극단 다음 2순위 후보예요.","reasoning":"양 극단 다음 2순위 후보예요."},{"label":"가족과 동거·일부 지원을 받는 초년 직장인","role":"control","selectionCriteria":["동거 여부","부모 경제 지원","혼인 여부"],"criterionDetails":[{"label":"동거 여부","why":"주거비 부담이 낮아 Heavy와 대비됩니다."},{"label":"부모 경제 지원","why":"부분 지원이 자립·의존의 기준선이 됩니다."},{"label":"혼인 여부","why":"가계 단위 차이를 대조하는 데 필요합니다."}],"recommendedCount":1,"reason":"...","reasoning":"..."}],"keyQuestionGuides":["..."],"topicQuestions":[{"category":"사용자","question":"월급이 들어온 날 가장 먼저 하시는 일과 그다음 순서는 무엇인가요?"},{"category":"사용자","question":"금융 관련 정보는 주로 어디서, 어떤 계기로 찾아보시나요? 최근 사례를 들어 주실 수 있나요?"},{"category":"사용자","question":"한 달 생활비 중 가장 먼저 빠져나가는 항목은 무엇이고, 그다음 우선순위는 어떻게 정하시나요?"},{"category":"현재 문제","question":"가장 최근 월급을 받은 뒤 저축과 소비를 나누다가 막막했던 순간은 언제였고, 그때 어떻게 하셨나요?"},{"category":"현재 문제","question":"저축이나 투자를 시작해야겠다고 느꼈지만 실제로 못 했던 경험이 있다면, 무엇이 발목을 잡았나요?"},{"category":"현재 문제","question":"돈 관리와 관련해 최근 한 달 동안 가장 신경 쓰였던 일은 무엇이었나요?"},{"category":"행동 & 맥락","question":"월급일부터 다음 월급 전까지 돈과 관련해 실제로 하시는 행동을 순서대로 들려주실 수 있나요?"},{"category":"행동 & 맥락","question":"가계부·뱅킹 앱·엑셀 등 직접 만들어 쓰시는 돈 관리 방법이 있다면 어떻게 쓰고 계신가요?"},{"category":"행동 & 맥락","question":"돈 이야기를 주로 누구와 나누시나요? 최근에는 어떤 이야기를 하셨나요?"},{"category":"기존 솔루션","question":"지금 쓰시는 가계부·금융 앱은 무엇이고, 계속 쓰는 이유와 아쉬운 점은 각각 무엇인가요?"},{"category":"기존 솔루션","question":"예전에 가계부나 저축 챌린지 등을 시도했다 그만두신 적이 있다면, 어떤 순간에 왜 그만두셨나요?"},{"category":"기존 솔루션","question":"저축·소비 결정을 내리기 직전에 마지막으로 참고하는 정보나 기준은 무엇인가요?"},{"category":"동기 & 목표","question":"자산 관리가 자리 잡으면 1년 뒤 어떤 모습이길 바라시나요? 그게 왜 중요한가요?"},{"category":"동기 & 목표","question":"부모님이나 또래와 돈 이야기를 할 때, 말로는 안 꺼내지만 속으로 바라시는 것이 있다면 무엇인가요?"},{"category":"동기 & 목표","question":"돈 관리에서 「이것만은 지키고 싶다」 하는 본인만의 원칙이 있다면 무엇인가요?"}]}
`.trim();
}

export function parseResearchPrepJson(text: string): Partial<Stage3ResearchPrep> | null {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    const segments = diversifyIdenticalCriteria(
      Array.isArray(parsed.segments)
        ? parsed.segments
            .map((s, idx) => normalizeSegment(s, idx))
            .filter((s): s is Stage3ResearchSegment => s !== null)
        : [],
    );
    const keyQuestionGuides = Array.isArray(parsed.keyQuestionGuides)
      ? parsed.keyQuestionGuides
          .filter((q): q is string => typeof q === "string" && q.trim().length > 0)
          .map((q) => sanitizeCoachKoreanText(q.trim()).slice(0, 240))
      : [];
    const topicQuestions = normalizeTopicInterviewQuestions(parsed.topicQuestions);
    const recommendedParticipantCount = Math.round(
      Number(parsed.recommendedParticipantCount) || 5,
    );
    const recommendedMethods = normalizeMethodIds(parsed.recommendedMethods);
    return {
      recommendedMethods,
      selectedMethods: recommendedMethods,
      methodRecommendationReason: clip(parsed.methodRecommendationReason, 240),
      methodRationales: normalizeMethodRationales(parsed.methodRationales),
      recommendedParticipantCount,
      participantCountReason: clip(parsed.participantCountReason, 240),
      selectedParticipantCount: recommendedParticipantCount,
      segments: segments.map((s) => ({ ...s, selectedCount: s.recommendedCount })),
      keyQuestionGuides,
      topicQuestions,
      recommendationsGenerated: true,
    };
  } catch {
    return null;
  }
}

export const STAGE3_RESEARCH_GUIDE_INTRO =
  "이번 사용자 조사는 [동행 관찰]과 [1:1 인터뷰]로 진행합니다. 단순히 사용자의 소감이나 만족도를 묻는 자리가 아니라, 언어로 표현되지 않는 행동과 그 이면의 맥락·감정을 입체적으로 관찰해 숨은 니즈(Latent Needs)를 발견하는 자리입니다.";

export const STAGE3_RESEARCH_GUIDE_SHADOWING = {
  title: "동행 관찰 (Shadowing / Travel Along)",
  description:
    "동행 관찰은 사용자가 서비스를 이용하는 여정을 그림자처럼 따라가며, 언어화되지 않는 행동과 행동의 흔적을 포착하는 리서치 방법입니다.",
  principles: [
    {
      title: "방해 금지 원칙 (Non-Interference)",
      body: "관찰 중 사용자가 답답해하거나 막막해 보여도 먼저 개입하거나 가이드를 주지 않습니다. 인위적인 환경이 만들어지는 것을 막고, 자연스러운 행동을 그대로 봅니다.",
    },
    {
      title: "익숙한 인공물(Artifacts) 포착",
      body: "사용자가 문제를 우회하기 위해 임의로 쓰는 도구·메모·습관적인 제스처를 시각적으로 기록합니다. 숨은 니즈의 결정적 신호가 됩니다.",
    },
    {
      title: "관찰의 맥락(Context) 기록",
      body: "시선이 머무는 곳, 주변 소음, 이동 동선의 제약 등 공간이 행동에 미치는 영향을 함께 남깁니다.",
    },
    {
      title: "사후 디브리핑(Debriefing) 연계",
      body: "세션이 끝난 직후 「아까 그 순간에 왜 그렇게 하셨나요?」라고 되물어 행동 뒤의 숨은 동기를 파악합니다.",
    },
  ],
} as const;

export const STAGE3_RESEARCH_GUIDE_INTERVIEW = {
  title: "1:1 인터뷰 (In-depth Interview)",
  description:
    "1:1 심층 인터뷰는 사용자의 주관적 경험·태도·인식을 깊이 있게 꺼내어, 문제의 근본적인 이유(Why)를 추적하는 리서치 방법입니다.",
  tips: [
    "미래 예측 질문 배제 — 「이런 서비스가 나오면 쓰시겠어요?」 같은 미래형·가정형 질문은 전면 금지합니다. 사용자의 가짜 신호를 차단합니다.",
    "유도 질문(Leading Question) 방어 — 창업자 본인의 가설을 확인받으려는 질문을 지양합니다. 확증 편향을 막고 데이터 무결성을 지킵니다.",
    "침묵의 전략적 활용 (Golden Silence) — 답변 후 사용자가 망설이거나 침묵할 때 서둘러 넘어가지 말고 3~5초 기다립니다.",
    "감정이 아닌 사건으로 수집 — 「좋았다·나빴다」 같은 형용사적 평가 대신, 「지난주 어떤 상황에서 그렇게 행동하셨나요?」처럼 구체적 사건 중심으로 수집합니다.",
  ],
  flowTip:
    "질문을 [아이스브레이킹 → 과거 여정 복기 → 대체재 분석 → 감정·맥락 포착 → 가치 검증]의 시간순 레이어로 배치해, 사용자가 자연스럽게 자신의 경험을 서술하도록 만듭니다.",
  stages: [
    {
      title: "1단계 · 신뢰 구축 & 아이스브레이킹 (0~5분)",
      goal: "긴장을 풀고 사용자의 일상·라이프스타일 맥락을 파악합니다.",
      scripts: [
        "안녕하세요, 오늘 귀한 시간 내주셔서 감사합니다. 평소 주말이나 여가 시간에는 주로 어떤 활동을 하며 보내시나요?",
        "최근 한 달 동안 가장 기억에 남거나 즐거웠던 공간(혹은 서비스 경험)이 있다면 가볍게 소개해 주실 수 있을까요?",
      ],
    },
    {
      title: "2단계 · 과거 경험 여정 복기 (5~15분)",
      goal: "솔루션이 아니라, 사용자가 실제로 겪은 최근의 '과거 행동' 여정을 추적합니다.",
      scripts: [
        "가장 최근에 [이 문제 상황]을 해결해야겠다고 마음먹은 구체적인 순간은 언제였나요? 당시 어떤 계기가 있었나요?",
        "그 결심을 한 순간부터 실제로 행동에 옮기기까지, 머릿속으로 떠올린 과정을 시간 순서대로 하나씩 말씀해 주세요.",
      ],
    },
    {
      title: "3단계 · 현재 대체재·우회 경로 탐색 (15~25분)",
      goal: "우리 서비스 없이 지금 문제를 해결하는 방식(Current Alternatives)과 그 비용을 분석합니다.",
      scripts: [
        "그 목적에 맞는 정보를 찾기 위해 검색·지도·SNS·지인 추천 등 어떤 채널을 구체적으로 어떻게 활용하셨나요?",
        "원하는 결과를 얻기까지 대략 몇 번의 시도와 얼마의 시간이 들었나요?",
        "기존 방법을 쓰면서 「이건 정말 번거롭고 비효율적이다」라고 느낀 결정적인 순간은 언제였나요?",
      ],
    },
    {
      title: "4단계 · 감정의 터닝포인트 & 숨은 맥락 포착 (25~35분)",
      goal: "빙산 모델의 '행동' 아래 잠긴 암묵지(Tacit)와 잠재 니즈(Latent)를 감정의 균열에서 찾아냅니다.",
      scripts: [
        "열심히 찾아간 공간(혹은 서비스)이 막상 기대했던 것과 달랐던 적이 있나요? 그때 정확히 어떤 기분이 드셨나요?",
        "그 순간 문제를 해결하기 위해 즉흥적으로 하신 행동이 있다면 무엇이었나요?",
        "이 과정 전체에서 남에게 굳이 티 내지 않지만 스스로 중요하게 여기는 부분이 있다면 무엇이며, 왜 중요한가요?",
      ],
    },
    {
      title: "5단계 · 미충족 니즈(Unmet Needs) & 가치 탐지 (35~40분)",
      goal: "솔루션의 힌트가 될 핵심 가치 제안(Value Proposition) 영역의 유효성을 검증합니다.",
      scripts: [
        "이 여정에서 단 하나의 순간만 마법처럼 편해질 수 있다면, 어느 단계의 스트레스를 가장 먼저 없애고 싶으신가요?",
        "그 스트레스가 완전히 해결된다면, 당신의 일상은 지금과 비교해 어떻게 달라질 것 같나요?",
      ],
    },
  ],
} as const;

export function researchPrepTargetLabels(pre: PrePmfOverviewData): string[] {
  return prePmfPersonDisplayLabels(pre.targetUsers, "타겟");
}
