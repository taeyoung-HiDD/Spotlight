import { fetchStage1CollectState } from "@/lib/artifacts/stage1Collect";
import { fetchStage2EmpathyMap } from "@/lib/artifacts/stage2EmpathyMap";
import { resolveStage1StartingPoint } from "@/lib/stages/stage1/resolveStartingPoint";
import {
  buildCremaToKnowTable,
  inferResearchMethodsFromTable,
  type CremaToKnowBuildContext,
} from "@/lib/stages/fieldResearch/cremaToKnowV5";
import type {
  FieldResearchData,
  ResearchMethodPlan,
  ToKnowPrepState,
} from "@/lib/stages/fieldResearch/types";

const METHOD_LABELS: Record<string, string> = {
  desk_research: "데스크 리서치",
  survey: "설문",
  fgd: "FGD",
  home_visit_in_depth: "Home Visit / In-depth Interview",
  shadowing: "Travel Along / Shadowing",
  be_the_customer: "Be the Customer",
  other: "기타",
};

export async function loadCremaToKnowBuildContext(
  projectId: string,
): Promise<CremaToKnowBuildContext> {
  const [startingPoint, s1, s2] = await Promise.all([
    resolveStage1StartingPoint(projectId),
    fetchStage1CollectState(projectId),
    fetchStage2EmpathyMap(projectId),
  ]);

  const problem =
    startingPoint.trim() || s1.state.startingPoint?.trim() || "";

  return {
    startingPoint: problem,
    personaName: s2.data.personaName.trim(),
    personaSituation:
      s2.data.personaSituationRaw.trim() || s2.data.personaContext.trim(),
    contextualAnswers: s2.data.contextualPrep.answers,
    contextualInsights: s2.data.contextualInsights,
    unknowns: s2.data.toKnowUnknowns,
    dimensionResearch: s2.data.contextualDimensionResearch,
    selectedDimensions: s2.data.contextualPrep.selectedDimensions,
  };
}

function prepFromContext(ctx: CremaToKnowBuildContext): ToKnowPrepState {
  const primary = ctx.contextualAnswers.primary_users?.[0]?.trim() ?? "";
  return {
    phase: "refining",
    step: "done",
    targetPerson:
      ctx.personaName?.trim() ||
      primary ||
      ctx.personaSituation?.trim().slice(0, 40) ||
      "",
    situation:
      ctx.personaSituation?.trim() ||
      formatSituationFromAnswers(ctx) ||
      ctx.startingPoint.trim(),
    stakeholders: formatAnswerList(ctx.contextualAnswers.stakeholders),
    competitiveContext: [
      formatAnswerList(ctx.contextualAnswers.competitors),
      formatAnswerList(ctx.contextualAnswers.products_services),
    ]
      .filter(Boolean)
      .join(" · "),
  };
}

function formatAnswerList(items: string[] | undefined): string {
  if (!items?.length) return "";
  return items.join(", ");
}

function formatSituationFromAnswers(ctx: CremaToKnowBuildContext): string {
  const parts = [
    ctx.contextualAnswers.situation,
    ctx.contextualAnswers.environment,
  ]
    .flat()
    .filter(Boolean);
  return parts.slice(0, 4).join(", ");
}

function methodsFromTable(
  table: FieldResearchData["toKnowTable"],
): ResearchMethodPlan[] {
  const ids = inferResearchMethodsFromTable(table);
  return ids.map((id) => ({
    id,
    label: METHOD_LABELS[id] ?? id,
    rationale: "CREMA v5 To-know 초안에서 사용된 방법",
  }));
}

/** 3단계 최초 진입 — 1·2단계 기반 CREMA v5 To-know 초안 */
export function bootstrapFieldResearchFromPriorStages(
  ctx: CremaToKnowBuildContext,
  base: FieldResearchData,
): FieldResearchData {
  const toKnowTable = buildCremaToKnowTable(ctx);
  return {
    ...base,
    toKnowPrep: prepFromContext(ctx),
    toKnowTable,
    researchMethods: methodsFromTable(toKnowTable),
  };
}

export async function bootstrapFieldResearchForProject(
  projectId: string,
  base: FieldResearchData,
): Promise<FieldResearchData> {
  const ctx = await loadCremaToKnowBuildContext(projectId);
  return bootstrapFieldResearchFromPriorStages(ctx, base);
}
