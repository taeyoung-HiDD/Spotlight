/**
 * 리서치 준비 To-know list 가이드 (5카테고리)
 * 카테고리 · 핵심 질문 · 파악하고자 하는 정보 · 리서치 방법
 * 1단계 문제점 + 2단계 사전 조사와 연계
 */

import { formatAnswerList } from "@/lib/stages/stage2/contextualAnswers";
import type { ContextualDimensionId } from "@/lib/stages/stage2/contextualDimensions";
import { getDimensionDef } from "@/lib/stages/stage2/contextualDimensions";
import type { CremaToKnowBuildContext } from "@/lib/stages/fieldResearch/cremaToKnowV5";
import { extractAnswerBulletsFromFindings } from "@/lib/stages/stage2/extractAnswersFromFindings";
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

function resolveTarget(ctx: CremaToKnowBuildContext): string {
  return (
    ctx.personaName?.trim() ||
    formatAnswerList(ctx.contextualAnswers.primary_users) ||
    "목표 사용자"
  );
}

function insightsForDimensions(
  ctx: CremaToKnowBuildContext,
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

function buildInfoToIdentify(
  bullets: string[],
  preResearch: string[],
  problem: string,
): string {
  const base = bullets.join(" · ");
  if (!preResearch.length) return base;
  const p = clip(problem, 40) || "문제점";
  const linked = preResearch
    .map((h) => `「${p}」 맥락에서 확인: ${h}`)
    .join(" · ");
  return `${base}${base ? " · " : ""}${linked}`;
}

const GUIDE_TEMPLATES: GuideTemplate[] = [
  {
    category: "사용자",
    big: "crema_target",
    method: "home_visit_in_depth",
    coreQuestion: (problem, target) =>
      `「${clip(problem, 72)}」과(와) 관련된 ${target}는 일상·업무에서 어떤 도구·습관·환경 속에서 이 문제를 겪나요?`,
    defaultInfoBullets: [
      "역할·생활 단계·배경",
      "문제와 연결된 주요 앱·서비스·도구",
      "사용 빈도·목적·방식",
    ],
    enrichDimensions: ["primary_users", "stakeholders"],
  },
  {
    category: "현재 문제",
    big: "crema_target",
    method: "fgd",
    coreQuestion: (problem, target) =>
      `「${clip(problem, 72)}」과(와) 직접 연결된, ${target}가 가장 크게 어려워하거나 좌절하는 순간·장벽은 무엇인가요?`,
    defaultInfoBullets: [
      "문제를 인식·표현하는 방식",
      "해결·완화를 시도할 때 막히는 지점",
      "정보 부족·동기 저하·접근성 문제",
      "이미 시도했지만 실패한 방법",
    ],
    enrichDimensions: ["primary_users", "situation"],
  },
  {
    category: "행동 & 맥락",
    big: "crema_target",
    method: "shadowing",
    coreQuestion: (problem, target) =>
      `「${clip(problem, 72)}」이 발생·반복되는 상황에서 ${target}는 어떤 행동 흐름(전·중·후)을 보이나요?`,
    defaultInfoBullets: [
      "문제 전·중·후 맥락과 순간",
      "반복되는 행동 순서·패턴",
      "우회·대안 행동",
      "문제가 커지는 조건·트리거",
    ],
    enrichDimensions: ["situation", "environment"],
  },
  {
    category: "기존 솔루션",
    big: "crema_competitor",
    method: "home_visit_in_depth",
    coreQuestion: (problem, target) =>
      `「${clip(problem, 72)}」과(와) 관련해 ${target}가 지금 쓰는 방법·앱·서비스·습관은 무엇이고, 무엇이 부족한가요?`,
    defaultInfoBullets: [
      "현재 쓰는 대안·습관",
      "만족·불만족 포인트",
      "경쟁·대체 수단 비교 기준",
      "기대 대비 핵심 갭",
    ],
    enrichDimensions: ["competitors", "products_services"],
  },
  {
    category: "동기 & 목표",
    big: "crema_target",
    method: "home_visit_in_depth",
    coreQuestion: (problem, target) =>
      `「${clip(problem, 72)}」을 해결하면 ${target}가 궁극적으로 얻고 싶은 경험·삶의 목표·가치는 무엇인가요?`,
    defaultInfoBullets: [
      "표면 욕구 너머의 목표",
      "안심·자유·성취 등 심리적 기대",
      "문제 해결 후 이상적 상태",
      "포기하지 않으려는 이유",
    ],
    enrichDimensions: ["primary_users"],
  },
];

function templateToRow(
  template: GuideTemplate,
  ctx: CremaToKnowBuildContext,
  problem: string,
  target: string,
): ToKnowRow {
  const preResearch = insightsForDimensions(ctx, template.enrichDimensions);
  const dimLabels = template.enrichDimensions
    .map((id) => getDimensionDef(id).label)
    .join("·");

  return {
    id: newRowId(template.category),
    big: template.big,
    mid: template.category,
    small: template.coreQuestion(problem, target),
    method: template.method,
    note: buildInfoToIdentify(
      template.defaultInfoBullets,
      preResearch,
      problem,
    ),
  };
}

/** 사전 조사 인사이트가 많은 영역 — 카테고리당 추가 행 */
function supplementalRowsFromPreResearch(
  ctx: CremaToKnowBuildContext,
  problem: string,
  target: string,
  seen: Set<string>,
): ToKnowRow[] {
  if (!problem.trim()) return [];

  const rows: ToKnowRow[] = [];
  const dims = ctx.selectedDimensions?.length
    ? ctx.selectedDimensions
    : (Object.keys(ctx.dimensionResearch ?? {}) as ContextualDimensionId[]);

  const categoryByDimension: Partial<
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

  for (const dimensionId of dims) {
    const category = categoryByDimension[dimensionId];
    if (!category) continue;

    const template = GUIDE_TEMPLATES.find((t) => t.category === category);
    if (!template) continue;

    const insights = insightsForDimensions(ctx, [dimensionId]);
    for (const insight of insights.slice(0, 2)) {
      const hypothesis = clip(insight, 56);
      const coreQuestion = `「${clip(problem, 56)}」 해결을 위해, 사전 조사에서 ${getDimensionDef(dimensionId).label} 관점의 「${hypothesis}」을(를) 사용자 조사로 어떻게 확인할 수 있을까요?`;
      const key = `${category}|${coreQuestion}`.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      rows.push({
        id: newRowId(`s2-${dimensionId}`),
        big: template.big,
        mid: category,
        small: coreQuestion,
        method: template.method,
        note: `파악 대상: ${hypothesis} — ${getDimensionDef(dimensionId).label}에서 「${clip(problem, 40)}」과(와) 연결된 구체 경험·행동·기대`,
      });
    }
  }

  return rows;
}

/** 가이드 5카테고리 + 문제점·사전 조사 연계 To-know 표 */
export function buildGuideToKnowTable(ctx: CremaToKnowBuildContext): ToKnowRow[] {
  const problem = ctx.startingPoint.trim();
  if (!problem) return [];

  const target = resolveTarget(ctx);
  const seen = new Set<string>();
  const rows: ToKnowRow[] = [];

  for (const template of GUIDE_TEMPLATES) {
    const row = templateToRow(template, ctx, problem, target);
    const key = `${row.mid}|${row.small}`.toLowerCase();
    seen.add(key);
    rows.push(row);
  }

  for (const extra of supplementalRowsFromPreResearch(ctx, problem, target, seen)) {
    rows.push(extra);
  }

  return rows;
}

export function sortRowsByGuideCategory(rows: ToKnowRow[]): ToKnowRow[] {
  const order = new Map(
    TO_KNOW_GUIDE_CATEGORY_ORDER.map((c, i) => [c, i]),
  );
  return [...rows].sort((a, b) => {
    const ca = a.mid.trim();
    const cb = b.mid.trim();
    const oa = order.get(ca as ToKnowGuideCategory) ?? 99;
    const ob = order.get(cb as ToKnowGuideCategory) ?? 99;
    if (oa !== ob) return oa - ob;
    return a.small.localeCompare(b.small, "ko");
  });
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
  return { big: "crema_target", method: "home_visit_in_depth" };
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
  return t?.big ?? "crema_target";
}
