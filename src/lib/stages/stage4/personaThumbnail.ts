import { isAllowedPersonaImageUrl } from "@/lib/coach/stage2PersonaSync";
import { appendImageNoTextConstraint } from "@/lib/ai/prompts/imageNoTextConstraint";

/** 압축 후 artifact JSON 저장 상한 (data URL 문자 수) */
export const MAX_STORED_PERSONA_THUMBNAIL_CHARS = 150_000;

const BROKEN_DICEBEAR_DOODLE = "/9.x/doodle/";

function personaSeed(name: string, context: string): string {
  const n = name.trim().slice(0, 40);
  const c = context.trim().slice(0, 200);
  let h = 5381;
  const s = `${n}|${c}`;
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(33, h) ^ s.charCodeAt(i);
  }
  const id = `${n.slice(0, 12)}-${Math.abs(h).toString(36)}`;
  return id.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 64);
}

/** API 키 없을 때 · 생성 실패 시 라인드로잉 느낌 DiceBear (notionists) */
export function personaLineCartoonFallbackUrl(
  name: string,
  context: string,
  size = 160,
): string {
  const seed = personaSeed(name, context);
  const q = new URLSearchParams({ seed, size: String(size) });
  return `https://api.dicebear.com/9.x/notionists/png?${q.toString()}`;
}

/** Gemini 응답 data URL — 길이 제한 없이 형식만 검사 (클라이언트에서 압축) */
export function isGeminiPersonaImageDataUrl(raw: string): boolean {
  return /^data:image\/(png|jpeg|jpg|webp|gif);base64,[a-z0-9+/=\s]+$/i.test(
    raw.trim(),
  );
}

export function buildPersonaImageDataUrl(mimeType: string, base64: string): string {
  const mime = mimeType.trim() || "image/png";
  const data = base64.replace(/\s/g, "");
  const url = `data:${mime};base64,${data}`;
  return isGeminiPersonaImageDataUrl(url) ? url : "";
}

export function buildPersonaCartoonImagePrompt(
  name: string,
  context: string,
): string {
  const personaName = name.trim() || "unnamed persona";
  const personaContext = context.trim() || "everyday user";
  const body = `
Create a single square portrait illustration for a UX empathy map persona card.

Style (strict):
- Black ink line-drawing cartoon
- Minimal color fills (1–2 soft accent colors max), mostly white background
- Clean editorial cartoon, not photorealistic, not 3D, not anime
- Head-and-shoulders bust, friendly neutral expression
- No text, no logos, no watermarks, no borders
- Leave name label area empty — portrait only

Persona:
- Name hint: ${personaName}
- Context: ${personaContext.slice(0, 500)}
`.trim();

  return appendImageNoTextConstraint(body);
}

/** 저장·표시용 — 압축된 data URL 또는 https URL */
export function sanitizePersonaThumbnailUrl(raw: string): string {
  const u = raw.trim();
  if (!u || !isAllowedPersonaImageUrl(u)) return "";
  return u.length > MAX_STORED_PERSONA_THUMBNAIL_CHARS
    ? u.slice(0, MAX_STORED_PERSONA_THUMBNAIL_CHARS)
    : u;
}

export function resolvePersonaThumbnailDisplayUrl(
  url: string,
  name: string,
  context: string,
): string {
  const u = url.trim();
  if (u.includes(BROKEN_DICEBEAR_DOODLE)) {
    return personaLineCartoonFallbackUrl(name, context);
  }
  if (u && isAllowedPersonaImageUrl(u)) return u;
  return personaLineCartoonFallbackUrl(name, context);
}
