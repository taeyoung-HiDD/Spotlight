import { NextResponse } from "next/server";
import { resolveGroqApiKey, resolveGroqTextModels } from "@/lib/ai/env";
import { groqComplete } from "@/lib/ai/providers/groqText";
import {
  buildResearchPrepPrompt,
  heuristicResearchPrep,
  normalizeStage3ResearchPrep,
  parseResearchPrepJson,
} from "@/lib/stages/fieldResearch/stage3ResearchPrep";
import type { PrePmfOverviewData } from "@/lib/stages/stage2/prePmfOverview";

function parsePrePmfSummary(body: Record<string, unknown>): {
  problem: string;
  prePmfSummary: string;
  targetLabels: string[];
  prePmf?: PrePmfOverviewData;
} {
  const problem =
    typeof body.problem === "string" ? body.problem.trim().slice(0, 2000) : "";
  const prePmfSummary =
    typeof body.prePmfSummary === "string"
      ? body.prePmfSummary.trim().slice(0, 4000)
      : "";
  const rawLabels = body.targetLabels;
  const targetLabels = Array.isArray(rawLabels)
    ? rawLabels
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 8)
    : [];
  return { problem, prePmfSummary, targetLabels };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 JSON입니다." }, { status: 400 });
  }

  const o = body as Record<string, unknown>;
  const { problem, prePmfSummary, targetLabels } = parsePrePmfSummary(o);

  const heuristicFallback = () => {
    const prep = heuristicResearchPrep(problem, {
      problemStatement: problem,
      targetUsers: targetLabels.map((name) => ({ name, reason: "" })),
    } as PrePmfOverviewData);
    return normalizeStage3ResearchPrep(prep);
  };

  if (!resolveGroqApiKey()) {
    return NextResponse.json({
      researchPrep: heuristicFallback(),
      source: "heuristic",
    });
  }

  try {
    const result = await groqComplete(
      buildResearchPrepPrompt(problem, prePmfSummary, targetLabels),
      {
        models: resolveGroqTextModels(),
        temperature: 0.45,
        jsonMode: true,
      },
    );
    const parsed = parseResearchPrepJson(result.text);
    if (!parsed) {
      return NextResponse.json({
        researchPrep: heuristicFallback(),
        source: "heuristic_fallback",
      });
    }
    return NextResponse.json({
      researchPrep: normalizeStage3ResearchPrep({
        ...parsed,
        recommendationsGenerated: true,
      }),
      source: "groq",
    });
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "조사 준비 추천 생성 실패";
    console.error("[research-prep-recommendations]", detail);
    return NextResponse.json(
      {
        error: "조사 준비 추천 생성에 실패했습니다.",
        researchPrep: heuristicFallback(),
        source: "heuristic_fallback",
      },
      { status: 502 },
    );
  }
}
