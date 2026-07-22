import { fetchStage1CollectState } from "@/lib/artifacts/stage1Collect";
import { fetchStage2PrePmf } from "@/lib/artifacts/stage2PrePmf";
import {
  buildPrePmfSummaryText,
  extractCompetitorLabels,
  prePmfNextActivityUnknowns,
  prePmfPersonDisplayLabels,
} from "@/lib/stages/stage2/prePmfOverview";
import type { ContextualDimensionAnswers } from "@/lib/stages/stage2/contextualDimensions";
import { resolveStage1StartingPoint } from "@/lib/stages/stage1/resolveStartingPoint";
import {
  buildToKnowTable,
  inferResearchMethodsFromTable,
  type ToKnowBuildContext,
} from "@/lib/stages/fieldResearch/toKnowCatalogV5";
import {
  buildDefaultToKnowCoreQuestion,
  mergeToKnowTableWithSeed,
  remapToKnowInfoCategories,
  resolveResearchSubjects,
  sanitizeToKnowCoreQuestion,
  sanitizeToKnowTableRows,
} from "@/lib/stages/fieldResearch/toKnowGuideCategories";
import {
  bootstrapEmpathyMapsFromTargetUsers,
  normalizeStage3EmpathyMaps,
  resolveStage3PrepWorkflowPhase,
} from "@/lib/stages/fieldResearch/stage3EmpathyMap";
import {
  normalizeStage3ResearchPrep,
} from "@/lib/stages/fieldResearch/stage3ResearchPrep";
import { isToKnowDiscoveryActive } from "@/lib/stages/fieldResearch/stage3ToKnowPrepFlow";
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

export async function loadToKnowBuildContext(
  projectId: string,
): Promise<ToKnowBuildContext> {
  const [startingPoint, s1, s2] = await Promise.all([
    resolveStage1StartingPoint(projectId),
    fetchStage1CollectState(projectId),
    fetchStage2PrePmf(projectId),
  ]);

  const problem =
    startingPoint.trim() || s1.state.startingPoint?.trim() || "";

  const pre = s2.data;
  const contextualAnswers: ContextualDimensionAnswers = {
    primary_users: prePmfPersonDisplayLabels(pre.targetUsers, "타겟"),
    stakeholders: prePmfPersonDisplayLabels(pre.stakeholders, "이해관계자"),
    competitors: extractCompetitorLabels(pre),
    products_services: pre.similarServices.items.map((it) => it.name),
  };

  return {
    startingPoint: problem,
    targetUsers: pre.targetUsers,
    personaName: prePmfPersonDisplayLabels(pre.targetUsers, "타겟")[0] ?? "",
    personaSituation: pre.problemStatement.trim() || problem,
    contextualAnswers,
    contextualInsights: buildPrePmfSummaryText(pre),
    unknowns: prePmfNextActivityUnknowns(pre.nextSteps),
    dimensionResearch: {},
    selectedDimensions: [
      "primary_users",
      "stakeholders",
      "competitors",
      "products_services",
    ],
  };
}

function prepFromContext(ctx: ToKnowBuildContext): ToKnowPrepState {
  const subjects = resolveResearchSubjects(ctx);
  const targetLine = subjects.length
    ? subjects.join(", ")
    : ctx.personaName?.trim() ||
      ctx.personaSituation?.trim().slice(0, 40) ||
      "";
  return {
    phase: "refining",
    step: "done",
    targetPerson: targetLine,
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

function hasPrePmfResearchSubjects(ctx: ToKnowBuildContext): boolean {
  return resolveResearchSubjects(ctx).length > 0;
}

function formatAnswerList(items: string[] | undefined): string {
  if (!items?.length) return "";
  return items.join(", ");
}

function formatSituationFromAnswers(ctx: ToKnowBuildContext): string {
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
    rationale: "To-know 초안에서 사용된 방법",
  }));
}

/** 3단계 진입 — 1·2단계 맥락·사전 조사 기반 To-know 초안 병합 */
export function hydrateFieldResearchFromPriorStages(
  ctx: ToKnowBuildContext,
  base: FieldResearchData,
): FieldResearchData {
  const subjects = resolveResearchSubjects(ctx);
  const target = subjects[0] ?? ctx.personaName?.trim() ?? "목표 사용자";
  const seeded = buildToKnowTable(ctx);
  const merged = base.toKnowTable.length
    ? mergeToKnowTableWithSeed(base.toKnowTable, seeded)
    : seeded;
  const remapped = remapToKnowInfoCategories(merged, subjects);
  const toKnowTable = sanitizeToKnowTableRows(
    remapped,
    ctx.startingPoint,
    target,
  );
  const toKnowCoreQuestion =
    sanitizeToKnowCoreQuestion(
      base.toKnowCoreQuestion,
      ctx.startingPoint,
    ) || buildDefaultToKnowCoreQuestion(ctx.startingPoint);

  const skipDiscovery =
    hasPrePmfResearchSubjects(ctx) || base.toKnowTable.length > 0;

  const empathyMaps = bootstrapEmpathyMapsFromTargetUsers(
    ctx.targetUsers ?? [],
    normalizeStage3EmpathyMaps(base.empathyMaps),
  );
  const prepWorkflowPhase = resolveStage3PrepWorkflowPhase(
    base.prepWorkflowPhase,
  );

  const researchPrep = normalizeStage3ResearchPrep(base.researchPrep);

  return {
    ...base,
    prepWorkflowPhase,
    researchPrep,
    empathyMaps,
    toKnowPrep:
      skipDiscovery || !isToKnowDiscoveryActive(base.toKnowPrep)
        ? prepFromContext(ctx)
        : base.toKnowPrep,
    toKnowCoreQuestion,
    toKnowTable,
    researchMethods: methodsFromTable(toKnowTable),
  };
}

/** @deprecated hydrateFieldResearchFromPriorStages 사용 */
export function bootstrapFieldResearchFromPriorStages(
  ctx: ToKnowBuildContext,
  base: FieldResearchData,
): FieldResearchData {
  return hydrateFieldResearchFromPriorStages(ctx, base);
}

export async function hydrateFieldResearchForProject(
  projectId: string,
  data: FieldResearchData,
): Promise<FieldResearchData> {
  const ctx = await loadToKnowBuildContext(projectId);
  return hydrateFieldResearchFromPriorStages(ctx, data);
}

/** @deprecated hydrateFieldResearchForProject 사용 */
export async function bootstrapFieldResearchForProject(
  projectId: string,
  base: FieldResearchData,
): Promise<FieldResearchData> {
  return hydrateFieldResearchForProject(projectId, base);
}

/** @deprecated hydrateFieldResearchForProject에 포함 */
export async function hydrateToKnowCoreQuestion(
  projectId: string,
  data: FieldResearchData,
): Promise<FieldResearchData> {
  return hydrateFieldResearchForProject(projectId, data);
}
