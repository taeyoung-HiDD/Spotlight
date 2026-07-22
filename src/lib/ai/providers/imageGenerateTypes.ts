export type ImageGenerateSource = "cloudflare" | "gemini";

export type ImageGenerateResult =
  | { ok: true; dataUrl: string; model: string; source: ImageGenerateSource }
  | { ok: false; error: string; status?: number };
