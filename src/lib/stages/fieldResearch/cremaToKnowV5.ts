/**
 * CREMA Research To Know List v5 구조 (crema_to_know_list_v5.xlsx)
 * 대: 대상 · 회사 · 지역 · 정책·인프라 · 경쟁사 서비스
 * 대분류별 To-know 질문 · 조사 방법
 */

import { formatAnswerList } from "@/lib/stages/stage2/contextualAnswers";
import type { ContextualDimensionAnswers } from "@/lib/stages/stage2/contextualDimensions";
import type { ContextualDimensionId } from "@/lib/stages/stage2/contextualDimensions";
import type { ContextualDimensionResearchMap } from "@/lib/stages/stage2/contextualDimensionResearch";
import { buildGuideToKnowTable } from "@/lib/stages/fieldResearch/toKnowGuideCategories";
import type {
  ResearchMethodId,
  ToKnowBigCategoryId,
  ToKnowRow,
} from "@/lib/stages/fieldResearch/types";

/** CREMA v5 대분류 (xlsx 「대」 열) */
export const CREMA_TO_KNOW_BIGS = [
  "crema_target",
  "crema_company",
  "crema_region",
  "crema_policy_infra",
  "crema_competitor",
] as const satisfies readonly ToKnowBigCategoryId[];

export type CremaToKnowBigId = (typeof CREMA_TO_KNOW_BIGS)[number];

export interface CremaToKnowBuildContext {
  startingPoint: string;
  personaName?: string;
  personaSituation?: string;
  contextualAnswers: ContextualDimensionAnswers;
  contextualInsights?: string;
  unknowns?: string[];
  dimensionResearch?: ContextualDimensionResearchMap;
  /** 2단계 자동 선정·조사한 맥락 영역 */
  selectedDimensions?: ContextualDimensionId[];
}

const CREMA_BIG_LABELS: Record<CremaToKnowBigId, string> = {
  crema_target: "대상",
  crema_company: "회사",
  crema_region: "지역",
  crema_policy_infra: "정책·인프라",
  crema_competitor: "경쟁사·서비스",
};

const CREMA_BIG_HINTS: Record<CremaToKnowBigId, string> = {
  crema_target:
    "Buyer · 기본정보·맥락·행동·문제인식·동기·기존솔루션 (HCI + HiDD)",
  crema_company: "자사(나) · 전략·역량·사업 모델",
  crema_region: "지역·상권·유동·임대 환경",
  crema_policy_infra: "규제·창업지원·결제·환경 인프라",
  crema_competitor: "경쟁·대안·플랫폼·서비스 갭",
};

export {
  DIMENSION_DEFAULT_METHOD,
  DIMENSION_TO_CREMA_BIG,
} from "@/lib/stages/fieldResearch/toKnowDimensionMaps";

function clip(s: string, max = 48): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max)}…`;
}

function newRowId(prefix: string): string {
  return `tok-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function fill(
  template: string,
  ctx: { problem: string; item?: string; target?: string },
): string {
  const problem = ctx.problem.trim() || "이 문제";
  const item = ctx.item?.trim() || "해당 대상";
  const target = ctx.target?.trim() || "주 사용자";
  return template
    .replace(/\{problem\}/g, problem)
    .replace(/\{item\}/g, item)
    .replace(/\{target\}/g, target);
}

type SeedRow = {
  big: CremaToKnowBigId;
  small: string;
  method: ResearchMethodId;
  note?: string;
};

/** CREMA v5 + HCI 핵심 질문 골격 (도메인 중립 템플릿) */
function coreCremaSeedRows(problem: string, target: string): SeedRow[] {
  const p = problem.trim();
  const t = target.trim() || "주 사용자";
  return [
    {
      big: "crema_target",
      small: fill(
        "「{target}」의 역할·생활 단계·배경은 무엇인가요? (가설)",
        { problem: p, target: t },
      ),
      method: "home_visit_in_depth",
    },
    {
      big: "crema_target",
      small: fill(
        "「{problem}」 전·중·후에 「{target}」이(가) 거치는 상황(Pre/On/Post)은 무엇인가요?",
        { problem: p, target: t },
      ),
      method: "shadowing",
    },
    {
      big: "crema_target",
      small: fill(
        "「{problem}」과(와) 관련해 「{target}」이(가) 실제로 하는 행동 흐름은 어떤가요?",
        { problem: p, target: t },
      ),
      method: "shadowing",
    },
    {
      big: "crema_target",
      small: fill(
        "「{problem}」을(를) 해결·완화하려 할 때 가장 불편하거나 막히는 지점은 무엇인가요?",
        { problem: p, target: t },
      ),
      method: "home_visit_in_depth",
    },
    {
      big: "crema_target",
      small: fill(
        "「{target}」이(가) 궁극적으로 얻고 싶은 경험·결과는 무엇인가요? (Latent needs)",
        { problem: p, target: t },
      ),
      method: "fgd",
    },
    {
      big: "crema_target",
      small: fill(
        "「{problem}」과(와) 관련해 지금 쓰는 앱·서비스·습관은 무엇이고, 무엇이 부족한가요?",
        { problem: p, target: t },
      ),
      method: "home_visit_in_depth",
    },
    {
      big: "crema_company",
      small: fill("「{problem}」을(를) 다루는 우리 사업·역량·제약은 무엇인가요?", {
        problem: p,
        target: t,
      }),
      method: "desk_research",
    },
    {
      big: "crema_region",
      small: fill(
        "「{problem}」이(가) 두드러지는 지역·상권·유동인구 특성은 무엇인가요?",
        { problem: p, target: t },
      ),
      method: "desk_research",
    },
    {
      big: "crema_policy_infra",
      small: fill(
        "「{problem}」 사업·이용에 영향을 주는 정책·규제·인프라는 무엇인가요?",
        { problem: p, target: t },
      ),
      method: "desk_research",
    },
    {
      big: "crema_competitor",
      small: fill(
        "「{problem}」과(와) 경쟁·대체되는 선택지는 무엇이며, 사용자가 나누는 기준은?",
        { problem: p, target: t },
      ),
      method: "desk_research",
    },
    {
      big: "crema_competitor",
      small: fill(
        "기존 서비스가 「{problem}」 탐색·해결에서 채우지 못하는 핵심 갭은 무엇인가요?",
        { problem: p, target: t },
      ),
      method: "desk_research",
      note: "CREMA v5 · 서비스 갭 분석",
    },
  ];
}

/** 사전 조사·문제점 기반 질문이 없을 때만 쓰는 최소 골격 */
function minimalFallbackRows(problem: string, target: string): ToKnowRow[] {
  if (!problem.trim()) return [];
  return coreCremaSeedRows(problem, target)
    .slice(0, 4)
    .map(seedToRow);
}

function seedToRow(seed: SeedRow): ToKnowRow {
  return {
    id: newRowId(seed.small.slice(0, 24)),
    big: seed.big,
    mid: "",
    small: seed.small,
    method: seed.method,
    note: seed.note,
  };
}

/** 1단계 문제점 + 2단계 사전 조사 · 가이드 5카테고리 To-know 표 생성 */
export function buildCremaToKnowTable(ctx: CremaToKnowBuildContext): ToKnowRow[] {
  const problem = ctx.startingPoint.trim();
  const target =
    ctx.personaName?.trim() ||
    formatAnswerList(ctx.contextualAnswers.primary_users) ||
    "주 사용자";

  const fromGuide = buildGuideToKnowTable(ctx);
  if (fromGuide.length > 0) return fromGuide;

  return minimalFallbackRows(problem, target);
}

export function getCremaToKnowBigLabel(big: ToKnowBigCategoryId): string {
  if (big in CREMA_BIG_LABELS) {
    return CREMA_BIG_LABELS[big as CremaToKnowBigId];
  }
  return big;
}

export function getCremaToKnowBigHint(big: ToKnowBigCategoryId): string {
  if (big in CREMA_BIG_HINTS) {
    return CREMA_BIG_HINTS[big as CremaToKnowBigId];
  }
  return "";
}

export function defaultMethodForCremaBig(
  big: ToKnowBigCategoryId,
): ResearchMethodId | "" {
  switch (big) {
    case "crema_target":
      return "home_visit_in_depth";
    case "crema_company":
    case "crema_region":
    case "crema_policy_infra":
    case "crema_competitor":
      return "desk_research";
    default:
      return "desk_research";
  }
}

export function inferResearchMethodsFromTable(
  rows: ToKnowRow[],
): ResearchMethodId[] {
  const set = new Set<ResearchMethodId>();
  for (const r of rows) {
    if (r.method) set.add(r.method);
  }
  return [...set];
}
