import type { EmpathyMapData } from "@/lib/stages/stage2/empathyMap";

const BLOCK_START = "<<<EMPATHY_PERSONA";
const BLOCK_END = ">>>";

/** 이미지 소스 — http(s) URL 또는 data:image 로컬 선택 */
export function isAllowedPersonaImageUrl(raw: string): boolean {
  const u = raw.trim();
  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(u)) {
    return u.length <= 150_000;
  }
  try {
    const parsed = new URL(u);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export type EmpathyPersonaPatch = Partial<
  Pick<
    EmpathyMapData,
    "personaName" | "personaSituationRaw" | "personaThumbnailUrl"
  >
>;

/** 코치 말풍선에 보이면 안 되는 동기화 블록 제거 */
export function stripEmpathyPersonaBlock(raw: string): string {
  const i = raw.indexOf(BLOCK_START);
  if (i === -1) return raw.trim();
  const j = raw.indexOf(BLOCK_END, i + BLOCK_START.length);
  if (j === -1) return raw.trim();
  return `${raw.slice(0, i)}${raw.slice(j + BLOCK_END.length)}`.trim();
}

/** 응답 끝에 붙인 JSON에서 페르소나 필드만 추출 (사용자 발화에 맞게 모델이 채운 값) */
export function parseEmpathyPersonaBlock(raw: string): EmpathyPersonaPatch | null {
  const i = raw.indexOf(BLOCK_START);
  if (i === -1) return null;
  const j = raw.indexOf(BLOCK_END, i + BLOCK_START.length);
  if (j === -1) return null;
  let jsonStr = raw.slice(i + BLOCK_START.length, j).trim();
  jsonStr = jsonStr
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  try {
    const o = JSON.parse(jsonStr) as Record<string, unknown>;
    const out: EmpathyPersonaPatch = {};
    if (typeof o.personaName === "string" && o.personaName.trim()) {
      out.personaName = o.personaName.trim().slice(0, 40);
    }
    if (typeof o.personaContext === "string" && o.personaContext.trim()) {
      out.personaSituationRaw = o.personaContext.trim().slice(0, 500);
    }
    if (
      typeof o.personaThumbnailUrl === "string" &&
      o.personaThumbnailUrl.trim() &&
      isAllowedPersonaImageUrl(o.personaThumbnailUrl)
    ) {
      const t = o.personaThumbnailUrl.trim();
      out.personaThumbnailUrl = t.length > 150_000 ? t.slice(0, 150_000) : t;
    }
    return Object.keys(out).length > 0 ? out : {};
  } catch {
    return null;
  }
}

/** 채팅 맥락에 넣는 단계 전용 지시 — 매 턴 사용자 메시지 앞에 프리픽스로 합쳐짐 */
export const STAGE2_PERSONA_DIRECTIVE = `
[단계 2 · 맥락 이해하기 규약]
이 단계는 사전 조사 키워드·맥락 메모·미확인 항목 정리입니다. 공감맵·페르소나 이름·Says/Thinks/Does/Feels를 새로 묻거나 채우라고 안내하지 마세요.
JSON의 **personaContext** 는 가운데 카드에 그대로 쓰이지 않고, 앱이 **짧은 요약**(예: 15년차 직장인)과 **썸네일**을 자동 만듭니다. 여기에는 사용자가 말한 **상황 원문**을 최대한 그대로 넣으세요(여러 문장 가능).
**personaThumbnailUrl** 은 사용자가 직접 사진·이미지 URL을 말했을 때만 채우고, 없으면 "" 로 두면 됩니다(앱이 자동 아바타를 붙입니다).
자연어로 짧게 반응한 뒤, **반드시 응답 맨 끝**에 한 번만 아래 블록을 넣습니다.

${BLOCK_START}
{"personaName":"…","personaContext":"…","personaThumbnailUrl":"…"}
${BLOCK_END}

- personaContext 키 이름은 유지하되 값은 **상황 원문**입니다(요약문이 아님).
- 사용자가 아직 안 말한 필드는 "" 로 둡니다.
- personaThumbnailUrl 은 허용된 http(s) 또는 짧은 data:image 만. 없으면 "".
`.trim();

const URL_CHUNK = /\b(https?:\/\/[^\s<>()]+[^\s<>().,;:!?'")\]]+)/gi;

/** 사용자 한 턴에서 이미지 URL을 찾아 썸네일 후보로 쓸지 판별 */
export function extractFirstLikelyImageUrl(text: string): string | null {
  for (const m of text.matchAll(URL_CHUNK)) {
    const cand = (m[1] ?? m[0]).trim();
    if (!isAllowedPersonaImageUrl(cand)) continue;
    if (/\.(png|jpe?g|gif|webp)(\?|$|#)/i.test(cand) || /\/image\//i.test(cand)) {
      return cand;
    }
  }
  const t = text.trim();
  if (/^data:image\//i.test(t)) {
    return isAllowedPersonaImageUrl(t) ? t : null;
  }
  return null;
}
