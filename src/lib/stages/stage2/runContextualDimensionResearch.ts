import type { ContextualDimensionResearchResult } from "@/lib/stages/stage2/contextualDimensionResearch";
import { heuristicDimensionResearch } from "@/lib/stages/stage2/contextualDimensionResearch";
import {
  finalizePeopleFindings,
  isPeopleContextualDimension,
  type PeopleResearchPriorContext,
} from "@/lib/stages/stage2/peopleContextualResearch";
import { sanitizeContextualFindings } from "@/lib/stages/stage2/sanitizeContextualFindings";
import type {
  ContextualDimensionAnswers,
  ContextualDimensionId,
} from "@/lib/stages/stage2/contextualDimensions";
import { getDimensionDef } from "@/lib/stages/stage2/contextualDimensions";

export async function runContextualDimensionResearch(
  problem: string,
  dimensionId: ContextualDimensionId,
  answers: ContextualDimensionAnswers,
  prior?: PeopleResearchPriorContext,
): Promise<ContextualDimensionResearchResult> {
  const def = getDimensionDef(dimensionId);
  const items = answers[dimensionId] ?? [];

  try {
    const res = await fetch("/api/stage2/contextual-research", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        problem,
        dimensionId,
        dimensionLabel: def.label,
        answers: items,
        primaryUserFindings: prior?.primaryUserFindings,
        primaryUserSegments: prior?.primaryUserSegments,
      }),
    });

    if (!res.ok) {
      const err = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(err?.error ?? `조사 요청 실패 (${res.status})`);
    }

    const data = (await res.json()) as { findings?: string };
    const rawFindings =
      typeof data.findings === "string" && data.findings.trim()
        ? data.findings.trim()
        : heuristicDimensionResearch(problem, dimensionId, answers, prior);
    const findings = isPeopleContextualDimension(dimensionId)
      ? finalizePeopleFindings(dimensionId, rawFindings, prior)
      : sanitizeContextualFindings(rawFindings);

    return {
      status: "done",
      findings,
      generatedAt: new Date().toISOString(),
    };
  } catch (e) {
    const message = e instanceof Error ? e.message : "조사를 완료하지 못했습니다.";
    const fallback = heuristicDimensionResearch(problem, dimensionId, answers, prior);
    const findings = isPeopleContextualDimension(dimensionId)
      ? finalizePeopleFindings(dimensionId, fallback, prior)
      : sanitizeContextualFindings(fallback);
    return {
      status: "error",
      findings,
      errorMessage: message,
      generatedAt: new Date().toISOString(),
    };
  }
}
