import { NextResponse } from "next/server";
import { resolveGroqApiKey, resolveGroqTextModels } from "@/lib/ai/env";
import { groqComplete } from "@/lib/ai/providers/groqText";
import {
  heuristicPersonaSummary,
  personaDicebearPngUrl,
} from "@/lib/stages/stage2/personaAvatar";

function extractJsonObject(text: string): Record<string, unknown> | null {
  const t = text.trim();
  const fenced = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced?.[1]?.trim() ?? t;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function buildSummaryPrompt(name: string, situationRaw: string): string {
  return `
당신은 공감맵 페르소나 카드용 짧은 한국어 꼬리표만 만듭니다.
입력: 이름 + 사용자가 말한 상황(원문).

규칙:
- 명사구 형태만 (예: 15년차 직장인, 초등 자녀 학부모, 야근 잦은 신입)
- 28자 이내, 따옴표·콜론 없음
- 이름을 반복하지 마세요
- JSON 한 줄만 출력: {"summary":"..."}

이름: ${name}
상황 원문: ${situationRaw.slice(0, 800)}
`.trim();
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 JSON입니다." }, { status: 400 });
  }

  const name =
    typeof (body as { name?: string }).name === "string"
      ? (body as { name: string }).name.trim().slice(0, 40)
      : "";
  const situationRaw =
    typeof (body as { situationRaw?: string }).situationRaw === "string"
      ? (body as { situationRaw: string }).situationRaw.trim().slice(0, 2000)
      : "";

  if (!name || !situationRaw) {
    return NextResponse.json(
      { error: "name과 situationRaw가 필요합니다." },
      { status: 400 },
    );
  }

  const thumbnailUrl = personaDicebearPngUrl(name, situationRaw, 128);

  if (!resolveGroqApiKey()) {
    return NextResponse.json({
      summary: heuristicPersonaSummary(situationRaw),
      thumbnailUrl,
    });
  }

  let summary: string | null = null;
  try {
    const result = await groqComplete(buildSummaryPrompt(name, situationRaw), {
      models: resolveGroqTextModels(),
      temperature: 0.3,
      jsonMode: true,
    });
    const o = extractJsonObject(result.text);
    const s = o?.summary;
    summary = typeof s === "string" ? s.trim().slice(0, 40) : null;
  } catch {
    /* heuristic fallback below */
  }

  const finalSummary =
    (summary && summary.length > 0 ? summary : heuristicPersonaSummary(situationRaw)) ||
    situationRaw.slice(0, 24);

  return NextResponse.json({
    summary: finalSummary,
    thumbnailUrl,
  });
}
