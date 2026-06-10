import type {
  ToKnowBigCategoryId,
  ToKnowRow,
} from "@/lib/stages/fieldResearch/types";

/** Porter 레거시 → CREMA v5 대분류 */
const LEGACY_BIG_TO_CREMA: Partial<Record<ToKnowBigCategoryId, ToKnowBigCategoryId>> =
  {
    company: "crema_company",
    customer: "crema_target",
    competitor: "crema_competitor",
    new_comer: "crema_competitor",
    supplier: "crema_policy_infra",
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

/** 레거시 To-know 행 → CREMA v5 + 질문만 유지 */
export function migrateToKnowRow(row: ToKnowRow): ToKnowRow {
  let next = stripLegacySmallCode(row as ToKnowRow & { smallCode?: string });
  const cremaBig = LEGACY_BIG_TO_CREMA[row.big];
  if (cremaBig) {
    next = { ...next, big: cremaBig };
  }
  if (PERSONA_AXIS_BIGS.includes(row.big)) {
    const axis = PERSONA_AXIS_MID_PREFIX[row.big] ?? "Customer";
    const mergedMid = withCustomerMidPrefix(axis, row.mid);
    next = {
      ...next,
      big: "crema_target",
      small: next.small.trim() || mergedMid,
      mid: "",
    };
    return next;
  }
  return flattenMidIntoQuestion(next);
}

export function migrateToKnowTable(rows: ToKnowRow[]): ToKnowRow[] {
  return rows.map(migrateToKnowRow);
}
