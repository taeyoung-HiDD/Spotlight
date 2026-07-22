import type { PrePmfOverviewData } from "@/lib/stages/stage2/prePmfOverview";
import {
  prePmfPersonDisplayName,
  prePmfPersonDisplayLabels,
} from "@/lib/stages/stage2/prePmfOverview";
import type {
  FieldResearchData,
  ResearchMethodId,
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
    const text = value.trim().slice(0, 240);
    if (text) out[id] = text;
  }
  return out;
}

export interface Stage3ResearchSegment {
  id: string;
  label: string;
  recommendedCount: number;
  selectedCount: number;
  reason: string;
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
    selectedPath: "field_interview",
    activeGuideMethod: "shadowing",
    recommendationsGenerated: false,
  };
}

function clip(value: unknown, max: number): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function normalizeSegment(raw: unknown, index: number): Stage3ResearchSegment | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Partial<Stage3ResearchSegment>;
  const label = clip(o.label, 80);
  if (!label) return null;
  const recommendedCount = Math.min(
    20,
    Math.max(0, Math.round(Number(o.recommendedCount) || 0)),
  );
  const selectedCount = Math.min(
    20,
    Math.max(0, Math.round(Number(o.selectedCount) || recommendedCount || 1)),
  );
  return {
    id: clip(o.id, 40) || `seg-${index}-${label.slice(0, 8)}`,
    label,
    recommendedCount: recommendedCount || 1,
    selectedCount: selectedCount || recommendedCount || 1,
    reason: clip(o.reason, 200),
  };
}

export function normalizeStage3ResearchPrep(
  raw: unknown,
): Stage3ResearchPrep {
  const base = emptyStage3ResearchPrep();
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<Stage3ResearchPrep>;
  const segments = Array.isArray(o.segments)
    ? o.segments
        .map((s, idx) => normalizeSegment(s, idx))
        .filter((s): s is Stage3ResearchSegment => s !== null)
        .slice(0, 6)
    : [];
  const keyQuestionGuides = Array.isArray(o.keyQuestionGuides)
    ? o.keyQuestionGuides
        .filter((q): q is string => typeof q === "string" && q.trim().length > 0)
        .map((q) => q.trim().slice(0, 240))
        .slice(0, 6)
    : [];
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
  const targets = pre.targetUsers.filter(
    (u, i) => prePmfPersonDisplayName(u, i, "타겟").trim() || u.reason.trim(),
  );
  const segments: Stage3ResearchSegment[] = targets.slice(0, 4).map((user, idx) => {
    const label = prePmfPersonDisplayName(user, idx, "타겟");
    const count = idx === 0 ? 3 : idx === 1 ? 2 : 1;
    return {
      id: `seg-${idx}-${label.slice(0, 6)}`,
      label,
      recommendedCount: count,
      selectedCount: count,
      reason:
        user.reason.trim().slice(0, 120) ||
        "2단계 사전 조사에서 정리한 타겟 유저예요.",
    };
  });
  if (!segments.length) {
    segments.push({
      id: "seg-default",
      label: "핵심 타겟 유저",
      recommendedCount: 3,
      selectedCount: 3,
      reason: "사전 조사에서 정의한 주요 이용자 그룹이에요.",
    });
    segments.push({
      id: "seg-general",
      label: "일반 이용자",
      recommendedCount: 2,
      selectedCount: 2,
      reason: "비교·대조를 위해 넓은 범위의 이용자도 포함해요.",
    });
  }
  const recommendedParticipantCount = Math.max(
    5,
    segments.reduce((sum, s) => sum + s.recommendedCount, 0),
  );
  const participantCountReason =
    segments.length > 1
      ? `정성 조사는 5~8명이면 반복되는 행동 패턴이 드러나요. ${segments.length}개 세그먼트를 비교·대조하려고 세그먼트별 인원을 합쳐 총 ${recommendedParticipantCount}명을 권장해요.`
      : `정성 조사는 5명 안팎이면 반복되는 행동 패턴이 충분히 드러나므로, 깊이 있는 인터뷰가 가능한 ${recommendedParticipantCount}명을 권장해요.`;
  const problemHint = problem.trim().slice(0, 80);
  const keyQuestionGuides = [
    problemHint
      ? `최근에 「${problemHint}」와 비슷한 상황을 겪은 적이 있나요? 그때 어떻게 대처했나요?`
      : "최근에 비슷한 문제를 겪은 적이 있나요? 그때 어떻게 대처했나요?",
    "그 순간 가장 답답했던 점은 무엇이었나요?",
    "지금 쓰는 대안이나 우회 방법이 있다면, 왜 그걸 계속 쓰고 있나요?",
  ];

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
- recommendedMethods: 아래 **Design Thinking 공감(Empathize) 리서치 방법 id** 중 문제에 가장 적합한 1~3개만 고릅니다.
- **설문(survey)·데스크리서치(desk_research)·FGD(fgd)·기타(other)는 절대 추천하지 않습니다.**
- methodRecommendationReason: 왜 그 방법 조합이 이 문제에 맞는지 한 문장.
- methodRationales: recommendedMethods **각각의 id를 키**로, "왜 이 방법이 이 문제·타겟에 적합한지"를 문제 맥락과 연결해 한 문장씩 씁니다.
- recommendedParticipantCount: 총 권장 인원 (보통 5~8명, B2B는 3~6명도 가능)
- participantCountReason: 왜 그 인원이 적정한지 한 문장 (정성 조사 특성·세그먼트 수·B2B 등 문제 맥락과 연결)
- segments: 세그먼트별 label·recommendedCount·reason (합이 총 인원과 맞도록)
- keyQuestionGuides: 과거 행동·맥락을 묻는 질문 3~4개 (미래 가정·솔루션 검증 질문 금지)
- JSON만 출력

Design Thinking 공감 리서치 방법 (이 목록만 사용):
${methodCatalog}

문제 정의:
${problem || "(없음)"}

사전 조사 요약:
${prePmfSummary || "(없음)"}

타겟 힌트: ${targetLabels.join(" · ") || "(없음)"}

출력 형식:
{"recommendedMethods":["home_visit_in_depth","shadowing"],"methodRecommendationReason":"...","methodRationales":{"home_visit_in_depth":"...","shadowing":"..."},"recommendedParticipantCount":5,"participantCountReason":"...","segments":[{"label":"...","recommendedCount":3,"reason":"..."}],"keyQuestionGuides":["..."]}
`.trim();
}

export function parseResearchPrepJson(text: string): Partial<Stage3ResearchPrep> | null {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    const segments = Array.isArray(parsed.segments)
      ? parsed.segments
          .map((s, idx) => normalizeSegment(s, idx))
          .filter((s): s is Stage3ResearchSegment => s !== null)
      : [];
    const keyQuestionGuides = Array.isArray(parsed.keyQuestionGuides)
      ? parsed.keyQuestionGuides
          .filter((q): q is string => typeof q === "string" && q.trim().length > 0)
          .map((q) => q.trim())
      : [];
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
