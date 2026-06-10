import { extractAnswerBulletsFromFindings } from "@/lib/stages/stage2/extractAnswersFromFindings";
import { filterDeclarativeBullets } from "@/lib/stages/stage2/sanitizeContextualFindings";
import type { ContextualDimensionResearchMap } from "@/lib/stages/stage2/contextualDimensionResearch";
import {
  buildContextualSummary,
  deriveToKnowFromContextual,
  type ContextualPrepState,
} from "@/lib/stages/stage2/contextualDiscoveryFlow";
import type {
  ContextualDimensionAnswers,
  ContextualDimensionId,
} from "@/lib/stages/stage2/contextualDimensions";
import {
  extractPrimaryUserSegmentLabels,
} from "@/lib/stages/stage2/peopleContextualResearch";
import { runContextualDimensionResearch } from "@/lib/stages/stage2/runContextualDimensionResearch";
import {
  formatSelectedDimensionsLabel,
  selectContextualDimensions,
} from "@/lib/stages/stage2/selectContextualDimensions";
import type { EmpathyMapData } from "@/lib/stages/stage2/empathyMap";
import { formatAnswerList } from "@/lib/stages/stage2/contextualAnswers";

function extractPersonaHint(primaryUsers: string[] | undefined): string {
  const first = primaryUsers?.[0]?.trim() ?? "";
  if (!first) return "";
  return first.length > 40 ? `${first.slice(0, 40)}…` : first;
}

export function answersFromResearch(
  selected: ContextualDimensionId[],
  research: ContextualDimensionResearchMap,
): ContextualDimensionAnswers {
  const answers: ContextualDimensionAnswers = {};
  for (const id of selected) {
    const findings = research[id]?.findings?.trim() ?? "";
    if (!findings) continue;
    const bullets = filterDeclarativeBullets(
      extractAnswerBulletsFromFindings(findings, id),
    );
    if (bullets.length) answers[id] = bullets;
  }
  return answers;
}

export function buildArtifactPatchAfterAutoResearch(
  problem: string,
  prep: ContextualPrepState,
  research: ContextualDimensionResearchMap,
): Partial<EmpathyMapData> {
  const selected = prep.selectedDimensions ?? [];
  const answers = answersFromResearch(selected, research);
  const mergedPrep: ContextualPrepState = {
    ...prep,
    phase: "research",
    step: "done",
    answers,
    autoResearchComplete: true,
  };
  const primary = answers.primary_users;

  return {
    contextualPrep: mergedPrep,
    contextualDimensionResearch: research,
    contextualInsights: buildContextualSummary(
      problem,
      answers,
      prep.confirmNote,
    ),
    toKnowUnknowns: deriveToKnowFromContextual(problem, answers, selected),
    personaName: extractPersonaHint(primary),
    personaSituationRaw: formatAnswerList(answers.situation),
    personaContext: extractPersonaHint(primary),
    personaQnaComplete: true,
  };
}

/** 선정 영역에 대해 사전 조사 일괄 실행 */
export async function runAutoContextualResearch(
  problem: string,
  selected: ContextualDimensionId[],
  onProgress: (
    id: ContextualDimensionId,
    entry: ContextualDimensionResearchMap[ContextualDimensionId],
  ) => void,
): Promise<ContextualDimensionResearchMap> {
  const map: ContextualDimensionResearchMap = {};
  for (const id of selected) {
    onProgress(id, { status: "loading", findings: "" });
  }

  const withoutStakeholders = selected.filter((id) => id !== "stakeholders");
  const runStakeholders = selected.includes("stakeholders");

  await Promise.all(
    withoutStakeholders.map(async (id) => {
      const result = await runContextualDimensionResearch(problem, id, {});
      map[id] = result;
      onProgress(id, result);
    }),
  );

  if (runStakeholders) {
    const primaryFindings = map.primary_users?.findings?.trim() ?? "";
    const result = await runContextualDimensionResearch(
      problem,
      "stakeholders",
      {},
      {
        primaryUserFindings: primaryFindings || undefined,
        primaryUserSegments: primaryFindings
          ? extractPrimaryUserSegmentLabels(primaryFindings)
          : undefined,
      },
    );
    map.stakeholders = result;
    onProgress("stakeholders", result);
  }

  return map;
}

export function planAutoResearch(problem: string): {
  selected: ContextualDimensionId[];
  label: string;
} {
  const selected = selectContextualDimensions(problem);
  return {
    selected,
    label: formatSelectedDimensionsLabel(selected),
  };
}
