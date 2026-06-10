import type { ContextualDimensionId } from "@/lib/stages/stage2/contextualDimensions";
import { parseProfileItem } from "@/lib/stages/stage2/peopleFindingsPresentation";
import {
  isPeopleContextualDimension,
  parsePeopleFindingsSections,
  type PeopleContextualDimensionId,
} from "@/lib/stages/stage2/peopleContextualResearch";
import {
  isInterrogativeLine,
  sanitizeContextualFindings,
} from "@/lib/stages/stage2/sanitizeContextualFindings";

function shortPrimaryUserLabel(item: string): string {
  const parsed = parseProfileItem(item);
  if (parsed.identity) {
    return `${parsed.segment} (${parsed.identity})`;
  }
  return parsed.segment || item;
}

/** 사람 영역 — 프로필·역할 섹션에서 상세 불릿 추출 */
export function extractPeopleAnswerBulletsFromFindings(
  findings: string,
  dimensionId?: PeopleContextualDimensionId,
): string[] {
  const sections = parsePeopleFindingsSections(findings);
  const bullets: string[] = [];

  for (const section of sections) {
    const isProfile = /누구인지|프로필/u.test(section.title);
    for (const item of section.items) {
      if (isInterrogativeLine(item) || item.length < 4) continue;
      const value =
        dimensionId === "primary_users" && isProfile
          ? shortPrimaryUserLabel(item)
          : item;
      if (!bullets.includes(value)) bullets.push(value);
    }
  }

  return bullets.slice(0, 12);
}

/** 사전 조사 결과 텍스트에서 캔버스·To-know용 불릿 추출 (질문·의문형 제외) */
export function extractAnswerBulletsFromFindings(
  findings: string,
  dimensionId?: ContextualDimensionId,
): string[] {
  if (dimensionId && isPeopleContextualDimension(dimensionId)) {
    const people = extractPeopleAnswerBulletsFromFindings(findings, dimensionId);
    if (people.length) return people;
  }
  const lines = sanitizeContextualFindings(findings)
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const bullets: string[] = [];

  for (const line of lines) {
    if (!/^[·•\-*]/.test(line)) continue;
    const item = line
      .replace(/^[·•\-*]\s*/, "")
      .replace(/^\[[^\]]+\]\s*/, "")
      .trim();
    if (
      item.length < 3 ||
      item.startsWith("※") ||
      isInterrogativeLine(item) ||
      /^(핵심 발견|현장에서|참고할|정리한 후보|사전 조사|확인할 질문)/u.test(
        item,
      )
    ) {
      continue;
    }
    if (!bullets.includes(item)) bullets.push(item);
  }

  return bullets.slice(0, 8);
}
