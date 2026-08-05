import { NextResponse } from "next/server";
import { buildHmwInterpretationPrompt } from "@/lib/ai/prompts/hmwInterpretation";
import { resolveGroqApiKey, resolveGroqTextModels } from "@/lib/ai/env";
import { groqComplete } from "@/lib/ai/providers/groqText";
import { fetchProjectAccess } from "@/lib/projects/projectAccess";
import {
  heuristicHmwInterpretations,
  stripSolutionNounOptions,
} from "@/lib/stages/stage7/hmwInterpretation";
import { containsSolutionNoun } from "@/lib/stages/stage7/hmwQualityChecklist";
import type {
  HmwInterpretation,
  HmwInterpretationOption,
  HmwInterpretationSlot,
} from "@/lib/stages/stage7/hmwTypes";

const SLOTS: HmwInterpretationSlot[] = [
  "who",
  "object",
  "outcome",
  "direction",
];

function parseJsonObject(raw: string): Record<string, unknown> | null {
  const trimmed = raw.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fence?.[1]?.trim() ?? trimmed;
  try {
    const parsed = JSON.parse(body) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    /* fall through */
  }
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      return JSON.parse(body.slice(start, end + 1)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
  return null;
}

function normalizeOption(
  raw: unknown,
  slot: HmwInterpretationSlot,
  index: number,
): HmwInterpretationOption | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const text = String(o.text ?? "").trim().slice(0, 80);
  if (!text || containsSolutionNoun(text)) return null;
  return {
    id: String(o.id ?? "").trim() || `${slot}-${index + 1}`,
    text,
    ...(String(o.sourceEvidence ?? "").trim()
      ? { sourceEvidence: String(o.sourceEvidence).trim().slice(0, 120) }
      : {}),
  };
}

function normalizeInterpretations(raw: unknown): HmwInterpretation[] {
  if (!raw || typeof raw !== "object") return [];
  const list = (raw as { interpretations?: unknown }).interpretations;
  if (!Array.isArray(list)) return [];
  const out: HmwInterpretation[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const slot = o.slot;
    if (!SLOTS.includes(slot as HmwInterpretationSlot)) continue;
    const options = Array.isArray(o.options)
      ? o.options
          .map((opt, i) =>
            normalizeOption(opt, slot as HmwInterpretationSlot, i),
          )
          .filter((opt): opt is HmwInterpretationOption => opt !== null)
          .slice(0, 3)
      : [];
    if (options.length < 2) continue;
    out.push({
      slot: slot as HmwInterpretationSlot,
      slotLabel:
        String(o.slotLabel ?? "").trim().slice(0, 40) || `${slot}이란?`,
      options,
    });
  }
  return stripSolutionNounOptions(out);
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 JSON입니다." }, { status: 400 });
  }

  const projectId = String(
    (body as { projectId?: string }).projectId ?? "",
  ).trim();
  const hmwText = String((body as { hmwText?: string }).hmwText ?? "").trim();
  const latentNeedText = String(
    (body as { latentNeedText?: string }).latentNeedText ?? "",
  ).trim();
  const subjectName = String(
    (body as { subjectName?: string }).subjectName ?? "",
  ).trim();
  const evidenceLines = Array.isArray(
    (body as { evidenceLines?: unknown }).evidenceLines,
  )
    ? ((body as { evidenceLines: unknown[] }).evidenceLines
        .map((l) => String(l ?? "").trim())
        .filter(Boolean)
        .slice(0, 24) as string[])
    : [];
  const rationaleLines = Array.isArray(
    (body as { rationaleLines?: unknown }).rationaleLines,
  )
    ? ((body as { rationaleLines: unknown[] }).rationaleLines
        .map((l) => String(l ?? "").trim())
        .filter(Boolean)
        .slice(0, 8) as string[])
    : [];

  if (!projectId || !hmwText) {
    return NextResponse.json(
      { error: "projectId와 hmwText가 필요합니다." },
      { status: 400 },
    );
  }

  const access = await fetchProjectAccess(projectId);
  if (!access) {
    return NextResponse.json(
      { error: "프로젝트 접근 권한이 없습니다." },
      { status: 403 },
    );
  }

  const fallback = () =>
    heuristicHmwInterpretations({
      hmwText,
      subjectName,
      latentNeedText,
    });

  if (!resolveGroqApiKey()) {
    return NextResponse.json({
      interpretations: fallback(),
      source: "heuristic" as const,
    });
  }

  const prompt = buildHmwInterpretationPrompt({
    hmwText,
    latentNeedText,
    subjectName,
    evidenceLines,
    rationaleLines,
  });

  try {
    const models = resolveGroqTextModels();
    const result = await groqComplete(prompt, {
      model: models[0],
      temperature: 0.4,
      jsonMode: true,
    });
    const parsed = parseJsonObject(result.text);
    let interpretations = parsed
      ? normalizeInterpretations(parsed)
      : [];
    if (interpretations.length === 0) {
      interpretations = fallback();
      return NextResponse.json({
        interpretations,
        source: "heuristic" as const,
      });
    }
    return NextResponse.json({
      interpretations,
      source: "groq" as const,
    });
  } catch (error) {
    console.error("[interpret-hmw]", error);
    return NextResponse.json({
      interpretations: fallback(),
      source: "heuristic" as const,
    });
  }
}
