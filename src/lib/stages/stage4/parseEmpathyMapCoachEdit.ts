import { parseAnswerTokens } from "@/lib/stages/stage2/contextualAnswers";
import type {
  EmpathyQuadrantId,
  EmpathyStickyItem,
} from "@/lib/stages/stage2/empathyMap";
import { createEmpathyStickyItem } from "@/lib/stages/stage4/empathySticky";
import type { Stage4PersonaEmpathyMap } from "@/lib/stages/stage4/types";

export interface CoachHistoryTurn {
  role: "user" | "model";
  content: string;
}

export type EmpathyMapEditMode = "merge" | "replace";

export interface EmpathyMapEditPatch {
  personaIndex?: number;
  quadrants: Partial<Record<EmpathyQuadrantId, string[]>>;
  mode: EmpathyMapEditMode;
}

const EMPATHY_EDIT_LINE =
  /EDIT:empathy(?::(\d+))?:(says|thinks|does|feels)\|([^\n]+)/gi;

const QUADRANT_SPECS: { id: EmpathyQuadrantId; labels: string[] }[] = [
  { id: "says", labels: ["말함", "says", "말한", "발화"] },
  { id: "thinks", labels: ["생각함", "thinks", "생각", "속마음"] },
  { id: "does", labels: ["행동함", "does", "행동"] },
  { id: "feels", labels: ["느낌", "feels", "감정"] },
];

const APPLY_INTENT =
  /(?:반영|넣어|추가|적용|업데이트|채워|기록|적어|옮겨|넣어줘|넣어 주|반영해|적용해)/u;

const REPLACE_INTENT = /(?:바꿔|바꾸|수정|변경|교체|덮어|전부|다시\s*써)/u;

/** 「방금 말함 예시 반영해줘」 — 칸 이름·메타만 있고 실제 포스트잇 문장이 없음 */
const REFERENCE_APPLY_REQUEST =
  /(?:방금|위|아까|앞서|이전|제안(?:한|해)?|말(?:한|씀|해)|얘기(?:한|해)?|조언(?:한|해)?)/u;

const META_STICKY_CONTENT =
  /^(?:방금\s*)?(?:말함|생각함|행동함|느낌|says|thinks|does|feels)(?:\s*예시)?$|^(?:왼쪽\s*)?(?:공감맵|작업\s*영역)(?:에)?$|^예시(?:를)?$|^예시를\s*왼쪽(?:\s*공감맵)?에$/iu;

function stripQuoteWrappers(text: string): string {
  return text
    .trim()
    .replace(/^["'`「『]+|["'`」』]+$/g, "")
    .trim();
}

/** EDIT 줄·코치 제안 — `||` 구분 우선 */
export function isValidEmpathyStickyContent(text: string): boolean {
  const t = stripQuoteWrappers(text);
  if (t.length < 2) return false;
  if (META_STICKY_CONTENT.test(t)) return false;
  if (/^(?:예시|제안|내용|반영|적용)(?:를|을)?$/u.test(t)) return false;
  if (/왼쪽\s*공감맵/u.test(t) && t.length < 24) return false;
  return true;
}

export function filterEmpathyStickyTexts(texts: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of texts) {
    const t = stripQuoteWrappers(raw);
    if (!isValidEmpathyStickyContent(t)) continue;
    if (seen.has(t)) continue;
    seen.add(t);
    out.push(t);
  }
  return out;
}

export function parseEmpathyEditItems(raw: string): string[] {
  const t = raw.trim();
  if (!t) return [];
  if (t.includes("||")) {
    return filterEmpathyStickyTexts(
      t.split(/\s*\|\|\s*/).map(stripQuoteWrappers),
    );
  }
  return filterEmpathyStickyTexts(
    parseAnswerTokens(t).map(stripQuoteWrappers),
  );
}

/** 이전 코치 예시를 왼쪽에 옮기라는 요청인지 (실제 문장 없음) */
export function isReferenceOnlyApplyRequest(message: string): boolean {
  const text = message.trim();
  if (!text || !APPLY_INTENT.test(text)) return false;
  if (extractQuotedStrings(text).length > 0) return false;

  if (REFERENCE_APPLY_REQUEST.test(text)) return true;
  if (/(?:예시|제안|내용).*(?:반영|넣|적용|업데이트|채워)/u.test(text)) {
    return true;
  }
  return false;
}

/** 반영 대상 칸 — 미지정 시 이전 코치 메시지에서 찾은 모든 칸 */
export function parseRequestedQuadrantsFromMessage(
  message: string,
): EmpathyQuadrantId[] | "all" {
  const text = message.trim();
  if (/(?:네\s*칸|네칸|전체|모두|다\s*반영|다\s*넣)/u.test(text)) {
    return "all";
  }

  const found: EmpathyQuadrantId[] = [];
  for (const spec of QUADRANT_SPECS) {
    for (const label of spec.labels) {
      if (new RegExp(label, "iu").test(text)) {
        if (!found.includes(spec.id)) found.push(spec.id);
      }
    }
  }
  return found;
}

function quadrantHeaderOnLine(line: string): EmpathyQuadrantId | null {
  const t = line.trim();
  if (!t) return null;
  for (const spec of QUADRANT_SPECS) {
    for (const label of spec.labels) {
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (
        new RegExp(`^${escaped}(?:\\s*\\(|\\s*:|\\s|$)`, "iu").test(t) ||
        new RegExp(`${escaped}\\s*\\(`, "iu").test(t) ||
        new RegExp(`${escaped}(?:\\s*칸)?(?:에는|은|는|에)`, "iu").test(t)
      ) {
        return spec.id;
      }
    }
  }
  return null;
}

/** 코치 말풍선 본문에서 칸별 「인용」·번호 목록 추출 */
export function extractEmpathyExamplesFromCoachText(
  text: string,
): Partial<Record<EmpathyQuadrantId, string[]>> {
  const result: Partial<Record<EmpathyQuadrantId, string[]>> = {};
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  let current: EmpathyQuadrantId | null = null;

  const push = (quadrant: EmpathyQuadrantId, items: string[]) => {
    const valid = filterEmpathyStickyTexts(items);
    if (!valid.length) return;
    result[quadrant] = [...(result[quadrant] ?? []), ...valid];
  };

  for (const line of lines) {
    const header = quadrantHeaderOnLine(line);
    if (header) {
      current = header;
      push(header, extractQuotedStrings(line));
      continue;
    }

    if (!current) continue;

    push(current, extractQuotedStrings(line));

    const numbered = line.match(/^\s*\d+[.)]\s*(.+)$/u);
    if (numbered?.[1]) {
      push(current, [numbered[1]]);
    }

    const exampleTail = line.match(/예를\s*들어\s*[-—]\s*(.+)$/iu);
    if (exampleTail?.[1]) {
      const parts = exampleTail[1]
        .split(/\s*\/\s*/)
        .map((p) => p.replace(/\s*처럼요[.]?$/iu, "").trim());
      push(current, parts);
    }
  }

  return result;
}

/** 직전 코치 발화에서 (가설) 예시 수집 */
export function extractEmpathyExamplesFromHistory(
  history: CoachHistoryTurn[],
  requested: EmpathyQuadrantId[] | "all",
): EmpathyMapEditPatch | null {
  const coachTexts = history
    .filter((t) => t.role === "model")
    .map((t) => t.content)
    .reverse();

  const merged: Partial<Record<EmpathyQuadrantId, string[]>> = {};

  for (const text of coachTexts) {
    const block = extractEmpathyExamplesFromCoachText(text);
    for (const [key, items] of Object.entries(block) as [
      EmpathyQuadrantId,
      string[],
    ][]) {
      if (requested !== "all" && !requested.includes(key)) continue;
      merged[key] = filterEmpathyStickyTexts([
        ...(merged[key] ?? []),
        ...items,
      ]);
    }
  }

  if (requested !== "all" && requested.length > 0) {
    const hasRequested = requested.some((q) => (merged[q]?.length ?? 0) > 0);
    if (!hasRequested) return null;
  } else if (!Object.keys(merged).length) {
    return null;
  }

  return {
    quadrants: merged,
    mode: "merge",
  };
}

function patchFromReferenceContext(
  userMessage: string,
  history: CoachHistoryTurn[],
  coachReply?: string,
): EmpathyMapEditPatch | null {
  const requested = parseRequestedQuadrantsFromMessage(userMessage);
  const scope: EmpathyQuadrantId[] | "all" =
    requested.length > 0 ? requested : "all";

  const fromHistory = extractEmpathyExamplesFromHistory(history, scope);
  const replyText = coachReply ? stripEmpathyMapEditMetaLines(coachReply) : "";
  const fromReply = replyText
    ? extractEmpathyExamplesFromCoachText(replyText)
    : {};

  const quadrants: Partial<Record<EmpathyQuadrantId, string[]>> = {
    ...(fromHistory?.quadrants ?? {}),
  };

  for (const [key, items] of Object.entries(fromReply) as [
    EmpathyQuadrantId,
    string[],
  ][]) {
    if (scope !== "all" && !scope.includes(key)) continue;
    quadrants[key] = filterEmpathyStickyTexts([
      ...(quadrants[key] ?? []),
      ...items,
    ]);
  }

  if (!Object.keys(quadrants).length) return null;

  return {
    personaIndex: parsePersonaIndexFromMessage(userMessage),
    quadrants,
    mode: empathyEditModeFromUser(userMessage),
  };
}

export function empathyEditModeFromUser(message: string): EmpathyMapEditMode {
  return REPLACE_INTENT.test(message) ? "replace" : "merge";
}

function parsePersonaIndexFromMessage(message: string): number | undefined {
  const numeric = message.match(/페르소나\s*(\d+)\s*(?:번|번째)?/iu);
  if (numeric?.[1]) {
    const idx = Number.parseInt(numeric[1], 10) - 1;
    return Number.isFinite(idx) && idx >= 0 ? idx : undefined;
  }
  const ordinalMap: Record<string, number> = {
    첫: 0,
    첫번째: 0,
    두: 1,
    두번째: 1,
    세: 2,
    세번째: 2,
    네: 3,
    네번째: 3,
  };
  for (const [key, idx] of Object.entries(ordinalMap)) {
    if (new RegExp(`${key}\\s*페르소나`, "u").test(message)) return idx;
  }
  return undefined;
}

function quadrantFromMessage(message: string): EmpathyQuadrantId | null {
  for (const spec of QUADRANT_SPECS) {
    for (const label of spec.labels) {
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(escaped, "iu").test(message)) return spec.id;
    }
  }
  return null;
}

function extractQuotedStrings(message: string): string[] {
  const out: string[] = [];
  const patterns = [
    /[「『]([^」』]+)[」』]/gu,
    /["“]([^"”]+)["”]/gu,
    /['‘]([^'’]+)['’]/gu,
  ];
  for (const pattern of patterns) {
    for (const match of message.matchAll(pattern)) {
      const text = stripQuoteWrappers(match[1] ?? "");
      if (text) out.push(text);
    }
  }
  return out;
}

/** 사용자 발화 — 「말함에 ○○ 반영」 등 */
export function parseEmpathyMapUserEdit(
  message: string,
): EmpathyMapEditPatch | null {
  const text = message.trim();
  if (!text || !APPLY_INTENT.test(text)) return null;
  if (isReferenceOnlyApplyRequest(text)) return null;

  const personaIndex = parsePersonaIndexFromMessage(text);
  const quadrants: Partial<Record<EmpathyQuadrantId, string[]>> = {};

  for (const spec of QUADRANT_SPECS) {
    for (const label of spec.labels) {
      const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const patterns = [
        new RegExp(
          `${escaped}(?:\\s*칸)?(?:에|으로)?\\s*(.+?)(?:을|를)?\\s*(?:반영|넣|적|추가|적용|업데이트|채워)`,
          "iu",
        ),
        new RegExp(`${escaped}(?:\\s*칸)?\\s*[:：]\\s*(.+)$`, "iu"),
      ];
      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (!match?.[1]) continue;
        const items = filterEmpathyStickyTexts(parseEmpathyEditItems(match[1]));
        if (items.length) {
          quadrants[spec.id] = items;
          break;
        }
      }
      if (quadrants[spec.id]) break;
    }
  }

  if (!Object.keys(quadrants).length) {
    const quadrant = quadrantFromMessage(text);
    const quoted = extractQuotedStrings(text);
    if (quadrant && quoted.length) {
      quadrants[quadrant] = filterEmpathyStickyTexts(quoted);
    }
  }

  if (!Object.keys(quadrants).length) return null;

  return {
    personaIndex,
    quadrants,
    mode: empathyEditModeFromUser(text),
  };
}

export function parseEmpathyMapCoachEdit(
  userMessage: string,
  coachReply: string,
  history: CoachHistoryTurn[] = [],
): EmpathyMapEditPatch | null {
  const quadrants: Partial<Record<EmpathyQuadrantId, string[]>> = {};
  let personaIndex: number | undefined;
  let foundEditLine = false;

  for (const match of coachReply.matchAll(EMPATHY_EDIT_LINE)) {
    foundEditLine = true;
    if (match[1] !== undefined) {
      const idx = Number.parseInt(match[1], 10);
      if (Number.isFinite(idx) && idx >= 0) personaIndex = idx;
    }
    const quadrant = match[2].toLowerCase() as EmpathyQuadrantId;
    const items = parseEmpathyEditItems(match[3]);
    if (items.length) quadrants[quadrant] = items;
  }

  if (foundEditLine && Object.keys(quadrants).length) {
    return {
      personaIndex: personaIndex ?? parsePersonaIndexFromMessage(userMessage),
      quadrants,
      mode: empathyEditModeFromUser(userMessage),
    };
  }

  if (isReferenceOnlyApplyRequest(userMessage)) {
    return patchFromReferenceContext(userMessage, history, coachReply);
  }

  if (APPLY_INTENT.test(userMessage)) {
    const fromUser = parseEmpathyMapUserEdit(userMessage);
    if (fromUser) return fromUser;

    const quadrant = quadrantFromMessage(userMessage);
    if (quadrant) {
      const items = filterEmpathyStickyTexts(extractQuotedStrings(coachReply));
      if (items.length) {
        return {
          personaIndex: parsePersonaIndexFromMessage(userMessage),
          quadrants: { [quadrant]: items },
          mode: empathyEditModeFromUser(userMessage),
        };
      }
    }
  }

  return null;
}

/** 참조 반영 요청 — API 호출 전 직전 코치 발화에서 먼저 추출 */
export function resolveReferenceApplyPatch(
  userMessage: string,
  history: CoachHistoryTurn[],
): EmpathyMapEditPatch | null {
  if (!isReferenceOnlyApplyRequest(userMessage)) return null;
  return patchFromReferenceContext(userMessage, history);
}

export function stripEmpathyMapEditMetaLines(reply: string): string {
  return reply
    .replace(
      /\n?EDIT:empathy(?::\d+)?:(says|thinks|does|feels)\|[^\n]+/gi,
      "",
    )
    .trim();
}

function stickyItemsFromTexts(texts: string[]): EmpathyStickyItem[] {
  return texts.map((text) => ({
    ...createEmpathyStickyItem(),
    text,
    fromSuggestion: true,
  }));
}

export function applyEmpathyMapEditPatch(
  maps: Stage4PersonaEmpathyMap[],
  activePersonaIndex: number,
  patch: EmpathyMapEditPatch,
): Stage4PersonaEmpathyMap[] {
  if (!maps.length) return maps;

  const targetIndex = Math.min(
    Math.max(0, patch.personaIndex ?? activePersonaIndex),
    maps.length - 1,
  );

  const target = maps[targetIndex];
  if (!target) return maps;

  const nextQuadrants = { ...target.quadrants };

  for (const spec of QUADRANT_SPECS) {
    const texts = patch.quadrants[spec.id];
    if (!texts?.length) continue;

    const incoming = stickyItemsFromTexts(texts);
    const existing = nextQuadrants[spec.id] ?? [];

    if (patch.mode === "replace") {
      nextQuadrants[spec.id] = incoming;
      continue;
    }

    const existingTexts = new Set(
      existing.map((item) => item.text.trim()).filter(Boolean),
    );
    const merged = [...existing];
    for (const item of incoming) {
      const key = item.text.trim();
      if (!key || existingTexts.has(key)) continue;
      existingTexts.add(key);
      merged.push(item);
    }
    nextQuadrants[spec.id] = merged;
  }

  return maps.map((map, idx) =>
    idx === targetIndex ? { ...map, quadrants: nextQuadrants } : map,
  );
}

export const STAGE4_EMPATHY_MAP_APPLY_HINT = `
## 왼쪽 공감맵 반영 (EDIT 프로토콜)
- 사용자가 왼쪽 작업 영역·공감맵에 **반영·추가·넣어·적용·업데이트·채워** 달라고 하면, 말풍선에서 확인한 뒤 응답 **맨 마지막**에 EDIT 줄을 넣으세요. (여러 칸이면 줄마다 하나)
- 형식: EDIT:empathy:칸id|항목1 || 항목2 || 항목3
- 칸 id: says(말함) · thinks(생각함) · does(행동함) · feels(느낌)
- 다른 페르소나(0부터 번호)면: EDIT:empathy:1:says|...
- 항목 구분은 **||** 로 합니다. 인용문은 따옴표 없이 넣어도 됩니다.
- 예: EDIT:empathy:says|창업 하려는데 뭐부터 해야 할지 모르겠어요 || 주변은 다들 사업한다는데 나만 제자리인 것 같아요
- 반영·추가 요청이 없으면 EDIT 줄을 넣지 마세요. 질문만 한 턴에는 예시만 말하고 EDIT는 쓰지 마세요.
- 사용자가 「방금 말함 예시 반영해줘」처럼 **이전 예시를 옮기라**고 하면, 직전 턴에 제안한 **실제 인용문**만 EDIT에 넣으세요. "방금 말함"·"예시"·칸 이름은 항목이 아닙니다.
- 예: EDIT:empathy:says|창업 하려는데 뭐부터 해야 할지 모르겠어요 || 주변은 다들 사업한다는데 나만 제자리인 것 같아요`.trim();
