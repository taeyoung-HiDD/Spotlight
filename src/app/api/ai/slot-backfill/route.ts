import { NextResponse } from "next/server";
import { formatGroqError } from "@/lib/ai/errors";
import { resolveGroqApiKey, resolveGroqFastModels } from "@/lib/ai/env";
import {
  buildSlotBackfillPrompt,
  type SlotBackfillInput,
} from "@/lib/ai/prompts/slotBackfill";
import { groqComplete } from "@/lib/ai/providers/groqText";

function extractContent(text: string): string | null {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return trimmed || null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as { content?: unknown };
    if (typeof parsed.content === "string" && parsed.content.trim()) {
      return parsed.content.trim();
    }
  } catch {
    /* plain text fallback */
  }
  return trimmed || null;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 JSON입니다." }, { status: 400 });
  }

  const stageId = Number((body as { stageId?: number }).stageId);
  const stageTitle = String((body as { stageTitle?: string }).stageTitle ?? "").trim();
  const slotKey = String((body as { slotKey?: string }).slotKey ?? "").trim();
  const slotLabel = String((body as { slotLabel?: string }).slotLabel ?? "").trim();

  if (!stageId || !stageTitle || !slotKey || !slotLabel) {
    return NextResponse.json(
      { error: "stageId, stageTitle, slotKey, slotLabel이 필요합니다." },
      { status: 400 },
    );
  }

  if (!resolveGroqApiKey()) {
    return NextResponse.json(
      { error: "GROQ_API_KEY가 설정되어 있지 않습니다." },
      { status: 503 },
    );
  }

  const input: SlotBackfillInput = {
    stageId,
    stageTitle,
    slotKey,
    slotLabel,
    artifactSummary:
      typeof (body as { artifactSummary?: string }).artifactSummary === "string"
        ? (body as { artifactSummary: string }).artifactSummary
        : undefined,
    existingHint:
      typeof (body as { existingHint?: string }).existingHint === "string"
        ? (body as { existingHint: string }).existingHint
        : undefined,
  };

  try {
    const result = await groqComplete(buildSlotBackfillPrompt(input), {
      models: resolveGroqFastModels(),
      temperature: 0.35,
      jsonMode: true,
    });

    const content = extractContent(result.text);
    if (!content) {
      return NextResponse.json(
        { error: "백필 내용을 생성하지 못했습니다." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      content,
      confidence: "hypothesis" as const,
      source: "groq",
      model: result.model,
    });
  } catch (error) {
    console.error("[api/ai/slot-backfill] Groq error:", error);
    return NextResponse.json(
      { error: formatGroqError(error) },
      { status: 502 },
    );
  }
}
