import {
  migrateGuideCategoryLayout,
  sanitizeToKnowCoreQuestion,
} from "@/lib/stages/fieldResearch/toKnowGuideCategories";
import type {
  ToKnowBigCategoryId,
  ToKnowRow,
} from "@/lib/stages/fieldResearch/types";

/** 이전 저장값(구 v5 id) → tk_* */
const LEGACY_STORED_BIG_IDS: Record<string, ToKnowBigCategoryId> = {
  crema_target: "tk_target",
  crema_company: "tk_company",
  crema_region: "tk_region",
  crema_policy_infra: "tk_policy_infra",
  crema_competitor: "tk_competitor",
};

/** Porter 레거시 → To-know v5 대분류 */
const LEGACY_BIG_TO_TO_KNOW: Partial<
  Record<ToKnowBigCategoryId, ToKnowBigCategoryId>
> = {
  company: "tk_company",
  customer: "tk_target",
  competitor: "tk_competitor",
  new_comer: "tk_competitor",
  supplier: "tk_policy_infra",
};

/** 구 4축 대분류 → Customer 중분류 접두 */
const PERSONA_AXIS_BIGS: ToKnowBigCategoryId[] = [
  "persona_basics",
  "lifestyle",
  "surrounding_context",
  "problem_perception_behavior",
];

const PERSONA_AXIS_MID_PREFIX: Partial<Record<ToKnowBigCategoryId, string>> = {
  persona_basics: "기본 정보",
  lifestyle: "라이프스타일",
  surrounding_context: "맥락",
  problem_perception_behavior: "문제 인식·행태",
};

function withCustomerMidPrefix(axis: string, mid: string): string {
  const trimmed = mid.trim();
  if (!trimmed) return axis;
  if (trimmed.startsWith(`${axis} ·`) || trimmed.startsWith(`${axis}·`)) {
    return trimmed;
  }
  return `${axis} · ${trimmed}`;
}

function stripLegacySmallCode(
  row: ToKnowRow & { smallCode?: string },
): ToKnowRow {
  const { smallCode: _omit, ...rest } = row;
  return rest;
}

/** 레거시 mid 값을 질문(small)으로 합치고 mid는 비움 */
function flattenMidIntoQuestion(row: ToKnowRow): ToKnowRow {
  const mid = row.mid.trim();
  const small = row.small.trim();
  if (!mid) return { ...row, mid: "" };
  if (!small) return { ...row, small: mid, mid: "" };
  return { ...row, mid: "" };
}

function normalizeBigCategory(big: ToKnowBigCategoryId): ToKnowBigCategoryId {
  return (
    LEGACY_STORED_BIG_IDS[big as string] ??
    LEGACY_BIG_TO_TO_KNOW[big] ??
    big
  );
}

/** 레거시 To-know 행 → v5 대분류 + 질문만 유지 */
export function migrateToKnowRow(row: ToKnowRow): ToKnowRow {
  let next = stripLegacySmallCode(row as ToKnowRow & { smallCode?: string });
  const normalizedBig = normalizeBigCategory(row.big);
  if (normalizedBig !== row.big) {
    next = { ...next, big: normalizedBig };
  }
  if (PERSONA_AXIS_BIGS.includes(row.big)) {
    const axis = PERSONA_AXIS_MID_PREFIX[row.big] ?? "Customer";
    const mergedMid = withCustomerMidPrefix(axis, row.mid);
    next = {
      ...next,
      big: "tk_target",
      small: next.small.trim() || mergedMid,
      mid: "",
    };
    return next;
  }
  return flattenMidIntoQuestion(next);
}

export function migrateToKnowTable(rows: ToKnowRow[]): ToKnowRow[] {
  const normalized = rows.map(migrateToKnowRow);
  return migrateGuideCategoryLayout(normalized);
}

/** 전역 핵심 질문 + info 전용 표로 정리 */
export function finalizeToKnowData(
  table: ToKnowRow[],
  storedCore = "",
): { toKnowCoreQuestion: string; toKnowTable: ToKnowRow[] } {
  const toKnowCoreQuestion = sanitizeToKnowCoreQuestion(storedCore);
  const toKnowTable = migrateToKnowTable(table).filter(
    (r) => r.rowKind !== "core",
  );
  return { toKnowCoreQuestion, toKnowTable };
}
