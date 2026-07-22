import {
  resolveCloudflareCredentials,
  resolveGeminiApiKey,
} from "@/lib/ai/env";
import { appendImageNoTextConstraint } from "@/lib/ai/prompts/imageNoTextConstraint";
import { cloudflareGenerateImageDetailed } from "@/lib/ai/providers/cloudflareImage";
import type {
  ImageGenerateResult,
  ImageGenerateSource,
} from "@/lib/ai/providers/imageGenerateTypes";
import { geminiGenerateImageDetailed } from "@/lib/ai/providers/geminiImage";

export type { ImageGenerateResult, ImageGenerateSource };

export function resolveImageProvider(): ImageGenerateSource | null {
  if (resolveGeminiApiKey()) return "gemini";
  if (resolveCloudflareCredentials()) return "cloudflare";
  return null;
}

export function resolveImageCredentialsError(): string {
  return "GEMINI_API_KEY가 설정되어 있지 않습니다.";
}

export async function generateImageDetailed(
  prompt: string,
): Promise<ImageGenerateResult> {
  const safePrompt = appendImageNoTextConstraint(prompt);

  const geminiKey = resolveGeminiApiKey();
  if (geminiKey) {
    const result = await geminiGenerateImageDetailed(geminiKey, safePrompt);
    if (result.ok) {
      return { ...result, source: "gemini" };
    }
    return result;
  }

  const cloudflare = resolveCloudflareCredentials();
  if (cloudflare) {
    return cloudflareGenerateImageDetailed(
      cloudflare.accountId,
      cloudflare.apiToken,
      safePrompt,
    );
  }

  return { ok: false, error: resolveImageCredentialsError() };
}

export async function generateImage(
  prompt: string,
): Promise<{ dataUrl: string; model: string; source: ImageGenerateSource } | null> {
  const result = await generateImageDetailed(prompt);
  return result.ok
    ? {
        dataUrl: result.dataUrl,
        model: result.model,
        source: result.source,
      }
    : null;
}
