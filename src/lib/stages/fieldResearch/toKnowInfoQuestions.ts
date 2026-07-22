import type { ContextualDimensionId } from "@/lib/stages/stage2/contextualDimensions";
import { CONTEXTUAL_DIMENSIONS } from "@/lib/stages/stage2/contextualDimensions";
import {
  parseProfileItem,
  parseRoleItem,
} from "@/lib/stages/stage2/peopleFindingsPresentation";
import type { ToKnowGuideCategory } from "@/lib/stages/fieldResearch/toKnowGuideCategories";
import { isPlausibleResearchSubjectLabel } from "@/lib/stages/stage2/prePmfOverview";

export type ToKnowInfoItem = {
  infoCategory: string;
  question: string;
};

const SUBJECT_FALLBACKS = ["목표 사용자", "조사 대상자"];

function clip(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function isQuestion(text: string): boolean {
  return /[?？]$/.test(text.trim());
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function subjectCandidates(subject: string): string[] {
  const list = [subject.trim(), ...SUBJECT_FALLBACKS].filter(Boolean);
  return [...new Set(list)];
}

/** 조사자 분석 관점 질문(잠재 니즈·단서·힌트 등)인지 판별 */
export function isResearcherAnalyticalQuestion(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return (
    /잠재\s*니즈/u.test(t) ||
    /(?:단서|힌트)(?:는|은|가)?\s*무엇/u.test(t) ||
    /가리키는/u.test(t) ||
    /드러나(?:는|지\s*않는)/u.test(t) ||
    /충족되지\s*않는/u.test(t) ||
    /파악할\s*내용/u.test(t) ||
    /검증·구체화/u.test(t) ||
    /사용자\s*조사로\s*(?:확인|파악|검증)/u.test(t)
  );
}

/** 레거시 메타 문구 제거 */
export function stripToKnowInfoMeta(label: string): string {
  let text = label.trim();
  if (!text) return "";

  text = text.replace(/^사전\s*조사\s*확인\s*:\s*/u, "");
  text = text.replace(
    /\s*[—–-]\s*사전\s*조사\s*가설을\s*사용자\s*조사로\s*확인\s*$/u,
    "",
  );
  text = text.replace(
    /\s*[—–-]\s*사용자\s*조사로\s*검증·구체화할\s*핵심\s*문제\s*$/u,
    "",
  );
  text = text.replace(
    /\s*[—–-]\s*「[^」]+」\s*해결을\s*위해\s*사용자\s*조사로\s*파악할\s*내용\s*$/u,
    "",
  );
  text = text.replace(
    /\s*[—–-]\s*「[^」]+」\s*해결을\s*위해\s*사용자\s*조사로\s*파악할\s*내용\s*$/u,
    "",
  );
  text = text.replace(
    /\s*[—–-]\s*[^「]+해결을\s*위해\s*사용자\s*조사로\s*파악할\s*내용\s*$/u,
    "",
  );
  return text.trim();
}

/**
 * To-know 기본 항목(bullet) → 응답자에게 바로 묻는 직접 인터뷰 질문.
 * infoCategory에 조사 대상이 따로 있으므로 질문 본문에는 3인칭 대상을 넣지 않음.
 */
const DIRECT_BULLET_QUESTIONS: Record<
  ToKnowGuideCategory,
  Record<string, string>
> = {
  사용자: {
    "하루 일과와 생활 리듬":
      "평소 하루를 어떻게 보내시나요? 그중 이 상황과 맞닿는 순간은 언제인가요?",
    "가치관과 우선순위":
      "일상에서 무엇을 가장 중요하게 여기시나요? 시간·돈·에너지는 주로 어디에 먼저 쓰시나요?",
    "스스로 여기는 정체성·역할":
      "스스로를 어떤 사람이라고 생각하시나요? 주변에서는 어떤 역할로 봐 주시나요?",
  },
  "현재 문제": {
    "문제를 처음 마주하는 순간":
      "이 어려움을 처음 겪으셨던 계기나 상황은 어떤 모습이었나요?",
    "가장 힘들었던 결정적 순간":
      "최근 이 상황에서 가장 답답하거나 막막하셨던 순간은 언제, 어떻게였나요?",
    "그 순간 오가는 감정":
      "그 과정을 겪으실 때 감정은 어떻게 달라지나요? (기대·불안·좌절 등 편하게 말씀해 주세요)",
    "평소 이 어려움을 말하는 방식":
      "이 어려움을 평소 어떤 말이나 표현으로 이야기하시나요?",
  },
  "행동 & 맥락": {
    "문제 전·중·후 행동 여정":
      "이 상황을 겪기 전·도중·후로 실제로 어떤 행동을 순서대로 하시나요?",
    "스스로 만든 우회·대처 방법":
      "나름대로 만들어 쓰시는 우회로나 방법, 임시방편이 있다면 무엇인가요?",
    "곁의 사람·도구·환경":
      "그 순간 곁에 있는 사람, 사용하시는 도구, 주변 환경은 어떤가요?",
    "행동이 달라지는 트리거":
      "어떤 조건이나 계기에서 행동이나 마음이 크게 달라지시나요?",
  },
  "기존 솔루션": {
    "지금 쓰는 방법과 그 이유":
      "지금 쓰고 계신 방법·서비스는 무엇인가요? 계속 쓰시는 이유는 무엇인가요?",
    "만족하는 순간과 아쉬운 순간":
      "그 방법에서 만족스러우신 순간과 아쉬우신 순간은 각각 언제인가요?",
    "시도했다 그만둔 경험":
      "예전에 시도했다 그만두신 방법이 있다면, 어떤 순간에 왜 그만두셨나요?",
    "대안을 고르는 기준":
      "여러 방법 중 하나를 고르실 때 가장 중요하게 보시는 기준은 무엇인가요?",
  },
  "동기 & 목표": {
    "진짜 이루고 싶은 상태":
      "이 상황에서 궁극적으로 이루고 싶으신 모습은 어떤 건가요?",
    "겉으로 드러나지 않는 잠재 니즈":
      "말로는 잘 꺼내지 않지만 은근히 바라시는 것이 있다면 무엇인가요?",
    "해결됐을 때의 감정·의미":
      "이 어려움이 사라진다면 어떤 기분이 드실 것 같나요? 어떤 의미가 있을까요?",
    "힘들어도 계속하게 하는 동기":
      "힘들어도 이 일을 계속하게 만드는 이유나 동기는 무엇인가요?",
  },
};

/** 사전 조사 차원별 직접 인터뷰 질문 */
const DIMENSION_DIRECT_QUESTIONS: Record<ContextualDimensionId, string> = {
  primary_users:
    "평소 하루를 어떻게 보내시나요? 이 상황과 맞닿는 순간은 언제인가요?",
  stakeholders:
    "이 상황에서 어떤 역할을 하시나요? 그때 무엇을 기대하시고 어떤 감정을 느끼시나요?",
  situation:
    "이 상황이 벌어지는 순간, 어떤 행동을 하시고 감정은 어떻게 달라지시나요?",
  environment:
    "지금 놓인 환경은 본인의 행동과 감정에 어떤 영향을 주나요?",
  competitors:
    "지금 쓰고 계신 대안이 채워 주지 못해 아쉬움이 남는 지점은 어디인가요?",
  products_services:
    "관련 제품·서비스를 실제로 쓰시는 과정에서, 충족되지 않아 아쉬운 점은 무엇인가요?",
  policy:
    "정책·제도가 본인의 행동과 선택에 어떤 제약이나 계기가 되나요?",
  infrastructure:
    "주변 인프라·기술은 이 상황을 겪으시는 과정에 어떤 영향을 주나요?",
};

/** 레거시 조사자 관점 질문 → 직접 인터뷰 질문 (기존 데이터 마이그레이션) */
const LEGACY_ANALYTICAL_TO_DIRECT: Array<{
  pattern: RegExp;
  direct: string;
}> = [
  {
    pattern:
      /하루\s*일과.*잠재\s*니즈(?:의\s*단서)?(?:는|은|가)?\s*무엇/u,
    direct:
      "하루 일과와 이 상황을 겪는 과정에서, 어떤 점이 특히 아쉽거나 더 필요하다고 느끼시나요?",
  },
  {
    pattern: /행동과\s*감정\s*변화가\s*가리키는\s*잠재\s*니즈/u,
    direct:
      "이 상황이 벌어지는 순간, 어떤 행동을 하시고 감정은 어떻게 달라지시나요?",
  },
  {
    pattern: /충족되지\s*않는\s*잠재\s*니즈/u,
    direct:
      "관련 제품·서비스를 실제로 쓰시는 과정에서, 충족되지 않아 아쉬운 점은 무엇인가요?",
  },
  {
    pattern: /잠재\s*니즈(?:의\s*(?:단서|힌트))?(?:는|은|가)?\s*무엇/u,
    direct:
      "이 상황을 겪으시면서, 어떤 점이 특히 아쉽거나 더 필요하다고 느끼시나요?",
  },
  {
    pattern: /가장\s*크게\s*느끼는\s*감정.*잠재\s*니즈/u,
    direct:
      "이 상황을 겪으시면서 가장 크게 느끼는 감정은 무엇이고, 그 감정은 어디에서 오나요?",
  },
];

function genericDirectTransform(question: string, subject: string): string {
  let text = question.trim();
  if (!text) return "";

  for (const cand of subjectCandidates(subject)) {
    text = text.replace(
      new RegExp(`^${escapeRegExp(cand)}(?:의|가|는|은|이|를|을|에게|와|과|도)?\\s*`),
      "",
    );
    text = text.split(`${cand}의`).join("본인의");
  }
  text = text.split("그의").join("본인의");

  for (const rule of LEGACY_ANALYTICAL_TO_DIRECT) {
    if (rule.pattern.test(text)) return rule.direct;
  }

  text = text.replace(
    /(?:,\s*)?(?:그\s*이면의\s*|가리키는\s*)?(?:겉으로\s*드러나지\s*않는\s*)?잠재\s*니즈(?:의\s*(?:단서|힌트))?(?:는|은|가)?\s*무엇(?:인가요|일까요)\s*\?$/u,
    "어떤 점이 특히 아쉽거나 더 필요하다고 느끼시나요?",
  );

  if (!/[?？]$/.test(text)) {
    text = `${text}에 대해, 최근 겪으신 경험을 구체적으로 말씀해 주실 수 있나요?`;
  }

  return text.trim();
}

export function defaultBulletToQuestion(
  category: ToKnowGuideCategory,
  bullet: string,
  _problem: string,
  _target: string,
): string {
  const trimmed = bullet.trim();
  if (!trimmed) return "";
  if (isQuestion(trimmed) && !isResearcherAnalyticalQuestion(trimmed)) {
    return trimmed;
  }

  const mapped = DIRECT_BULLET_QUESTIONS[category]?.[trimmed];
  if (mapped) return mapped;

  return `「${clip(trimmed, 48)}」와 관련해, 최근 겪으신 경험을 구체적으로 말씀해 주실 수 있나요?`;
}

/**
 * 조사자 분석 관점 질문을 응답자에게 바로 물어볼 직접 인터뷰 질문으로 변환.
 * (레거시 데이터·가이드보내기 공용)
 */
export function toDirectInterviewQuestion(
  category: string,
  subject: string,
  question: string,
): string {
  const trimmed = question.trim();
  if (!trimmed) return "";
  if (!isResearcherAnalyticalQuestion(trimmed)) return trimmed;

  const cat = category.trim() as ToKnowGuideCategory;
  if (isKnownGuideCategoryName(cat)) {
    for (const [bullet, direct] of Object.entries(DIRECT_BULLET_QUESTIONS[cat])) {
      const legacy = legacyBulletQuestion(cat, bullet, subject);
      if (legacy === trimmed) return direct;
    }
  }

  for (const rule of LEGACY_ANALYTICAL_TO_DIRECT) {
    if (rule.pattern.test(trimmed)) return rule.direct;
  }

  return genericDirectTransform(trimmed, subject);
}

/** 레거시 3인칭 bullet 질문 재구성 (마이그레이션 매칭용) */
function legacyBulletQuestion(
  category: ToKnowGuideCategory,
  bullet: string,
  target: string,
): string {
  const t = target.trim() || "목표 사용자";
  const legacyMap: Partial<
    Record<ToKnowGuideCategory, Record<string, string>>
  > = {
    사용자: {
      "하루 일과와 생활 리듬": `${t}의 평범한 하루는 어떻게 흘러가며, 그중 이 상황과 맞닿는 순간은 언제인가요?`,
    },
    "현재 문제": {
      "가장 힘들었던 결정적 순간": `${t}가 최근 이 상황에서 가장 답답하거나 막막했던 구체적인 순간은 언제, 어떻게였나요?`,
    },
    "동기 & 목표": {
      "겉으로 드러나지 않는 잠재 니즈": `${t}가 말로는 잘 꺼내지 않지만 은근히 바라는 것(잠재 니즈)은 무엇일까요?`,
    },
  };
  return legacyMap[category]?.[bullet] ?? "";
}

/** 인사이트·프로필 문장에서 대상 구분 추출 (예: 예비 창업자, 창업 멘토) */
export function extractInfoCategoryFromInsight(insight: string): string {
  const raw = stripToKnowInfoMeta(insight).trim();
  if (!raw) return "";

  const colonIdx = raw.indexOf(":");
  if (colonIdx > 0 && colonIdx <= 40) {
    const head = raw.slice(0, colonIdx).trim();
    const parsed = parseProfileItem(`${head}: …`);
    const segment = parsed.segment.trim();
    if (segment && segment.length <= 36) return segment;
    return clip(head, 36);
  }

  const parsed = parseProfileItem(raw);
  if (
    parsed.segment &&
    parsed.segment !== raw &&
    parsed.segment.length <= 36
  ) {
    return parsed.segment;
  }

  const role = parseRoleItem(raw);
  if (role.subject && role.detail && role.subject.length <= 36) {
    return role.subject;
  }

  return "";
}

/** 질문 문장에 섞인 대상 구분을 분리 */
export function splitInfoCategoryFromQuestion(
  small: string,
  fallbackTarget = "",
): ToKnowInfoItem {
  const text = small.trim();
  if (!text) return { infoCategory: "", question: "" };

  const dashParts = text.split(/\s*[—–-]\s+/u);
  if (dashParts.length >= 2) {
    const tail = dashParts[dashParts.length - 1]?.trim() ?? "";
    if (isQuestion(tail)) {
      const head = dashParts.slice(0, -1).join(" — ").trim();
      let category = extractInfoCategoryFromInsight(head);
      if (!category && head.length <= 36 && !head.includes("「")) {
        const colon = head.indexOf(":");
        category = colon > 0 ? head.slice(0, colon).trim() : head;
      }
      if (category) {
        return {
          infoCategory: clip(category, 36),
          question: toDirectInterviewQuestion("", category, tail),
        };
      }
    }
  }

  const fromInsight = extractInfoCategoryFromInsight(text);
  if (fromInsight) {
    const question = isQuestion(text)
      ? toDirectInterviewQuestion("", fromInsight, text)
      : "이 상황과 관련해, 최근 겪으신 경험을 구체적으로 말씀해 주실 수 있나요?";
    return { infoCategory: fromInsight, question };
  }

  return {
    infoCategory: fallbackTarget.trim(),
    question: toDirectInterviewQuestion("", fallbackTarget, text),
  };
}

export function insightToInfoItem(
  dimensionId: ContextualDimensionId,
  insight: string,
  _problem: string,
  target: string,
): ToKnowInfoItem {
  const extracted = extractInfoCategoryFromInsight(insight);
  const category =
    extracted && isPlausibleResearchSubjectLabel(extracted)
      ? extracted
      : target.trim() || "목표 사용자";

  return {
    infoCategory: category,
    question:
      DIMENSION_DIRECT_QUESTIONS[dimensionId] ??
      "이 상황과 관련해, 최근 겪으신 경험을 구체적으로 말씀해 주실 수 있나요?",
  };
}

function dimensionForLabel(text: string): ContextualDimensionId | null {
  for (const dimension of CONTEXTUAL_DIMENSIONS) {
    if (
      text.startsWith(`${dimension.label}(`) ||
      text.startsWith(`${dimension.label} —`) ||
      text.startsWith(`${dimension.label}—`) ||
      text.startsWith(`${dimension.label}:`)
    ) {
      return dimension.id;
    }
  }
  return null;
}

export function insightToQuestion(
  dimensionId: ContextualDimensionId,
  insight: string,
  problem: string,
  target: string,
): string {
  return insightToInfoItem(dimensionId, insight, problem, target).question;
}

export function unknownSeedToQuestion(
  unknown: string,
  problem: string,
  target: string,
): string {
  const stripped = stripToKnowInfoMeta(unknown);
  if (!stripped) return "";
  if (isQuestion(stripped) && !isResearcherAnalyticalQuestion(stripped)) {
    return stripped;
  }

  const dimensionId = dimensionForLabel(stripped);
  if (dimensionId) {
    const parenMatch = stripped.match(/^[^(]+\(([^)]+)\)/u);
    if (parenMatch?.[1]?.trim()) {
      return insightToQuestion(
        dimensionId,
        parenMatch[1].trim(),
        problem.trim(),
        target.trim() || "목표 사용자",
      );
    }
    return (
      DIMENSION_DIRECT_QUESTIONS[dimensionId] ??
      "이 상황과 관련해, 최근 겪으신 경험을 구체적으로 말씀해 주실 수 있나요?"
    );
  }

  if (stripped.includes("핵심 문제")) {
    return "이 상황을 겪으시면서 가장 답답하거나 막막하셨던 순간은 언제, 어떻게였나요?";
  }

  return `「${clip(stripped, 48)}」와 관련해, 최근 겪으신 경험을 구체적으로 말씀해 주실 수 있나요?`;
}

export type ToKnowInfoQuestionContext = {
  category?: string;
  problem: string;
  target: string;
  dimensionId?: ContextualDimensionId;
};

/** 파악하고자 하는 정보 — 응답자에게 바로 물어볼 질문 형태로 정규화 */
export function normalizeToKnowInfoQuestion(
  raw: string,
  ctx: ToKnowInfoQuestionContext,
): string {
  const stripped = stripToKnowInfoMeta(raw);
  if (!stripped) return "";

  const category = ctx.category?.trim() as ToKnowGuideCategory | undefined;
  const problem = ctx.problem.trim();
  const target = ctx.target.trim() || "목표 사용자";

  if (isQuestion(stripped) && !/^사전\s*조사/u.test(raw)) {
    if (isResearcherAnalyticalQuestion(stripped)) {
      return toDirectInterviewQuestion(category ?? "", target, stripped);
    }
    return stripped;
  }

  if (category && DIRECT_BULLET_QUESTIONS[category]?.[stripped]) {
    return defaultBulletToQuestion(category, stripped, problem, target);
  }

  if (ctx.dimensionId) {
    return insightToQuestion(ctx.dimensionId, stripped, problem, target);
  }

  const legacyMeta =
    /사전\s*조사|사용자\s*조사로\s*(검증|확인|파악)/u.test(raw);
  if (legacyMeta || dimensionForLabel(stripped) || stripped.includes("핵심 문제")) {
    return unknownSeedToQuestion(raw, problem, target);
  }

  if (category && isKnownGuideCategoryName(category)) {
    return defaultBulletToQuestion(
      category as ToKnowGuideCategory,
      stripped,
      problem,
      target,
    );
  }

  if (!isQuestion(stripped)) {
    return `「${clip(stripped, 48)}」와 관련해, 최근 겪으신 경험을 구체적으로 말씀해 주실 수 있나요?`;
  }

  return toDirectInterviewQuestion(category ?? "", target, stripped);
}

function isKnownGuideCategoryName(
  category: string,
): category is ToKnowGuideCategory {
  return (
    category === "사용자" ||
    category === "현재 문제" ||
    category === "행동 & 맥락" ||
    category === "기존 솔루션" ||
    category === "동기 & 목표"
  );
}
