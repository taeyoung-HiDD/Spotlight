import { resolveGeminiImageModels } from "@/lib/ai/env";

interface GeminiPart {
  text?: string;
  inlineData?: { mimeType?: string; data?: string };
}

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: { parts?: GeminiPart[] };
  }>;
}

export function buildImageDataUrl(
  mimeType: string,
  base64: string,
): string | null {
  const clean = base64.trim();
  if (!clean) return null;
  return `data:${mimeType || "image/png"};base64,${clean}`;
}

export async function geminiGenerateImage(
  apiKey: string,
  prompt: string,
  models?: string[],
): Promise<{ dataUrl: string; model: string } | null> {
  const modelList = models ?? resolveGeminiImageModels();

  for (const model of modelList) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              responseModalities: ["TEXT", "IMAGE"],
            },
          }),
        },
      );
      if (!res.ok) continue;

      const json = (await res.json()) as GeminiGenerateResponse;
      const parts = json.candidates?.[0]?.content?.parts ?? [];
      for (const part of parts) {
        const data = part.inlineData?.data;
        if (!data) continue;
        const dataUrl = buildImageDataUrl(
          part.inlineData?.mimeType || "image/png",
          data,
        );
        if (dataUrl) return { dataUrl, model };
      }
    } catch {
      /* try next model */
    }
  }

  return null;
}
