const NAME_MAX_LEN = 16;

/** 호칭이 아닌 안내·요청 조각 */
const REJECT_FRAGMENT =
  /불러|부르|알려|입력|말씀|해\s*주|주세요|합니다|해요|예요|이에요|입니다|이름을|이름은|애칭을|호칭을|뭐라고|편하세요/;

const STOP_TOKENS =
  /^(?:저는|전은|전|나는|우리|제|이름은|이름|애칭|호칭|닉네임|별명|은|는|을|를|이|가|도|만)$/i;

/** 「지훈이라고 불러주세요」 등 */
const CALL_AS_PATTERNS: RegExp[] = [
  /([가-힣A-Za-z][가-힣A-Za-z·.'\-]{0,14}?)(?:이)?라고\s*(?:불러|부르)/,
  /([가-힣A-Za-z][가-힣A-Za-z·.'\-]{0,14}?)라고\s*(?:불러|부르)/,
  /([가-힣A-Za-z][가-힣A-Za-z·.'\-]{0,14}?)(?:이)?라고\s*(?:해|불릴)/,
];

/** 「저는 지훈이에요」「이름은 지훈」 등 */
const INTRO_PATTERNS: RegExp[] = [
  /(?:저는|전은|전|나는|제\s*이름은|이름은|호칭은)\s*([가-힣A-Za-z][가-힣A-Za-z·.'\-]{0,14}?)(?:이(?:고|며|다|에요|예요|입니다)?|(?:입니다|이에요|예요))?/,
  /(?:call\s+me|i\s*am|i'm|my\s+name\s+is)\s+([A-Za-z][A-Za-z'\-]{0,20})/i,
];

function cleanCandidate(raw: string): string {
  return raw
    .trim()
    .replace(/님$/, "")
    .replace(/(?:이라고|라고|입니다|이에요|예요|이고|이며|이에요|예요)$/g, "")
    .trim();
}

function isPlausibleName(candidate: string): boolean {
  const s = cleanCandidate(candidate);
  if (!s || s.length > NAME_MAX_LEN) return false;
  if (REJECT_FRAGMENT.test(s)) return false;
  if (/^[이름애칭호칭닉네임별명]+(?:을|를|은|는)?$/.test(s)) return false;
  if (/[?!.,]/.test(s)) return false;
  return true;
}

function pickFromPatterns(text: string, patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const m = text.match(re);
    if (!m?.[1]) continue;
    const c = cleanCandidate(m[1]);
    if (isPlausibleName(c)) return c;
  }
  return null;
}

function stripAttachedRequest(single: string): string {
  return single
    .replace(/(?:이)?라고\s*(?:불러|부르).*/i, "")
    .replace(/(?:이)?라고.*/i, "")
    .replace(/(?:불러|부르|알려).*/i, "")
    .trim();
}

/**
 * 이름·애칭 입력에서 호칭만 추출.
 * 문장 형태(「지훈이라고 불러주세요」 등)와 단답 모두 처리.
 */
export function parseDisplayName(text: string): string {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (!normalized) return "";

  const fromCall = pickFromPatterns(normalized, CALL_AS_PATTERNS);
  if (fromCall) return fromCall;

  const fromIntro = pickFromPatterns(normalized, INTRO_PATTERNS);
  if (fromIntro) return fromIntro;

  const quoted = normalized.match(/[「『"']([^」』"']{1,16})[」』"']/);
  if (quoted?.[1]) {
    const c = cleanCandidate(quoted[1]);
    if (isPlausibleName(c)) return c;
  }

  const parts = normalized.split(/\s+/).filter(Boolean);

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i]!;
    const next = parts[i + 1] ?? "";
    if (/^(?:이)?라고$/i.test(next) || /^(?:불러|부르)/i.test(next)) {
      const c = cleanCandidate(part);
      if (isPlausibleName(c)) return c;
    }
    if (/(?:이)?라고/i.test(part)) {
      const c = cleanCandidate(part.replace(/(?:이)?라고.*/i, ""));
      if (isPlausibleName(c)) return c;
    }
  }

  if (parts.length === 1) {
    const c = cleanCandidate(stripAttachedRequest(parts[0]!));
    if (isPlausibleName(c)) return c;
  }

  for (const part of parts) {
    if (STOP_TOKENS.test(part)) continue;
    let c = cleanCandidate(part);
    if (/(?:이)?라고/i.test(c)) {
      c = cleanCandidate(c.replace(/(?:이)?라고.*/i, ""));
    }
    if (isPlausibleName(c)) return c;
  }

  for (let i = parts.length - 1; i >= 0; i--) {
    const c = cleanCandidate(parts[i]!);
    if (isPlausibleName(c)) return c;
  }

  return cleanCandidate(stripAttachedRequest(normalized));
}

/** 온보딩에 쓸 수 있는 호칭인지 */
export function isPlausibleDisplayName(name: string): boolean {
  return isPlausibleName(name.trim());
}
