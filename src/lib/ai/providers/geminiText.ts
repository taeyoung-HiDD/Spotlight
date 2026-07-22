import {
  resolveGeminiApiKey,
  resolveGeminiTextModels,
} from "@/lib/ai/env";

export interface GeminiTextPart {
  text?: string;
}

export interface GeminiChatOptions {
  system?: string;
  user?: string;
  models?: string[];
  temperature?: number;
  jsonMode?: boolean;
}

export interface GeminiChatResult {
  text: string;
  model: string;
}

export interface GeminiGroundedSource {
  title: string;
  url: string;
}

export interface GeminiGroundedChatResult extends GeminiChatResult {
  sources: GeminiGroundedSource[];
}

interface GeminiGenerateResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    groundingMetadata?: {
      groundingChunks?: Array<{
        web?: { uri?: string; title?: string };
      }>;
    };
  }>;
  error?: { message?: string };
}

function parseGroundedSources(
  candidate: NonNullable<GeminiGenerateResponse["candidates"]>[number],
): GeminiGroundedSource[] {
  const chunks = candidate.groundingMetadata?.groundingChunks ?? [];
  const seen = new Set<string>();
  const sources: GeminiGroundedSource[] = [];
  for (const chunk of chunks) {
    const url = chunk.web?.uri?.trim();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    sources.push({
      title: chunk.web?.title?.trim() || url,
      url,
    });
  }
  return sources;
}

async function geminiGenerateOnce(
  apiKey: string,
  model: string,
  parts: GeminiTextPart[],
  temperature: number,
  jsonMode: boolean,
  googleSearch: boolean,
): Promise<{ text: string; sources: GeminiGroundedSource[] }> {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model,
    )}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        ...(googleSearch ? { tools: [{ google_search: {} }] } : {}),
        generationConfig: {
          responseModalities: ["TEXT"],
          ...(jsonMode ? { responseMimeType: "application/json" } : {}),
          temperature,
        },
      }),
    },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(detail || `Gemini HTTP ${res.status}`);
  }

  const json = (await res.json()) as GeminiGenerateResponse;

  const apiError = json.error?.message?.trim();
  if (apiError) throw new Error(apiError);

  const candidate = json.candidates?.[0];
  const text = (candidate?.content?.parts ?? [])
    .map((p) => p.text ?? "")
    .join("")
    .trim();
  if (!text) throw new Error("empty Gemini response");

  return {
    text,
    sources: googleSearch ? parseGroundedSources(candidate ?? {}) : [],
  };
}

function buildParts(options: GeminiChatOptions): GeminiTextPart[] {
  const parts: GeminiTextPart[] = [];
  if (options.system?.trim()) {
    parts.push({ text: options.system.trim() });
  }
  if (options.user?.trim()) {
    parts.push({ text: options.user.trim() });
  }
  return parts;
}

/** Gemini 텍스트 생성 — system·user 프롬프트, JSON 모드 지원 */
export async function geminiChat(
  options: GeminiChatOptions,
): Promise<GeminiChatResult> {
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) throw new Error("GEMINI_API_KEY missing");

  const parts = buildParts(options);
  if (parts.length === 0) {
    throw new Error("Gemini prompt required");
  }

  const models = options.models ?? resolveGeminiTextModels();
  const temperature = options.temperature ?? 0.4;
  const jsonMode = options.jsonMode ?? false;

  let lastError: unknown;
  for (const model of models) {
    try {
      const { text } = await geminiGenerateOnce(
        apiKey,
        model,
        parts,
        temperature,
        jsonMode,
        false,
      );
      return { text, model };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("Gemini generation failed");
}

/** Gemini + Google Search grounding — 시장·경쟁 등 웹 조사용 */
export async function geminiGroundedChat(
  options: Omit<GeminiChatOptions, "jsonMode">,
): Promise<GeminiGroundedChatResult> {
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) throw new Error("GEMINI_API_KEY missing");

  const parts = buildParts(options);
  if (parts.length === 0) {
    throw new Error("Gemini prompt required");
  }

  const models = options.models ?? resolveGeminiTextModels();
  const temperature = options.temperature ?? 0.35;

  let lastError: unknown;
  for (const model of models) {
    try {
      const { text, sources } = await geminiGenerateOnce(
        apiKey,
        model,
        parts,
        temperature,
        false,
        true,
      );
      return { text, model, sources };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("Gemini grounded generation failed");
}
