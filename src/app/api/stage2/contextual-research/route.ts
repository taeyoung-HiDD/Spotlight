import { NextResponse } from "next/server";
import { resolveGroqApiKey, resolveGroqTextModels } from "@/lib/ai/env";
import { groqComplete } from "@/lib/ai/providers/groqText";
import { heuristicDimensionResearch } from "@/lib/stages/stage2/contextualDimensionResearch";
import {
  buildPeopleResearchPromptExtra,
  extractPrimaryUserSegmentLabels,
  finalizePeopleFindings,
  isPeopleContextualDimension,
  type PeopleResearchPriorContext,
} from "@/lib/stages/stage2/peopleContextualResearch";
import { sanitizeContextualFindings } from "@/lib/stages/stage2/sanitizeContextualFindings";
import {
  CONTEXTUAL_DIMENSIONS,
  type ContextualDimensionId,
} from "@/lib/stages/stage2/contextualDimensions";
import { COACH_EMPATHY_MAP_PROMPT_RULE } from "@/lib/coach/sanitizeCoachKorean";
import { buildDimensionGuidelinePrompt } from "@/lib/stages/stage2/contextualResearchGuidelines";

function isDimensionId(value: string): value is ContextualDimensionId {
  return CONTEXTUAL_DIMENSIONS.some((d) => d.id === value);
}

function readPriorContext(body: Record<string, unknown>): PeopleResearchPriorContext {
  const primaryUserFindings =
    typeof body.primaryUserFindings === "string"
      ? body.primaryUserFindings.trim()
      : "";
  const rawSegments = body.primaryUserSegments;
  const primaryUserSegments = Array.isArray(rawSegments)
    ? rawSegments
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.trim())
        .filter(Boolean)
    : primaryUserFindings
      ? extractPrimaryUserSegmentLabels(primaryUserFindings)
      : [];
  return {
    primaryUserFindings: primaryUserFindings || undefined,
    primaryUserSegments: primaryUserSegments.length
      ? primaryUserSegments
      : undefined,
  };
}

function buildFindingsPrompt(
  problem: string,
  dimensionId: ContextualDimensionId,
  dimensionLabel: string,
  answers: string[],
  prior?: PeopleResearchPriorContext,
): string {
  const listed =
    answers.length > 0
      ? answers.map((a) => `· ${a}`).join("\n")
      : "· (문제점만 기준 — 이 영역에 맞는 가설을 직접 도출)";

  const peopleExtra = isPeopleContextualDimension(dimensionId)
    ? `\n\n${buildPeopleResearchPromptExtra(dimensionId, prior)}`
    : "";

  const defaultRules = isPeopleContextualDimension(dimensionId)
    ? ""
    : `
- 섹션: 핵심 발견 (가설) / 참고할 관점 (각 2~4개 불릿, · 로 시작)
- 모든 문장은 존댓말(~습니다/~입니다/~됩니다)로 통일. ~이다/~다/~함 등 평서체 금지
- 400~700자`;

  const guidelineBlock = buildDimensionGuidelinePrompt(dimensionId);

  return `
당신은 창업 코치의 맥락 이해(Contextual Research) 보조입니다.
1단계 문제점과 조사 영역(${dimensionLabel})만으로 2차 자료·일반 지식 기반 **가설** 사전 조사 메모를 한국어로 작성하세요.

${guidelineBlock}

규칙:
- ${COACH_EMPATHY_MAP_PROMPT_RULE}
- 없는 사실은 단정하지 마세요. 존댓말 가설·관찰만 쓰세요 (~습니다/~입니다 체).
- 질문형·의문형 문장, 물음표(?), 「현장에서 확인할 질문」 섹션은 절대 넣지 마세요.
- 말머리: [${dimensionLabel}] 사전 조사 메모 (가설)${defaultRules}
- 마크다운 제목(#) 없이 plain text
- 마지막 줄에 반드시: ※ AI·2차 자료 기반 가설입니다. 현장·사용자 조사로 검증하세요.
${peopleExtra}

문제점: ${problem.slice(0, 500) || "(미입력)"}
조사 영역: ${dimensionLabel}
${answers.length ? `사용자 보완 메모:\n${listed}` : `문제점에 맞춰 ${dimensionLabel} 관점의 가설을 직접 작성하세요.`}
`.trim();
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 JSON입니다." }, { status: 400 });
  }

  const problem =
    typeof (body as { problem?: string }).problem === "string"
      ? (body as { problem: string }).problem.trim().slice(0, 2000)
      : "";
  const dimensionIdRaw =
    typeof (body as { dimensionId?: string }).dimensionId === "string"
      ? (body as { dimensionId: string }).dimensionId
      : "";
  const dimensionLabel =
    typeof (body as { dimensionLabel?: string }).dimensionLabel === "string"
      ? (body as { dimensionLabel: string }).dimensionLabel.trim()
      : "";
  const answers = Array.isArray((body as { answers?: unknown }).answers)
    ? (body as { answers: unknown[] }).answers
        .filter((x): x is string => typeof x === "string")
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 24)
    : [];

  if (!isDimensionId(dimensionIdRaw)) {
    return NextResponse.json({ error: "dimensionId가 올바르지 않습니다." }, { status: 400 });
  }

  const dimensionId = dimensionIdRaw;
  const answersMap = { [dimensionId]: answers };
  const prior = readPriorContext(body as Record<string, unknown>);

  const finalize = (text: string) =>
    isPeopleContextualDimension(dimensionId)
      ? finalizePeopleFindings(dimensionId, text, prior)
      : sanitizeContextualFindings(text);

  if (!resolveGroqApiKey()) {
    return NextResponse.json({
      findings: finalize(
        heuristicDimensionResearch(problem, dimensionId, answersMap, prior),
      ),
      source: "heuristic",
    });
  }

  try {
    const result = await groqComplete(
      buildFindingsPrompt(
        problem,
        dimensionId,
        dimensionLabel || dimensionId,
        answers,
        prior,
      ),
      { models: resolveGroqTextModels(), temperature: 0.35 },
    );
    return NextResponse.json({
      findings: finalize(result.text),
      source: "groq",
      model: result.model,
    });
  } catch {
    return NextResponse.json({
      findings: finalize(
        heuristicDimensionResearch(problem, dimensionId, answersMap, prior),
      ),
      source: "heuristic_fallback",
    });
  }
}
