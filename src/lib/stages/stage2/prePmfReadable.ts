/** 사전 조사 본문 — 문단·불릿 파싱·정규화 */

export type PrePmfReadableBlock =
  | { type: "paragraph"; text: string }
  | { type: "bullets"; items: string[] };

const BULLET_LINE = /^[·•\-*]\s*/;
const NUMBERED_LINE = /^\d+[.)]\s*/;

/** 본문 줄 끝 인라인 출처·URL·인용 번호 제거 (하단 링크 칩만 사용) */
const INLINE_SOURCE_PAREN =
  /\s*[\[(（]\s*(?:출처|근거|참고|Source|source)\s*[:：]?\s*[^\])）\n]+[\])）]/gi;
const INLINE_URL_PAREN = /\s*[\[(（]\s*https?:\/\/[^\])）\s]+[\])）]/gi;
const TRAILING_URL = /\s+https?:\/\/\S+$/gi;
const TRAILING_CITATION_NUM = /\s*[\[(（]\d{1,2}[\])）]\s*$/g;
const TRAILING_DOMAIN_TAIL =
  /\s*[—–\-]\s*(?:[a-z0-9][a-z0-9.-]*\.)+[a-z]{2,}(?:\/\S*)?\s*$/i;

function stripPrePmfInlineSourceLine(line: string): string {
  let s = line;
  s = s.replace(INLINE_SOURCE_PAREN, "");
  s = s.replace(INLINE_URL_PAREN, "");
  s = s.replace(TRAILING_URL, "");
  s = s.replace(TRAILING_CITATION_NUM, "");
  s = s.replace(TRAILING_DOMAIN_TAIL, "");
  // 줄 끝 "출처: …" / "근거: …" (괄호 없이)
  s = s.replace(
    /\s*(?:출처|근거|참고)\s*[:：]\s*(?:https?:\/\/)?\S+\s*$/gi,
    "",
  );
  return s.replace(/\s{2,}/g, " ").trim();
}

/** 사전 조사 본문 — 문장별 인라인 출처 표기 제거 */
export function stripPrePmfInlineSources(text: string): string {
  const t = text.trim();
  if (!t) return "";
  return t
    .split("\n")
    .map((line) => stripPrePmfInlineSourceLine(line))
    .filter(Boolean)
    .join("\n");
}

function stripBulletPrefix(line: string): string {
  return line.replace(BULLET_LINE, "").replace(NUMBERED_LINE, "").trim();
}

/** 한 문장 덩어리를 읽기 쉬운 불릿 줄로 분리 */
export function splitPrePmfSentences(text: string): string[] {
  const t = text.trim();
  if (!t) return [];

  const byNewline = t
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (byNewline.length > 1) {
    return byNewline.map(stripBulletPrefix).filter(Boolean);
  }

  const parts = t.split(
    /(?<=[다요음니다]\.)\s+|(?<=[다요음니다]\?)\s+|(?<=[다요음니다]!)\s+|(?<=[다요음니다]…)\s+/,
  );

  const sentences = parts.map((p) => p.trim()).filter(Boolean);
  if (sentences.length >= 2) return sentences;
  return [t];
}

/** 저장·표시용 본문 — 불릿 줄 형식으로 정규화 */
export function normalizePrePmfReadableBody(text: string): string {
  const t = stripPrePmfInlineSources(text);
  if (!t) return "";

  const lines = t
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const hasBulletLines = lines.some(
    (line) => BULLET_LINE.test(line) || NUMBERED_LINE.test(line),
  );

  if (hasBulletLines) {
    return lines
      .map((line) => {
        const body = stripBulletPrefix(line);
        return body ? `· ${body}` : "";
      })
      .filter(Boolean)
      .join("\n");
  }

  return splitPrePmfSentences(t)
    .map((sentence) => `· ${sentence}`)
    .join("\n");
}

/** 인접한 동일 줄 제거 (같은 문장이 두 번 저장된 경우 방지) */
function dedupeAdjacentLines(lines: string[]): string[] {
  const out: string[] = [];
  for (const line of lines) {
    const normalized = stripBulletPrefix(line);
    const prev = out.length ? stripBulletPrefix(out[out.length - 1]!) : null;
    if (prev !== null && normalized === prev) continue;
    out.push(line);
  }
  return out;
}

export function parsePrePmfReadableText(text: string): PrePmfReadableBlock[] {
  const t = text.trim();
  if (!t) return [];

  const lines = dedupeAdjacentLines(
    t
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean),
  );

  const bulletLines = lines.filter(
    (line) => BULLET_LINE.test(line) || NUMBERED_LINE.test(line),
  );
  const plainLines = lines.filter(
    (line) => !BULLET_LINE.test(line) && !NUMBERED_LINE.test(line),
  );

  const blocks: PrePmfReadableBlock[] = [];

  if (plainLines.length) {
    blocks.push({ type: "paragraph", text: plainLines.join("\n") });
  }

  if (bulletLines.length) {
    blocks.push({
      type: "bullets",
      items: bulletLines.map(stripBulletPrefix).filter(Boolean),
    });
    return blocks;
  }

  const sentences = splitPrePmfSentences(t);
  if (sentences.length >= 2) {
    blocks.push({ type: "bullets", items: sentences });
    return blocks;
  }

  blocks.push({ type: "paragraph", text: t });
  return blocks;
}

/** 렌즈 본문 — 주제(불릿·문단) 단위로 분리 */
export function splitPrePmfSectionTopics(text: string): string[] {
  const t = text.trim();
  if (!t) return [];

  const topics: string[] = [];
  for (const block of parsePrePmfReadableText(t)) {
    if (block.type === "bullets") {
      topics.push(...block.items);
      continue;
    }
    topics.push(...splitPrePmfSentences(block.text));
  }
  return topics.filter(Boolean);
}

/** 주제 목록 → 저장용 불릿 본문 */
export function composePrePmfSectionBody(topics: string[]): string {
  return normalizePrePmfReadableBody(
    topics
      .map((topic) => topic.trim())
      .filter(Boolean)
      .join("\n"),
  );
}
