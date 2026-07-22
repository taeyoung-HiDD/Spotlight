const DEFAULT_GROQ_TEXT = "llama-3.3-70b-versatile";
const DEFAULT_GROQ_FAST = "llama-3.1-8b-instant";

export function resolveGroqApiKey(): string | null {
  return process.env.GROQ_API_KEY?.trim() || null;
}

export function resolveGeminiApiKey(): string | null {
  return process.env.GEMINI_API_KEY?.trim() || null;
}

export function resolveCloudflareAccountId(): string | null {
  return process.env.CLOUDFLARE_ACCOUNT_ID?.trim() || null;
}

export function resolveCloudflareApiToken(): string | null {
  return process.env.CLOUDFLARE_API_TOKEN?.trim() || null;
}

export function resolveCloudflareCredentials(): {
  accountId: string;
  apiToken: string;
} | null {
  const accountId = resolveCloudflareAccountId();
  const apiToken = resolveCloudflareApiToken();
  if (!accountId || !apiToken) return null;
  return { accountId, apiToken };
}

const DEFAULT_CLOUDFLARE_IMAGE_MODEL =
  "@cf/bytedance/stable-diffusion-xl-lightning";

export function resolveCloudflareImageModel(): string {
  return (
    process.env.CLOUDFLARE_IMAGE_MODEL?.trim() || DEFAULT_CLOUDFLARE_IMAGE_MODEL
  );
}

export function resolveGroqTextModels(): string[] {
  const primary = process.env.GROQ_TEXT_MODEL?.trim() || DEFAULT_GROQ_TEXT;
  const fallback =
    process.env.GROQ_TEXT_MODEL_FALLBACK?.trim() || DEFAULT_GROQ_FAST;
  return [primary, ...(fallback !== primary ? [fallback] : [])];
}

export function resolveGroqFastModels(): string[] {
  const fast = process.env.GROQ_FAST_MODEL?.trim() || DEFAULT_GROQ_FAST;
  return resolveGroqTextModels().includes(fast)
    ? resolveGroqTextModels()
    : [fast, ...resolveGroqTextModels()];
}

export function resolveGroqHtmlModels(): string[] {
  const html = process.env.GROQ_HTML_MODEL?.trim();
  if (!html) return resolveGroqTextModels();
  return [html, ...resolveGroqTextModels().filter((m) => m !== html)];
}

export function resolveGeminiImageModels(): string[] {
  return [
    process.env.GEMINI_IMAGE_MODEL?.trim(),
    "gemini-2.5-flash-image",
    "gemini-3.1-flash-image",
    "gemini-2.0-flash-preview-image-generation",
  ].filter((m): m is string => Boolean(m));
}

export function resolveGeminiAudioModels(): string[] {
  const primary =
    process.env.GEMINI_AUDIO_MODEL?.trim() || "gemini-2.5-flash";
  const fallback = process.env.GEMINI_AUDIO_MODEL_FALLBACK?.trim();
  return [primary, ...(fallback && fallback !== primary ? [fallback] : [])];
}

/** Google이 단종한 텍스트 모델 ID → 현재 대체 모델 */
const DEPRECATED_GEMINI_TEXT_MODEL_ALIASES: Record<string, string> = {
  "gemini-2.0-flash": "gemini-2.5-flash",
  "gemini-2.0-flash-lite": "gemini-2.5-flash-lite",
  "gemini-2.0-flash-thinking-exp": "gemini-2.5-flash",
  "gemini-1.5-flash": "gemini-2.5-flash",
  "gemini-1.5-flash-8b": "gemini-2.5-flash-lite",
  "gemini-1.5-pro": "gemini-2.5-pro",
};

function normalizeGeminiTextModel(model: string): string {
  const trimmed = model.trim();
  return DEPRECATED_GEMINI_TEXT_MODEL_ALIASES[trimmed] ?? trimmed;
}

/** Pre-PMF·일반 텍스트 생성용 Gemini 모델 */
export function resolveGeminiTextModels(): string[] {
  const primary = normalizeGeminiTextModel(
    process.env.GEMINI_TEXT_MODEL?.trim() ||
      process.env.GEMINI_MODEL?.trim() ||
      "gemini-2.5-flash",
  );
  const fallback = normalizeGeminiTextModel(
    process.env.GEMINI_TEXT_MODEL_FALLBACK?.trim() || "gemini-2.5-flash-lite",
  );
  return [primary, ...(fallback !== primary ? [fallback] : [])];
}

const DEFAULT_DEEP_RESEARCH_AGENT = "deep-research-preview-04-2026";

/** Pre-PMF 사전 조사용 Gemini Deep Research 에이전트 ID */
export function resolveGeminiDeepResearchAgent(): string {
  return (
    process.env.GEMINI_DEEP_RESEARCH_AGENT?.trim() || DEFAULT_DEEP_RESEARCH_AGENT
  );
}

/**
 * Pre-PMF 사전 조사에 Deep Research 에이전트 사용 여부.
 * Deep Research는 유료 티어 전용 — 기본은 끔(grounded 동기 생성만 사용).
 * 켜려면 GEMINI_DEEP_RESEARCH=1 을 설정한다.
 */
export function isGeminiDeepResearchEnabled(): boolean {
  if (!resolveGeminiApiKey()) return false;
  return process.env.GEMINI_DEEP_RESEARCH?.trim() === "1";
}
