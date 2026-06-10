import { createClient } from "@/lib/supabase/server";

const BUCKET = "research-media";

export function extractJsonObject(text: string): unknown | null {
  const raw = text.trim();
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(raw.slice(start, end + 1));
  } catch {
    return null;
  }
}

export { resolveGeminiAudioModels } from "@/lib/ai/env";

export async function fetchStorageFileBase64(
  storagePath: string,
): Promise<{ base64: string; mimeType: string } | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, 3600);
  if (error || !data?.signedUrl) return null;

  const res = await fetch(data.signedUrl);
  if (!res.ok) return null;

  const buffer = await res.arrayBuffer();
  const mimeType = res.headers.get("content-type") || "audio/mpeg";
  return {
    base64: Buffer.from(buffer).toString("base64"),
    mimeType,
  };
}

export async function geminiGenerateWithParts({
  apiKey,
  models,
  parts,
  jsonMode = false,
  temperature = 0.3,
}: {
  apiKey: string;
  models: string[];
  parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
  jsonMode?: boolean;
  temperature?: number;
}): Promise<{ text: string; model: string } | null> {
  let lastError: unknown;

  for (const modelName of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
          modelName,
        )}:generateContent?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts }],
            generationConfig: {
              responseModalities: ["TEXT"],
              ...(jsonMode ? { responseMimeType: "application/json" } : {}),
              temperature,
            },
          }),
        },
      );

      if (!res.ok) {
        lastError = await res.text().catch(() => null);
        continue;
      }

      const json = (await res.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
      };
      const text = (json.candidates?.[0]?.content?.parts ?? [])
        .map((p) => p.text ?? "")
        .join("")
        .trim();
      if (!text) continue;
      return { text, model: modelName };
    } catch (e) {
      lastError = e;
    }
  }

  if (lastError) throw lastError;
  return null;
}
