/**
 * 리서치 준비 To-know list 가이드 (5카테고리)
 * 카테고리 · 핵심 질문 · 파악하고자 하는 정보 · 리서치 방법
 * 1단계 문제점 + 2단계 사전 조사와 연계
 */

import { formatAnswerList } from "@/lib/stages/stage2/contextualAnswers";
import type { ContextualDimensionId } from "@/lib/stages/stage2/contextualDimensions";
import {
  CONTEXTUAL_DIMENSIONS,
  getDimensionDef,
} from "@/lib/stages/stage2/contextualDimensions";
import type { ToKnowBuildContext } from "@/lib/stages/fieldResearch/toKnowCatalogV5";
import {
  defaultBulletToQuestion,
  insightToInfoItem,
  normalizeToKnowInfoQuestion,
  splitInfoCategoryFromQuestion,
  toDirectInterviewQuestion,
  type ToKnowInfoItem,
} from "@/lib/stages/fieldResearch/toKnowInfoQuestions";
import { extractAnswerBulletsFromFindings } from "@/lib/stages/stage2/extractAnswersFromFindings";
import { isPlausibleResearchSubjectLabel } from "@/lib/stages/stage2/prePmfOverview";
import type {
  ResearchMethodId,
  ToKnowBigCategoryId,
  ToKnowRow,
} from "@/lib/stages/fieldResearch/types";

/** 가이드 표 카테고리 순서 */
export const TO_KNOW_GUIDE_CATEGORY_ORDER = [
  "사용자",
  "현재 문제",
  "행동 & 맥락",
  "기존 솔루션",
  "동기 & 목표",
] as const;

export type ToKnowGuideCategory = (typeof TO_KNOW_GUIDE_CATEGORY_ORDER)[number];

type GuideTemplate = {
  category: ToKnowGuideCategory;
  big: ToKnowBigCategoryId;
  method: ResearchMethodId;
  coreQuestion: (problem: string, target: string) => string;
  defaultInfoBullets: string[];
  enrichDimensions: ContextualDimensionId[];
};

function clip(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function newRowId(prefix: string): string {
  return `tok-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function resolveTarget(ctx: ToKnowBuildContext): string {
  const subjects = resolveResearchSubjects(ctx);
  if (subjects.length) return subjects[0]!;
  return (
    ctx.personaName?.trim() ||
    formatAnswerList(ctx.contextualAnswers.primary_users) ||
    "목표 사용자"
  );
}

/** 사전 조사 타겟 사용자 + 이해관계자 → To-know 조사 대상자 */
export function resolveResearchSubjects(ctx: ToKnowBuildContext): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const push = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(trimmed);
  };
  for (const name of ctx.contextualAnswers.primary_users ?? []) push(name);
  for (const name of ctx.contextualAnswers.stakeholders ?? []) push(name);
  if (!out.length && ctx.personaName?.trim()) push(ctx.personaName);
  return out;
}

function subjectsForInfoCategory(
  ctx: ToKnowBuildContext,
  dimensionId: ContextualDimensionId,
  fallbackTarget: string,
): string[] {
  if (dimensionId === "primary_users") {
    const users = (ctx.contextualAnswers.primary_users ?? [])
      .map((s) => s.trim())
      .filter(Boolean);
    if (users.length) return users;
  }
  if (dimensionId === "stakeholders") {
    const stakeholders = (ctx.contextualAnswers.stakeholders ?? [])
      .map((s) => s.trim())
      .filter(Boolean);
    if (stakeholders.length) return stakeholders;
  }
  return [fallbackTarget.trim() || "목표 사용자"];
}

/** 2단계 맥락 영역 → To-know 주제 */
const CATEGORY_BY_DIMENSION: Partial<
  Record<ContextualDimensionId, ToKnowGuideCategory>
> = {
  primary_users: "사용자",
  stakeholders: "사용자",
  situation: "행동 & 맥락",
  environment: "행동 & 맥락",
  competitors: "기존 솔루션",
  products_services: "기존 솔루션",
  policy: "행동 & 맥락",
  infrastructure: "행동 & 맥락",
};

function normalizeInfoLabel(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, " ");
}

function selectedDimensionIds(ctx: ToKnowBuildContext): ContextualDimensionId[] {
  if (ctx.selectedDimensions?.length) return ctx.selectedDimensions;
  const fromResearch = Object.keys(
    ctx.dimensionResearch ?? {},
  ) as ContextualDimensionId[];
  if (fromResearch.length) return fromResearch;
  return CONTEXTUAL_DIMENSIONS.map((d) => d.id);
}

function fieldResearchPriorityLabels(
  ctx: ToKnowBuildContext,
  template: GuideTemplate,
  problem: string,
  target: string,
): ToKnowInfoItem[] {
  const labels: ToKnowInfoItem[] = [];
  const seen = new Set<string>();

  const push = (item: ToKnowInfoItem) => {
    const question = item.question.trim();
    if (!question) return;
    const key = normalizeInfoLabel(
      `${item.infoCategory.trim()}|${question}`,
    );
    if (seen.has(key)) return;
    seen.add(key);
    labels.push({
      infoCategory: item.infoCategory.trim(),
      question,
    });
  };

  const dims = selectedDimensionIds(ctx);
  for (const dimensionId of template.enrichDimensions) {
    if (CATEGORY_BY_DIMENSION[dimensionId] !== template.category) continue;
    if (!dims.includes(dimensionId)) continue;

    const insights = insightsForDimensions(ctx, [dimensionId]);
    const answers = ctx.contextualAnswers[dimensionId] ?? [];

    if (insights.length) {
      for (const insight of insights.slice(0, 2)) {
        for (const subject of subjectsForInfoCategory(
          ctx,
          dimensionId,
          target,
        )) {
          push(
            insightToInfoItem(dimensionId, insight, problem, subject),
          );
        }
      }
      continue;
    }

    if (answers.length) {
      const summary = formatAnswerList(answers);
      for (const subject of subjectsForInfoCategory(
        ctx,
        dimensionId,
        target,
      )) {
        push(
          insightToInfoItem(
            dimensionId,
            clip(summary, 56),
            problem,
            subject,
          ),
        );
      }
      continue;
    }

    const def = getDimensionDef(dimensionId);
    for (const subject of subjectsForInfoCategory(ctx, dimensionId, target)) {
      push({
        infoCategory: subject,
        question: `「${def.label}」와 관련해, 최근 겪으신 경험을 구체적으로 말씀해 주실 수 있나요?`,
      });
    }
  }

  if (template.category === "현재 문제" && problem.trim()) {
    const subjects = resolveResearchSubjects(ctx);
    const subjectList = subjects.length
      ? subjects
      : [target.trim() || "목표 사용자"];
    for (const subject of subjectList) {
      push({
        infoCategory: subject,
        question:
          "이 상황을 겪으시면서 가장 크게 느끼는 감정은 무엇이고, 그 감정은 어디에서 오나요?",
      });
    }
  }

  return labels;
}

function insightsForDimensions(
  ctx: ToKnowBuildContext,
  dimensionIds: ContextualDimensionId[],
): string[] {
  const items: string[] = [];
  for (const id of dimensionIds) {
    const findings = ctx.dimensionResearch?.[id]?.findings?.trim() ?? "";
    const fromFindings = findings
      ? extractAnswerBulletsFromFindings(findings, id)
      : [];
    const fromAnswers = ctx.contextualAnswers[id] ?? [];
    const merged = fromFindings.length ? fromFindings : fromAnswers;
    for (const item of merged.slice(0, 2)) {
      const t = clip(item, 80);
      if (t && !items.includes(t)) items.push(t);
    }
  }
  return items.slice(0, 4);
}

const GUIDE_TEMPLATES: GuideTemplate[] = [
  {
    category: "사용자",
    big: "tk_target",
    method: "home_visit_in_depth",
    coreQuestion: (_problem, target) =>
      `${target}는 어떤 사람이고, 하루 일과와 가치관 속에서 이 상황과 맞닿는 순간은 언제인가요?`,
    defaultInfoBullets: [
      "하루 일과와 생활 리듬",
      "가치관과 우선순위",
      "스스로 여기는 정체성·역할",
    ],
    enrichDimensions: ["primary_users", "stakeholders"],
  },
  {
    category: "현재 문제",
    big: "tk_target",
    method: "home_visit_in_depth",
    coreQuestion: (_problem, target) =>
      `${target}가 이 상황을 겪는 여정에서 가장 힘든 순간과 그때의 감정은 어떤 모습인가요?`,
    defaultInfoBullets: [
      "문제를 처음 마주하는 순간",
      "가장 힘들었던 결정적 순간",
      "그 순간 오가는 감정",
      "평소 이 어려움을 말하는 방식",
    ],
    enrichDimensions: ["primary_users", "situation"],
  },
  {
    category: "행동 & 맥락",
    big: "tk_target",
    method: "shadowing",
    coreQuestion: (_problem, target) =>
      `이 상황 전·중·후로 ${target}는 실제로 어떤 행동을 하고, 어떤 사람·도구·환경과 함께하나요?`,
    defaultInfoBullets: [
      "문제 전·중·후 행동 여정",
      "스스로 만든 우회·대처 방법",
      "곁의 사람·도구·환경",
      "행동이 달라지는 트리거",
    ],
    enrichDimensions: ["situation", "environment", "policy", "infrastructure"],
  },
  {
    category: "기존 솔루션",
    big: "tk_competitor",
    method: "home_visit_in_depth",
    coreQuestion: (_problem, target) =>
      `${target}가 지금 쓰는 방법·대안은 무엇이고, 어디에서 만족하고 어디에서 아쉬움을 느끼나요?`,
    defaultInfoBullets: [
      "지금 쓰는 방법과 그 이유",
      "만족하는 순간과 아쉬운 순간",
      "시도했다 그만둔 경험",
      "대안을 고르는 기준",
    ],
    enrichDimensions: ["competitors", "products_services"],
  },
  {
    category: "동기 & 목표",
    big: "tk_target",
    method: "home_visit_in_depth",
    coreQuestion: (_problem, target) =>
      `${target}가 이 상황에서 진짜 이루고 싶은 것과, 겉으로 드러나지 않는 잠재 니즈는 무엇인가요?`,
    defaultInfoBullets: [
      "진짜 이루고 싶은 상태",
      "겉으로 드러나지 않는 잠재 니즈",
      "해결됐을 때의 감정·의미",
      "힘들어도 계속하게 하는 동기",
    ],
    enrichDimensions: ["primary_users"],
  },
];

/** 1단계 문제점 → To-know 페이지 최상위 기준 문장 */
export function buildDefaultToKnowCoreQuestion(problem: string): string {
  const p = problem.trim();
  if (!p) return "";
  return p;
}

/** 주제별 가이드 핵심 질문 템플릿이 전역 문제 칸에 섞였는지 */
function isGuideTemplateCoreQuestion(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  return (
    /」과\(와\)\s*관련/u.test(t) ||
    /」과\(와\)\s*직접/u.test(t) ||
    /」이\s*발생·반복/u.test(t) ||
    /」을\(를\)\s*해결하면/u.test(t) ||
    /어떤\s*도구·습관·환경/u.test(t) ||
    /가장\s*크게\s*어려워/u.test(t) ||
    /무엇이고,\s*무엇이\s*부족/u.test(t) ||
    /궁극적으로\s*얻고\s*싶은/u.test(t) ||
    /겪나요\?$/u.test(t) ||
    (/무엇인가요\?$/u.test(t) && /」/u.test(t))
  );
}

/**
 * 전역 「풀고자 하는 사용자 문제」 정리.
 * 레거시 주제별 핵심 질문 템플릿이 섞인 경우 1단계 문제점만 남김.
 */
export function sanitizeToKnowCoreQuestion(
  raw: string,
  startingPoint = "",
): string {
  const trimmed = raw.trim();
  const fromStage1 = startingPoint.trim();

  if (!trimmed) return fromStage1;

  if (isGuideTemplateCoreQuestion(trimmed)) {
    if (fromStage1) return fromStage1;
    const bracketMatch = trimmed.match(/「([^」]+)」/u);
    return bracketMatch?.[1]?.trim() ?? "";
  }

  return trimmed;
}

function templateToRows(
  template: GuideTemplate,
  ctx: ToKnowBuildContext,
  problem: string,
  target: string,
): ToKnowRow[] {
  const rows: ToKnowRow[] = [];
  const priorityLabels = fieldResearchPriorityLabels(
    ctx,
    template,
    problem,
    target,
  );
  const seen = new Set(
    priorityLabels.map((item) =>
      normalizeInfoLabel(`${item.infoCategory}|${item.question}`),
    ),
  );
  const infoLabels: ToKnowInfoItem[] = [...priorityLabels];
  const subjects = resolveResearchSubjects(ctx);
  const subjectList = subjects.length
    ? subjects
    : [target.trim() || "목표 사용자"];
  for (const subject of subjectList) {
    for (const label of template.defaultInfoBullets) {
      const question = defaultBulletToQuestion(
        template.category,
        label,
        problem,
        subject,
      );
      const item = {
        infoCategory: subject,
        question,
      };
      const key = normalizeInfoLabel(`${item.infoCategory}|${item.question}`);
      if (seen.has(key)) continue;
      seen.add(key);
      infoLabels.push(item);
    }
  }

  for (const label of infoLabels) {
    rows.push({
      id: newRowId(`${template.category}-info`),
      big: template.big,
      mid: template.category,
      rowKind: "info",
      infoCategory: label.infoCategory,
      small: label.question,
      method: template.method,
      note: "",
    });
  }

  return rows;
}

/** 주제별 파악 정보 행만 (전역 핵심 질문 행 제외) */
export function getCategoryInfoRows(
  rows: ToKnowRow[],
  category: string,
): ToKnowRow[] {
  const cat = category.trim();
  return rows.filter(
    (r) => r.mid.trim() === cat && r.rowKind !== "core",
  );
}

/** 레거시(질문 1행 + note 통합) → info 행만 */
export function migrateGuideCategoryLayout(rows: ToKnowRow[]): ToKnowRow[] {
  const byCategory = new Map<string, ToKnowRow[]>();
  for (const row of rows) {
    const cat = row.mid.trim() || "기타";
    const list = byCategory.get(cat) ?? [];
    list.push(row);
    byCategory.set(cat, list);
  }

  const migrated: ToKnowRow[] = [];
  for (const [cat, catRows] of byCategory) {
    const infoOnly = catRows.filter((r) => r.rowKind !== "core");
    const hasStructuredInfo = infoOnly.some((r) => r.rowKind === "info");
    if (hasStructuredInfo) {
      migrated.push(...infoOnly.map((r) => ({ ...r, rowKind: "info" as const })));
      continue;
    }

    if (catRows.length === 1) {
      const row = catRows[0];
      const noteBullets = (row.note ?? "")
        .split(" · ")
        .map((s) => s.trim())
        .filter(Boolean);
      const template = isKnownGuideCategory(cat)
        ? GUIDE_TEMPLATES.find((t) => t.category === cat)
        : undefined;
      const fallbackBullets =
        noteBullets.length > 0
          ? noteBullets
          : (template?.defaultInfoBullets ?? []);

      for (const label of fallbackBullets) {
        migrated.push({
          id: newRowId(`${cat}-info`),
          big: row.big,
          mid: cat,
          rowKind: "info",
          small: label,
          method: row.method,
          note: "",
        });
      }
      continue;
    }

    for (const row of infoOnly.length ? infoOnly : catRows) {
      if (row.rowKind === "core") continue;
      migrated.push({ ...row, rowKind: "info" });
    }
  }

  return sortRowsByGuideCategory(migrated);
}

/** 가이드 5카테고리 + 문제점·사전 조사 연계 To-know 표 */
export function buildGuideToKnowTable(ctx: ToKnowBuildContext): ToKnowRow[] {
  const problem = ctx.startingPoint.trim();
  if (!problem) return [];

  const target = resolveTarget(ctx);
  const rows: ToKnowRow[] = [];

  for (const template of GUIDE_TEMPLATES) {
    const templateRows = templateToRows(template, ctx, problem, target);
    rows.push(...templateRows);
  }

  return rows;
}

function rowContentKey(row: ToKnowRow): string {
  return `${row.mid.trim()}|${normalizeInfoLabel(row.infoCategory ?? "")}|${normalizeInfoLabel(row.small)}`;
}

/**
 * 기존 To-know 표에 1·2단계 기반 현장 조사 항목을 병합.
 * 사용자가 이미 입력한 행은 유지하고, 빈 칸·누락 항목만 채움.
 */
export function mergeToKnowTableWithSeed(
  existing: ToKnowRow[],
  seeded: ToKnowRow[],
): ToKnowRow[] {
  if (!seeded.length) return existing;
  if (!existing.length) return seeded;

  const filledKeys = new Set(
    existing.filter((row) => row.small.trim()).map(rowContentKey),
  );

  const filled = existing.map((row, index) => {
    if (row.small.trim()) return row;
    const seedInCategory = seeded.filter(
      (seed) =>
        seed.mid.trim() === row.mid.trim() &&
        seed.rowKind === row.rowKind &&
        seed.small.trim(),
    );
    const emptyIndex = existing
      .slice(0, index)
      .filter(
        (candidate) =>
          candidate.mid.trim() === row.mid.trim() &&
          candidate.rowKind === row.rowKind &&
          !candidate.small.trim(),
      ).length;
    const match = seedInCategory[emptyIndex];
    if (!match) return row;
    filledKeys.add(rowContentKey(match));
    return {
      ...row,
      infoCategory: row.infoCategory?.trim() || match.infoCategory || "",
      small: match.small,
      method: row.method || match.method,
      note: row.note?.trim() ? row.note : match.note,
    };
  });

  const toPrepend: ToKnowRow[] = [];
  for (const seed of seeded) {
    if (!seed.small.trim()) continue;
    const key = rowContentKey(seed);
    if (filledKeys.has(key)) continue;
    filledKeys.add(key);
    toPrepend.push({ ...seed, id: newRowId(`merge-${seed.mid}`) });
  }

  if (!toPrepend.length) return filled;

  const merged = [...filled];
  for (const row of [...toPrepend].reverse()) {
    const category = row.mid.trim();
    const insertAt = merged.findIndex((item) => item.mid.trim() === category);
    if (insertAt >= 0) {
      merged.splice(insertAt, 0, row);
    } else {
      merged.push(row);
    }
  }

  return sortRowsByGuideCategory(merged);
}

/** 잘못된 조사 대상자 라벨을 사전 조사 세그먼트 목록으로 정리 */
export function remapToKnowInfoCategories(
  rows: ToKnowRow[],
  validSubjects: string[],
): ToKnowRow[] {
  if (!validSubjects.length) return rows;
  const valid = new Set(validSubjects.map((s) => s.toLowerCase()));
  const fallback = validSubjects[0]!;

  return rows.map((row) => {
    const cat = row.infoCategory?.trim() ?? "";
    if (!cat) return row;
    if (valid.has(cat.toLowerCase())) return row;
    if (isPlausibleResearchSubjectLabel(cat)) return row;
    return { ...row, infoCategory: fallback };
  });
}

/** 레거시·비질문 형태 파악 정보 → 질문 형태로 정리 */
export function sanitizeToKnowTableRows(
  rows: ToKnowRow[],
  problem: string,
  target: string,
): ToKnowRow[] {
  const seen = new Set<string>();
  const sanitized: ToKnowRow[] = [];

  for (const row of rows) {
    let infoCategory = row.infoCategory?.trim() ?? "";
    let small = row.small.trim()
      ? normalizeToKnowInfoQuestion(row.small, {
          category: row.mid,
          problem,
          target,
        })
      : "";

    if (small && !infoCategory) {
      const split = splitInfoCategoryFromQuestion(small, target);
      infoCategory = split.infoCategory;
      small = split.question;
    }

    if (small) {
      small = toDirectInterviewQuestion(row.mid, infoCategory || target, small);
    }

    if (!small) {
      sanitized.push({ ...row, infoCategory });
      continue;
    }
    const key = `${row.mid.trim()}|${normalizeInfoLabel(infoCategory)}|${normalizeInfoLabel(small)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    sanitized.push({ ...row, infoCategory, small });
  }

  return sanitized;
}

export function sortRowsByGuideCategory(rows: ToKnowRow[]): ToKnowRow[] {
  const order = new Map(
    TO_KNOW_GUIDE_CATEGORY_ORDER.map((c, i) => [c, i]),
  );
  return [...rows]
    .map((row, index) => ({ row, index }))
    .sort((a, b) => {
      const ca = a.row.mid.trim();
      const cb = b.row.mid.trim();
      const oa = order.get(ca as ToKnowGuideCategory) ?? 99;
      const ob = order.get(cb as ToKnowGuideCategory) ?? 99;
      if (oa !== ob) return oa - ob;
      return a.index - b.index;
    })
    .map(({ row }) => row);
}

export function guideCategoryLabel(mid: string): string {
  return mid.trim() || "기타";
}

export function isKnownGuideCategory(
  mid: string,
): mid is ToKnowGuideCategory {
  return TO_KNOW_GUIDE_CATEGORY_ORDER.includes(mid.trim() as ToKnowGuideCategory);
}

/** 가이드 기본값 또는 사용자 지정 카테고리 기본값 */
export function defaultsForCategory(category: string): {
  big: ToKnowBigCategoryId;
  method: ResearchMethodId;
} {
  const trimmed = category.trim();
  if (isKnownGuideCategory(trimmed)) {
    return {
      big: defaultBigForGuideCategory(trimmed),
      method: defaultMethodForGuideCategory(trimmed),
    };
  }
  return { big: "tk_target", method: "home_visit_in_depth" };
}

export function renameCategoryInRows(
  rows: ToKnowRow[],
  oldCategory: string,
  newCategory: string,
): ToKnowRow[] {
  const next = newCategory.trim();
  const prev = oldCategory.trim();
  if (!next || prev === next) return rows;
  return rows.map((r) =>
    r.mid.trim() === prev ? { ...r, mid: next } : r,
  );
}

export function nextCustomCategoryName(existing: Iterable<string>): string {
  const set = new Set([...existing].map((c) => c.trim()).filter(Boolean));
  const base = "새 주제";
  if (!set.has(base)) return base;
  let n = 2;
  while (set.has(`${base} ${n}`)) n += 1;
  return `${base} ${n}`;
}

export function nextCustomInfoCategoryName(existing: Iterable<string>): string {
  const set = new Set([...existing].map((c) => c.trim()).filter(Boolean));
  const base = "새 카테고리";
  if (!set.has(base)) return base;
  let n = 2;
  while (set.has(`${base} ${n}`)) n += 1;
  return `${base} ${n}`;
}

export function defaultMethodForGuideCategory(
  category: ToKnowGuideCategory,
): ResearchMethodId {
  const t = GUIDE_TEMPLATES.find((x) => x.category === category);
  return t?.method ?? "home_visit_in_depth";
}

export function defaultBigForGuideCategory(
  category: ToKnowGuideCategory,
): ToKnowBigCategoryId {
  const t = GUIDE_TEMPLATES.find((x) => x.category === category);
  return t?.big ?? "tk_target";
}
