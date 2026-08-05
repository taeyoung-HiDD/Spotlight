import { NextResponse } from "next/server";
import { buildHmwSubQuestionComposePrompt } from "@/lib/ai/prompts/hmwSubQuestionCompose";
import { resolveGroqApiKey, resolveGroqTextModels } from "@/lib/ai/env";
import { groqComplete } from "@/lib/ai/providers/groqText";
import { fetchProjectAccess } from "@/lib/projects/projectAccess";
import { composeInterpretationSubQuestion } from "@/lib/stages/stage7/hmwInterpretation";
import { containsSolutionNoun } from "@/lib/stages/stage7/hmwQualityChecklist";
import type { HmwInterpretationSlot } from "@/lib/stages/stage7/hmwTypes";

interface SelectionLine {
  slot: HmwInterpretationSlot;
  slotLabel: string;
  text: string;
}

function parseSelections(raw: unknown): SelectionLine[] {
  if (!Array.isArray(raw)) return [];
  const slots: HmwInterpretationSlot[] = [
    "who",
    "object",
    "outcome",
    "direction",
  ];
  return raw
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const o = item as Record<string, unknown>;
      const slot = String(o.slot ?? "").trim() as HmwInterpretationSlot;
      return {
        slot,
        slotLabel: String(o.slotLabel ?? "").trim(),
        text: String(o.text ?? "").trim(),
      };
    })
    .filter(
      (s) => slots.includes(s.slot) && s.text && !containsSolutionNoun(s.text),
    );
}

function extractQuestion(raw: string): string {
  const line = raw
    .trim()
    .replace(/^["「『]|["」』]$/gu, "")
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.includes("어떻게") || l.endsWith("까?"));
  const text = (line ?? raw.trim()).replace(/^출력\s*[:：]\s*/u, "").trim();
  if (!text.includes("어떻게")) {
    return text.startsWith("어떻게")
      ? text
      : `어떻게 하면 ${text.replace(/^어떻게\s*하면\s*/u, "")}`;
  }
  return text;
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
  const selections = parseSelections(
    (body as { selections?: unknown }).selections,
  );
  const fallbackDraft = String(
    (body as { fallbackDraft?: string }).fallbackDraft ?? "",
  ).trim();

  if (!projectId || !hmwText || selections.length === 0) {
    return NextResponse.json(
      { error: "projectId, hmwText, selections가 필요합니다." },
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

  const localFallback =
    fallbackDraft ||
    composeInterpretationSubQuestion(
      hmwText,
      selections.map((s) => ({
        slot: s.slot,
        slotLabel: s.slotLabel || `${s.slot}이란?`,
        options: [{ id: s.slot, text: s.text }],
      })),
      Object.fromEntries(selections.map((s) => [s.slot, s.slot])) as Record<
        string,
        string
      >,
    );

  if (!resolveGroqApiKey()) {
    return NextResponse.json({
      subQuestion: localFallback,
      source: "heuristic" as const,
    });
  }

  try {
    const models = resolveGroqTextModels();
    const result = await groqComplete(
      buildHmwSubQuestionComposePrompt({ hmwText, selections }),
      { model: models[0], temperature: 0.35 },
    );
    let subQuestion = extractQuestion(result.text);
    if (!subQuestion || containsSolutionNoun(subQuestion)) {
      subQuestion = localFallback;
      return NextResponse.json({
        subQuestion,
        source: "heuristic" as const,
      });
    }
    if (!/어떻게\s*하면/u.test(subQuestion)) {
      subQuestion = `어떻게 하면 ${subQuestion.replace(/\?$/u, "")} 할 수 있을까?`;
    }
    if (!subQuestion.endsWith("?")) {
      subQuestion = `${subQuestion.replace(/[.?！？]*$/u, "")}?`;
    }
    return NextResponse.json({
      subQuestion: subQuestion.replace(/\s+/g, " ").trim(),
      source: "groq" as const,
    });
  } catch (error) {
    console.error("[compose-hmw-subquestion]", error);
    return NextResponse.json({
      subQuestion: localFallback,
      source: "heuristic" as const,
    });
  }
}
