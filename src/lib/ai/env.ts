const DEFAULT_GROQ_TEXT = "llama-3.3-70b-versatile";
const DEFAULT_GROQ_FAST = "llama-3.1-8b-instant";

export function resolveGroqApiKey(): string | null {
  return process.env.GROQ_API_KEY?.trim() || null;
}

export function resolveGeminiApiKey(): string | null {
  return process.env.GEMINI_API_KEY?.trim() || null;
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
    "gemini-2.0-flash-preview-image-generation",
  ].filter((m): m is string => Boolean(m));
}

export function resolveGeminiAudioModels(): string[] {
  const primary =
    process.env.GEMINI_AUDIO_MODEL?.trim() || "gemini-2.5-flash";
  const fallback = process.env.GEMINI_AUDIO_MODEL_FALLBACK?.trim();
  return [primary, ...(fallback && fallback !== primary ? [fallback] : [])];
}
