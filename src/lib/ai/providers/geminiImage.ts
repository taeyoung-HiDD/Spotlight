import { resolveGeminiImageModels } from "@/lib/ai/env";
import { buildImageDataUrl } from "@/lib/ai/providers/imageDataUrl";
import type { ImageGenerateResult } from "@/lib/ai/providers/imageGenerateTypes";

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType?: string; data?: string };
  inline_data?: { mime_type?: string; data?: string };
}

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
    finishReason?: string;
  }>;
  error?: { message?: string; code?: number; status?: string };
}

export type GeminiGenerateImageResult = Exclude<ImageGenerateResult, { ok: true }> | {
  ok: true;
  dataUrl: string;
  model: string;
};

function extractInlineData(
  part: GeminiPart,
): { mimeType: string; data: string } | null {
  const camel = part.inlineData;
  if (camel?.data) {
    return { mimeType: camel.mimeType || "image/png", data: camel.data };
  }
  const snake = part.inline_data;
  if (snake?.data) {
    return { mimeType: snake.mime_type || "image/png", data: snake.data };
  }
  return null;
}

function buildRequestBody(): Record<string, unknown> {
  return {
    contents: [{ parts: [{ text: "" }] }],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  };
}

async function readGeminiFailure(
  res: Response,
  model: string,
): Promise<{ message: string; status: number }> {
  const status = res.status;
  try {
    const json = (await res.json()) as GeminiGenerateResponse;
    const apiMessage = json.error?.message?.trim();
    if (apiMessage) {
      return { message: `${model}: ${apiMessage}`, status };
    }
    const finish = json.candidates?.[0]?.finishReason;
    if (finish && finish !== "STOP") {
      return {
        message: `${model}: finishReason=${finish}`,
        status,
      };
    }
  } catch {
    /* fall through */
  }
  return { message: `${model}: HTTP ${status}`, status };
}

async function tryGenerateWithModel(
  apiKey: string,
  model: string,
  prompt: string,
): Promise<GeminiGenerateImageResult> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...buildRequestBody(),
        contents: [{ parts: [{ text: prompt }] }],
      }),
    },
  );

  if (!res.ok) {
    const failure = await readGeminiFailure(res, model);
    return { ok: false, error: failure.message, status: failure.status };
  }

  const json = (await res.json()) as GeminiGenerateResponse;
  const parts = json.candidates?.[0]?.content?.parts ?? [];
  for (const part of parts) {
    const inline = extractInlineData(part);
    if (!inline) continue;
    const dataUrl = buildImageDataUrl(inline.mimeType, inline.data);
    if (dataUrl) return { ok: true, dataUrl, model };
  }

  const finish = json.candidates?.[0]?.finishReason;
  if (finish && finish !== "STOP") {
    return {
      ok: false,
      error: `${model}: 이미지 없음 · finishReason=${finish}`,
    };
  }

  return {
    ok: false,
    error: `${model}: 응답에 이미지 데이터가 없습니다.`,
  };
}

function parseRetrySeconds(message: string): number | null {
  const match = message.match(/retry in ([\d.]+)s/i);
  if (!match) return null;
  const seconds = Math.ceil(Number(match[1]));
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

function toUserFacingError(result: GeminiGenerateImageResult & { ok: false }): string {
  const raw = result.error;
  const msg = raw.toLowerCase();

  if (result.status === 429 || msg.includes("quota") || msg.includes("rate")) {
    const retrySec = parseRetrySeconds(raw);
    if (raw.includes("limit: 0") && raw.includes("free_tier")) {
      return "Gemini 무료 플랜에서 이미지 생성 할당량이 없거나 모두 소진됐어요. Google AI Studio(ai.google.dev)에서 API 키·결제·할당량을 확인해 주세요. 유료 플랜이 필요할 수 있어요.";
    }
    if (retrySec) {
      return `Gemini 이미지 API 요청 한도에 잠시 걸렸어요. 약 ${retrySec}초 후 다시 시도해 주세요.`;
    }
    return "Gemini 이미지 API 일일·분당 한도에 도달했습니다. Google AI Studio에서 할당량을 확인하거나 잠시 후 다시 시도해 주세요.";
  }
  if (
    result.status === 403 ||
    msg.includes("api key") ||
    msg.includes("permission")
  ) {
    return "GEMINI_API_KEY가 유효하지 않거나 이미지 생성 권한이 없습니다. Google AI Studio에서 키를 확인해 주세요.";
  }
  if (process.env.NODE_ENV === "development") {
    return result.error;
  }
  return "아이디어 스케치를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

/** @deprecated null 반환 — geminiGenerateImageDetailed 사용 권장 */
export async function geminiGenerateImage(
  apiKey: string,
  prompt: string,
  models?: string[],
): Promise<{ dataUrl: string; model: string } | null> {
  const result = await geminiGenerateImageDetailed(apiKey, prompt, models);
  return result.ok ? { dataUrl: result.dataUrl, model: result.model } : null;
}

export async function geminiGenerateImageDetailed(
  apiKey: string,
  prompt: string,
  models?: string[],
): Promise<GeminiGenerateImageResult> {
  const modelList = models ?? resolveGeminiImageModels();
  let lastFailure: (GeminiGenerateImageResult & { ok: false }) | null = null;

  for (const model of modelList) {
    try {
      const result = await tryGenerateWithModel(apiKey, model, prompt);
      if (result.ok) return result;
      lastFailure = result;
      console.warn("[geminiImage]", result.error);
      if (result.status === 429) break;
    } catch (error) {
      const message =
        error instanceof Error
          ? `${model}: ${error.message}`
          : `${model}: 요청 실패`;
      lastFailure = { ok: false, error: message };
      console.warn("[geminiImage]", message);
    }
  }

  if (lastFailure) {
    return { ...lastFailure, error: toUserFacingError(lastFailure) };
  }

  return {
    ok: false,
    error: "이미지 모델을 사용할 수 없습니다.",
  };
}
