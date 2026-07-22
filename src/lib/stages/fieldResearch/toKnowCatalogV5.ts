/**
 * To-know list v5 구조 (to_know_list_v5.xlsx)
 * 대: 대상 · 회사 · 지역 · 정책·인프라 · 경쟁사 서비스
 */

import { formatAnswerList } from "@/lib/stages/stage2/contextualAnswers";
import type { ContextualDimensionAnswers } from "@/lib/stages/stage2/contextualDimensions";
import type { ContextualDimensionId } from "@/lib/stages/stage2/contextualDimensions";
import type { ContextualDimensionResearchMap } from "@/lib/stages/stage2/contextualDimensionResearch";
import { buildGuideToKnowTable } from "@/lib/stages/fieldResearch/toKnowGuideCategories";
import type { PrePmfPersonItem } from "@/lib/stages/stage2/prePmfOverview";
import type {
  ResearchMethodId,
  ToKnowBigCategoryId,
  ToKnowRow,
} from "@/lib/stages/fieldResearch/types";

/** To-know v5 대분류 */
export const TO_KNOW_V5_BIGS = [
  "tk_target",
  "tk_company",
  "tk_region",
  "tk_policy_infra",
  "tk_competitor",
] as const satisfies readonly ToKnowBigCategoryId[];

export type ToKnowV5BigId = (typeof TO_KNOW_V5_BIGS)[number];

export interface ToKnowBuildContext {
  startingPoint: string;
  /** 2단계 사전 조사에서 확정된 타겟 유저 */
  targetUsers?: PrePmfPersonItem[];
  personaName?: string;
  personaSituation?: string;
  contextualAnswers: ContextualDimensionAnswers;
  contextualInsights?: string;
  unknowns?: string[];
  dimensionResearch?: ContextualDimensionResearchMap;
  /** 2단계 자동 선정·조사한 맥락 영역 */
  selectedDimensions?: ContextualDimensionId[];
}

const TO_KNOW_BIG_LABELS: Record<ToKnowV5BigId, string> = {
  tk_target: "대상",
  tk_company: "회사",
  tk_region: "지역",
  tk_policy_infra: "정책·인프라",
  tk_competitor: "경쟁사·서비스",
};

const TO_KNOW_BIG_HINTS: Record<ToKnowV5BigId, string> = {
  tk_target:
    "Buyer · 기본정보·맥락·행동·문제인식·동기·기존솔루션 (HCI + HiDD)",
  tk_company: "자사(나) · 전략·역량·사업 모델",
  tk_region: "지역·상권·유동·임대 환경",
  tk_policy_infra: "규제·창업지원·결제·환경 인프라",
  tk_competitor: "경쟁·대안·플랫폼·서비스 갭",
};

export {
  DIMENSION_DEFAULT_METHOD,
  DIMENSION_TO_TO_KNOW_BIG,
} from "@/lib/stages/fieldResearch/toKnowDimensionMaps";

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
  big: ToKnowV5BigId;
  small: string;
  method: ResearchMethodId;
  note?: string;
};

/** HCI 핵심 질문 골격 (도메인 중립 템플릿) */
function coreToKnowSeedRows(problem: string, target: string): SeedRow[] {
  const p = problem.trim();
  const t = target.trim() || "주 사용자";
  return [
    {
      big: "tk_target",
      small: fill(
        "평소 하루를 어떻게 보내시나요? 그중 이 상황과 맞닿는 순간은 언제인가요?",
        { problem: p, target: t },
      ),
      method: "home_visit_in_depth",
    },
    {
      big: "tk_target",
      small: fill(
        "이 상황을 겪으시면서 가장 힘들었던 순간과 그때의 감정은 어땠나요?",
        { problem: p, target: t },
      ),
      method: "home_visit_in_depth",
    },
    {
      big: "tk_target",
      small: fill(
        "이 상황 전·중·후로 실제로 어떤 행동을 순서대로 하시나요?",
        { problem: p, target: t },
      ),
      method: "shadowing",
    },
    {
      big: "tk_target",
      small: fill(
        "지금 쓰고 계신 방법·대안은 무엇이고, 어디에서 아쉬움을 느끼시나요?",
        { problem: p, target: t },
      ),
      method: "home_visit_in_depth",
    },
    {
      big: "tk_target",
      small: fill(
        "말로는 잘 꺼내지 않지만 은근히 바라시는 것이 있다면 무엇인가요?",
        { problem: p, target: t },
      ),
      method: "home_visit_in_depth",
    },
    {
      big: "tk_company",
      small: fill("「{problem}」을(를) 다루는 우리 사업·역량·제약은 무엇인가요?", {
        problem: p,
        target: t,
      }),
      method: "desk_research",
    },
    {
      big: "tk_region",
      small: fill(
        "「{problem}」이(가) 두드러지는 지역·상권·유동인구 특성은 무엇인가요?",
        { problem: p, target: t },
      ),
      method: "desk_research",
    },
    {
      big: "tk_policy_infra",
      small: fill(
        "「{problem}」 사업·이용에 영향을 주는 정책·규제·인프라는 무엇인가요?",
        { problem: p, target: t },
      ),
      method: "desk_research",
    },
    {
      big: "tk_competitor",
      small: fill(
        "「{problem}」과(와) 경쟁·대체되는 선택지는 무엇이며, 사용자가 나누는 기준은?",
        { problem: p, target: t },
      ),
      method: "desk_research",
    },
    {
      big: "tk_competitor",
      small: fill(
        "기존 서비스가 「{problem}」 탐색·해결에서 채우지 못하는 핵심 갭은 무엇인가요?",
        { problem: p, target: t },
      ),
      method: "desk_research",
      note: "서비스 갭 분석",
    },
  ];
}

function minimalFallbackRows(problem: string, target: string): ToKnowRow[] {
  if (!problem.trim()) return [];
  return coreToKnowSeedRows(problem, target)
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
export function buildToKnowTable(ctx: ToKnowBuildContext): ToKnowRow[] {
  const problem = ctx.startingPoint.trim();
  const target =
    ctx.personaName?.trim() ||
    formatAnswerList(ctx.contextualAnswers.primary_users) ||
    "주 사용자";

  const fromGuide = buildGuideToKnowTable(ctx);
  if (fromGuide.length > 0) return fromGuide;

  return minimalFallbackRows(problem, target);
}

export function getToKnowV5BigLabel(big: ToKnowBigCategoryId): string {
  if (big in TO_KNOW_BIG_LABELS) {
    return TO_KNOW_BIG_LABELS[big as ToKnowV5BigId];
  }
  return big;
}

export function getToKnowV5BigHint(big: ToKnowBigCategoryId): string {
  if (big in TO_KNOW_BIG_HINTS) {
    return TO_KNOW_BIG_HINTS[big as ToKnowV5BigId];
  }
  return "";
}

export function defaultMethodForToKnowV5Big(
  big: ToKnowBigCategoryId,
): ResearchMethodId | "" {
  switch (big) {
    case "tk_target":
      return "home_visit_in_depth";
    case "tk_company":
    case "tk_region":
    case "tk_policy_infra":
    case "tk_competitor":
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
