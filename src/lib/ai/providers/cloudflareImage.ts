import { resolveCloudflareImageModel } from "@/lib/ai/env";
import { bufferToImageDataUrl } from "@/lib/ai/providers/imageDataUrl";
import type { ImageGenerateResult } from "@/lib/ai/providers/imageGenerateTypes";

interface CloudflareApiError {
  success?: boolean;
  errors?: Array<{ message?: string; code?: number }>;
}

function toUserFacingError(
  result: ImageGenerateResult & { ok: false },
): string {
  const msg = result.error.toLowerCase();
  if (result.status === 429 || msg.includes("rate") || msg.includes("quota")) {
    return "Cloudflare Workers AI 요청 한도에 도달했습니다. 잠시 후 다시 시도해 주세요.";
  }
  if (
    result.status === 401 ||
    result.status === 403 ||
    msg.includes("authentication") ||
    msg.includes("unauthorized") ||
    msg.includes("permission")
  ) {
    return "CLOUDFLARE_API_TOKEN 또는 CLOUDFLARE_ACCOUNT_ID가 유효하지 않습니다. Cloudflare 대시보드에서 토큰 권한(Workers AI)을 확인해 주세요.";
  }
  if (process.env.NODE_ENV === "development") {
    return result.error;
  }
  return "이미지를 생성하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

async function readCloudflareFailure(
  res: Response,
  model: string,
): Promise<{ message: string; status: number }> {
  const status = res.status;
  try {
    const json = (await res.json()) as CloudflareApiError;
    const apiMessage = json.errors?.[0]?.message?.trim();
    if (apiMessage) {
      return { message: `${model}: ${apiMessage}`, status };
    }
  } catch {
    /* binary or empty body */
  }
  return { message: `${model}: HTTP ${status}`, status };
}

export async function cloudflareGenerateImageDetailed(
  accountId: string,
  apiToken: string,
  prompt: string,
  model = resolveCloudflareImageModel(),
): Promise<ImageGenerateResult> {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt,
        negative_prompt:
          "text, words, letters, typography, labels, watermark, logo, blurry, low quality, photograph, korean, chinese, gibberish",
        num_steps: 4,
        guidance: 7.5,
      }),
    },
  );

  const contentType = res.headers.get("content-type")?.split(";")[0]?.trim() ?? "";

  if (!res.ok) {
    const failure = await readCloudflareFailure(res, model);
    const result: ImageGenerateResult & { ok: false } = {
      ok: false,
      error: failure.message,
      status: failure.status,
    };
    return { ...result, error: toUserFacingError(result) };
  }

  if (contentType.startsWith("image/")) {
    const buffer = await res.arrayBuffer();
    const dataUrl = bufferToImageDataUrl(buffer, contentType);
    if (dataUrl) {
      return { ok: true, dataUrl, model, source: "cloudflare" };
    }
  }

  const failure: ImageGenerateResult & { ok: false } = {
    ok: false,
    error: `${model}: 응답에 이미지 데이터가 없습니다.`,
    status: res.status,
  };
  return { ...failure, error: toUserFacingError(failure) };
}
