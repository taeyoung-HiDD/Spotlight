import { NextResponse } from "next/server";
import { resolveGroqApiKey, resolveGroqTextModels } from "@/lib/ai/env";
import { groqComplete } from "@/lib/ai/providers/groqText";

const MAX_TEXTS = 40;
const MAX_CHARS = 2_000;

function parseTexts(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const item of raw) {
    if (typeof item !== "string") continue;
    const text = item.trim().slice(0, MAX_CHARS);
    if (!text) continue;
    out.push(text);
    if (out.length >= MAX_TEXTS) break;
  }
  return out;
}

function extractJsonTranslations(text: string): string[] | null {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced?.[1]?.trim() ?? trimmed;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(body.slice(start, end + 1)) as {
      translations?: unknown;
    };
    if (!Array.isArray(parsed.translations)) return null;
    return parsed.translations.map((x) =>
      typeof x === "string" ? x : String(x ?? ""),
    );
  } catch {
    return null;
  }
}

function buildPrompt(texts: string[]): string {
  const numbered = texts
    .map((t, i) => `[${i + 1}]\n${t}`)
    .join("\n\n");
  return `You translate Korean UI / research artifact text into natural English for a design-thinking coaching product.

Rules:
- Preserve meaning; keep proper nouns when appropriate.
- Keep line breaks roughly.
- Do not add explanations.
- Output JSON only: {"translations":["...","..."]} with the SAME length and order as inputs.

Inputs:
${numbered}`;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const target = o.target === "ko" ? "ko" : "en";
  const texts = parseTexts(o.texts);

  if (!texts.length) {
    return NextResponse.json({ translations: [], source: "empty" });
  }

  // 현재는 KO → EN만 지원 (정본이 한국어)
  if (target !== "en") {
    return NextResponse.json({ translations: texts, source: "passthrough" });
  }

  if (!resolveGroqApiKey()) {
    return NextResponse.json({ translations: texts, source: "no_key" });
  }

  try {
    const result = await groqComplete(buildPrompt(texts), {
      models: resolveGroqTextModels(),
      temperature: 0.2,
      jsonMode: true,
    });
    const parsed = extractJsonTranslations(result.text);
    if (!parsed || parsed.length !== texts.length) {
      return NextResponse.json({
        translations: texts,
        source: "parse_fallback",
      });
    }
    return NextResponse.json({
      translations: parsed.map((t, i) => t.trim() || texts[i]!),
      source: "groq",
      model: result.model,
    });
  } catch (error) {
    console.error(
      "[i18n/translate]",
      error instanceof Error ? error.message : error,
    );
    return NextResponse.json({
      translations: texts,
      source: "error_fallback",
    });
  }
}
