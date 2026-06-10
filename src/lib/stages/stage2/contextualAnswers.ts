import type { ContextualDimensionId } from "@/lib/stages/stage2/contextualDimensions";

/** 괄호 안 쉼표는 항목 구분으로 쓰지 않음 — 예: 학생(대학생, 고등학생) */
export function splitListRespectingParens(text: string): string[] {
  const items: string[] = [];
  let buf = "";
  let depth = 0;
  for (const ch of text) {
    if (ch === "(" || ch === "（") depth += 1;
    if (ch === ")" || ch === "）") depth = Math.max(0, depth - 1);
    if (/[,\n、/·]/.test(ch) && depth === 0) {
      const part = buf.trim().replace(/^["'`「『]+|["'`」』]+$/g, "");
      if (part) items.push(part);
      buf = "";
    } else {
      buf += ch;
    }
  }
  const last = buf.trim().replace(/^["'`「『]+|["'`」』]+$/g, "");
  if (last) items.push(last);
  return items;
}

/** 복수 답변 한 줄·쉼표 입력 파싱 */
export function parseAnswerTokens(text: string): string[] {
  const t = text.trim();
  if (!t) return [];
  if (/[()]/.test(t)) {
    return splitListRespectingParens(t).filter((part) => part.length >= 1);
  }
  return t
    .split(/[\n,、/·]+/)
    .map((part) => part.trim().replace(/^["'`]+|["'`]+$/g, ""))
    .filter((part) => part.length >= 1);
}

export function formatAnswerList(items: string[] | undefined): string {
  if (!items?.length) return "";
  return items.join(", ");
}

export function formatAnswerLines(items: string[] | undefined): string {
  if (!items?.length) return "";
  return items.join("\n");
}

export function mergeAnswerItems(
  existing: string[] | undefined,
  added: string[],
): string[] {
  const out = [...(existing ?? [])];
  for (const raw of added) {
    const item = raw.trim();
    if (!item) continue;
    if (!out.includes(item)) out.push(item);
  }
  return out;
}

export function hasDimensionAnswers(
  answers: Partial<Record<ContextualDimensionId, string[]>>,
  id: ContextualDimensionId,
): boolean {
  return (answers[id]?.length ?? 0) > 0;
}

export function normalizeAnswerValue(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((x): x is string => typeof x === "string")
      .map((x) => x.trim())
      .filter(Boolean);
  }
  if (typeof value === "string" && value.trim()) {
    return parseAnswerTokens(value);
  }
  return [];
}

export function isAdvanceStepIntent(text: string): boolean {
  return /^(다음|다음\s*항목|넘어가|이\s*항목\s*완료|입력\s*완료)\s*[.!]?$/i.test(
    text.trim(),
  );
}

export function isPrevStepIntent(text: string): boolean {
  return /^(이전|이전\s*항목|뒤로|이전으로)\s*[.!]?$/i.test(text.trim());
}
