const QUESTION_SECTION_HEADERS =
  /^(?:현장에서\s*)?(?:확인할\s*)?질문|현장에서\s*확인|조사\s*질문|검증\s*질문/u;

const DECLARATIVE_SECTION_HEADERS =
  /^(?:핵심\s*발견|참고할\s*관점|정리한\s*후보|사전\s*조사|정리|요약)/u;

const INTERROGATIVE_ENDING =
  /(?:인가요|일까요|할까요|있나요|없나요|겠어요|겠습니까|습니까|니까|나요|을까|ㄹ까|까요|지요|죠|세요|할지|인지)\s*[?.!？]?$/u;

function stripBulletPrefix(line: string): string {
  return line
    .replace(/^[·•\-*]\s*/, "")
    .replace(/^\[[^\]]+\]\s*/, "")
    .trim();
}

function isSectionHeaderLine(line: string): boolean {
  const t = stripBulletPrefix(line);
  return t.length > 0 && t.length < 48 && !/[.!?？]$/.test(t) && !/^[·•\-*]/.test(line.trim());
}

/** 의문형·질문형 문장 여부 */
export function isInterrogativeLine(text: string): boolean {
  const t = stripBulletPrefix(text).trim();
  if (!t || t.length < 2) return false;
  if (/[?？]$/.test(t)) return true;
  if (INTERROGATIVE_ENDING.test(t)) return true;
  if (
    /^(?:무엇|어떤|어디|언제|왜|누가|누구|어느|몇|얼마|어떻게|어느\s*정도)/u.test(t) &&
    /(?:인가|일까|할까|있나|없나|겠어|습니까|나요|까요)/u.test(t)
  ) {
    return true;
  }
  return false;
}

function isQuestionSectionHeader(line: string): boolean {
  const t = stripBulletPrefix(line);
  return QUESTION_SECTION_HEADERS.test(t);
}

/** 사전 조사 본문에서 질문 섹션·의문형 줄 제거 */
export function sanitizeContextualFindings(findings: string): string {
  const lines = findings.split("\n");
  const out: string[] = [];
  let inQuestionSection = false;

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (!trimmed) {
      if (!inQuestionSection) out.push("");
      continue;
    }

    if (isQuestionSectionHeader(trimmed)) {
      inQuestionSection = true;
      continue;
    }

    if (
      inQuestionSection &&
      isSectionHeaderLine(trimmed) &&
      DECLARATIVE_SECTION_HEADERS.test(stripBulletPrefix(trimmed))
    ) {
      inQuestionSection = false;
    } else if (inQuestionSection && isSectionHeaderLine(trimmed)) {
      inQuestionSection = false;
    }

    if (inQuestionSection) continue;
    if (isInterrogativeLine(trimmed)) continue;

    out.push(line);
  }

  return out
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** 캔버스·불릿 표시용 항목 필터 */
export function filterDeclarativeBullets(items: string[]): string[] {
  return items
    .map((item) => item.trim())
    .filter((item) => item.length >= 2 && !isInterrogativeLine(item));
}
