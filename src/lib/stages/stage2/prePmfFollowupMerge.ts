import {
  normalizePrePmfOverview,
  normalizePrePmfPersonItems,
  normalizePrePmfSection,
  normalizePrePmfStatCards,
  normalizeResearchLenses,
  prePmfPersonValueSentence,
  type PrePmfLensDetail,
  type PrePmfLensId,
  type PrePmfOverviewData,
  type PrePmfPersonItem,
  type PrePmfSection,
  type PrePmfSourceRef,
  type PrePmfStatCard,
  type SimilarServiceItem,
} from "@/lib/stages/stage2/prePmfOverview";

function hasOwn(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function normalizeLineKey(line: string): string {
  return line
    .replace(/^[·\-*\s]+/, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function formatBulletLine(line: string): string {
  const trimmed = line.trim();
  if (!trimmed) return "";
  return trimmed.startsWith("·") ? trimmed : `· ${trimmed}`;
}

/** 불릿·줄 단위 텍스트 — 기존 유지 + 새 줄만 추가 */
export function mergePrePmfBulletText(base: string, addition: string): string {
  const baseLines = base
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  const addLines = addition
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!addLines.length) return baseLines.join("\n");

  const seen = new Set(baseLines.map(normalizeLineKey));
  const out = [...baseLines];
  for (const line of addLines) {
    const key = normalizeLineKey(line);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(formatBulletLine(line));
  }
  return out.join("\n");
}

/** 일반 문단 — 기존 유지 + 새 내용 덧붙임 (중복 문장 제외) */
function mergePlainText(base: string, addition: string): string {
  const b = base.trim();
  const a = addition.trim();
  if (!a) return b;
  if (!b) return a;
  if (b.includes(a)) return b;
  if (a.includes(b)) return a;
  const bKey = normalizeLineKey(b);
  const aKey = normalizeLineKey(a);
  if (bKey === aKey || bKey.includes(aKey) || aKey.includes(bKey)) return b;
  return `${b}\n${a}`;
}

function mergeSources(
  base: PrePmfSourceRef[],
  patch: PrePmfSourceRef[],
): PrePmfSourceRef[] {
  const seen = new Set<string>();
  const out: PrePmfSourceRef[] = [];
  for (const source of [...base, ...patch]) {
    const url = source.url.trim();
    const key = url || source.title.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(source);
  }
  return out;
}

function mergeSectionAdditive(
  base: PrePmfSection,
  patch: PrePmfSection,
): PrePmfSection {
  const mergedBody = patch.body.trim()
    ? mergePrePmfBulletText(base.body, patch.body)
    : base.body;
  return {
    status: patch.status === "idle" ? base.status : patch.status,
    body: mergedBody,
    sources: mergeSources(base.sources, patch.sources),
  };
}

function mergePersonItems(
  base: PrePmfPersonItem[],
  patch: PrePmfPersonItem[],
): PrePmfPersonItem[] {
  const order: string[] = [];
  const byName = new Map<string, PrePmfPersonItem>();

  const upsert = (item: PrePmfPersonItem, fromPatch: boolean) => {
    const name = item.name.trim();
    if (!name) return;
    const key = name.toLowerCase();
    if (!byName.has(key)) order.push(key);
    const existing = byName.get(key);
    const reason = item.reason.trim();
    if (!existing) {
      byName.set(key, { name, reason });
      return;
    }
    if (!fromPatch || !reason) {
      byName.set(key, existing);
      return;
    }
    const existingReason = existing.reason.trim();
    if (!existingReason) {
      byName.set(key, { name: existing.name, reason });
      return;
    }
    if (
      existingReason === reason ||
      existingReason.includes(reason) ||
      reason.includes(existingReason)
    ) {
      byName.set(key, existing);
      return;
    }
    byName.set(key, {
      name: existing.name,
      reason: `${existingReason} ${reason}`,
    });
  };

  for (const item of base) upsert(item, false);
  for (const item of patch) upsert(item, true);

  return order
    .map((key) => byName.get(key))
    .filter((item): item is PrePmfPersonItem => Boolean(item));
}

function mergeStatCards(
  base: PrePmfStatCard[],
  patch: PrePmfStatCard[],
): PrePmfStatCard[] {
  const order: string[] = [];
  const byLabel = new Map<string, PrePmfStatCard>();

  const upsert = (card: PrePmfStatCard) => {
    const label = card.label.trim();
    if (!label) return;
    const key = label.toLowerCase();
    if (!byLabel.has(key)) order.push(key);
    const existing = byLabel.get(key);
    if (!existing) {
      byLabel.set(key, card);
      return;
    }
    byLabel.set(key, {
      label: existing.label,
      value: card.value.trim() || existing.value,
      source: card.source.trim() || existing.source,
    });
  };

  for (const card of base) upsert(card);
  for (const card of patch) upsert(card);

  return order
    .map((key) => byLabel.get(key))
    .filter((card): card is PrePmfStatCard => Boolean(card))
    .slice(0, 8);
}

function normalizeServiceName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "");
}

function mergeSimilarServices(
  base: SimilarServiceItem[],
  patch: SimilarServiceItem[],
): SimilarServiceItem[] {
  const order: string[] = [];
  const byName = new Map<string, SimilarServiceItem>();

  const upsert = (item: SimilarServiceItem, fromPatch: boolean) => {
    const name = item.name.trim();
    if (!name) return;
    const key = normalizeServiceName(name);
    if (!byName.has(key)) order.push(key);
    const existing = byName.get(key);
    if (!existing) {
      byName.set(key, item);
      return;
    }
    if (!fromPatch) {
      byName.set(key, existing);
      return;
    }
    byName.set(key, {
      name: existing.name,
      region: item.region ?? existing.region,
      note: item.note.trim()
        ? mergePlainText(existing.note, item.note)
        : existing.note,
      url: item.url?.trim() || existing.url,
    });
  };

  for (const item of base) upsert(item, false);
  for (const item of patch) upsert(item, true);

  return order
    .map((key) => byName.get(key))
    .filter((item): item is SimilarServiceItem => Boolean(item));
}

function mergeLensDetail(
  base: PrePmfLensDetail | undefined,
  patch: PrePmfLensDetail,
): PrePmfLensDetail {
  return {
    targetUsers: mergePrePmfBulletText(base?.targetUsers ?? "", patch.targetUsers),
    currentBehavior: mergePrePmfBulletText(
      base?.currentBehavior ?? "",
      patch.currentBehavior,
    ),
    marketEnvironment: mergePrePmfBulletText(
      base?.marketEnvironment ?? "",
      patch.marketEnvironment,
    ),
    judgmentResult: patch.judgmentResult.trim()
      ? mergePlainText(base?.judgmentResult ?? "", patch.judgmentResult)
      : (base?.judgmentResult ?? ""),
  };
}

function formatTargetUserBullets(items: PrePmfPersonItem[]): string {
  return items
    .map((item) => {
      const sentence = prePmfPersonValueSentence(item);
      return sentence ? `· ${sentence}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

/** 타겟 사용자 배열 병합 후 렌즈1 타겟 불릿을 배열 기준으로 동기화 */
function reconcileValuePropositionLens(
  data: PrePmfOverviewData,
  targetUsersPatched: boolean,
): PrePmfOverviewData {
  if (!targetUsersPatched || !data.targetUsers.length) return data;
  const bullets = formatTargetUserBullets(data.targetUsers);
  const stored = data.researchLenses.value_proposition;
  return {
    ...data,
    researchLenses: {
      ...data.researchLenses,
      value_proposition: {
        targetUsers: bullets,
        currentBehavior: stored?.currentBehavior ?? "",
        marketEnvironment: stored?.marketEnvironment ?? "",
        judgmentResult: stored?.judgmentResult ?? "",
      },
    },
  };
}

/**
 * 코치 follow-up이 반환한 overviewPatch를 기존 artifact에 **누적 병합**합니다.
 * 기존 항목은 유지하고, patch에 있는 새 내용만 추가·보완합니다.
 */
export function applyPrePmfOverviewPatch(
  base: PrePmfOverviewData,
  patchRaw: unknown,
): PrePmfOverviewData {
  if (!patchRaw || typeof patchRaw !== "object") return base;
  const patch = patchRaw as Record<string, unknown>;

  let next: PrePmfOverviewData = { ...base };

  if (hasOwn(patch, "problemStatement")) {
    const addition = normalizePrePmfOverview({
      problemStatement: patch.problemStatement,
    }).problemStatement;
    next.problemStatement = mergePlainText(base.problemStatement, addition);
  }
  if (hasOwn(patch, "targetUsers")) {
    next.targetUsers = mergePersonItems(
      base.targetUsers,
      normalizePrePmfPersonItems(patch.targetUsers),
    );
  }
  if (hasOwn(patch, "stakeholders")) {
    next.stakeholders = mergePersonItems(
      base.stakeholders,
      normalizePrePmfPersonItems(patch.stakeholders),
    );
  }
  if (hasOwn(patch, "businessModel")) {
    const addition = normalizePrePmfOverview({
      businessModel: patch.businessModel,
    }).businessModel;
    next.businessModel = mergePrePmfBulletText(base.businessModel, addition);
  }
  if (hasOwn(patch, "solution")) {
    const addition = normalizePrePmfOverview({ solution: patch.solution }).solution;
    next.solution = mergePlainText(base.solution, addition);
  }
  if (hasOwn(patch, "valueProposition")) {
    next.valueProposition = mergeSectionAdditive(
      base.valueProposition,
      normalizePrePmfSection(patch.valueProposition),
    );
  }
  if (hasOwn(patch, "industryLandscape")) {
    next.industryLandscape = mergeSectionAdditive(
      base.industryLandscape,
      normalizePrePmfSection(patch.industryLandscape),
    );
  }
  if (hasOwn(patch, "marketSize")) {
    next.marketSize = mergeSectionAdditive(
      base.marketSize,
      normalizePrePmfSection(patch.marketSize),
    );
  }
  if (hasOwn(patch, "competitiveLandscape")) {
    next.competitiveLandscape = mergeSectionAdditive(
      base.competitiveLandscape,
      normalizePrePmfSection(patch.competitiveLandscape),
    );
  }
  if (hasOwn(patch, "keyFeatures")) {
    next.keyFeatures = mergeSectionAdditive(
      base.keyFeatures,
      normalizePrePmfSection(patch.keyFeatures),
    );
  }
  if (hasOwn(patch, "marketStats")) {
    next.marketStats = mergeStatCards(
      base.marketStats,
      normalizePrePmfStatCards(patch.marketStats, 8),
    );
  }
  if (hasOwn(patch, "similarServices")) {
    const normalized = normalizePrePmfOverview({
      similarServices: patch.similarServices,
    }).similarServices;
    next.similarServices = {
      status: normalized.status === "idle" ? base.similarServices.status : normalized.status,
      items: mergeSimilarServices(base.similarServices.items, normalized.items),
      sources: mergeSources(base.similarServices.sources, normalized.sources),
    };
  }
  if (hasOwn(patch, "researchLenses")) {
    const patchLenses = normalizeResearchLenses(patch.researchLenses);
    const mergedLenses = { ...base.researchLenses };
    for (const [id, patchDetail] of Object.entries(patchLenses) as [
      PrePmfLensId,
      PrePmfLensDetail,
    ][]) {
      if (!patchDetail) continue;
      mergedLenses[id] = mergeLensDetail(base.researchLenses[id], patchDetail);
    }
    next.researchLenses = mergedLenses;
  }
  if (hasOwn(patch, "lensClassificationNotes")) {
    const notes = normalizePrePmfOverview({
      lensClassificationNotes: patch.lensClassificationNotes,
    }).lensClassificationNotes;
    next.lensClassificationNotes = { ...base.lensClassificationNotes, ...notes };
  }
  if (hasOwn(patch, "verdict")) {
    const verdictPatch = patch.verdict;
    if (verdictPatch && typeof verdictPatch === "object") {
      const v = verdictPatch as Record<string, unknown>;
      const rationale =
        typeof v.rationale === "string" && v.rationale.trim()
          ? v.rationale.trim()
          : "";
      next.verdict = {
        ...base.verdict,
        decision:
          v.decision === "go" ||
          v.decision === "hypothesis_board" ||
          v.decision === "loop_back"
            ? v.decision
            : base.verdict.decision,
        rationale: rationale
          ? mergePlainText(base.verdict.rationale, rationale)
          : base.verdict.rationale,
        goActivities: base.verdict.goActivities,
        hypothesisActivities: base.verdict.hypothesisActivities,
        loopBackActivities: base.verdict.loopBackActivities,
      };
    }
  }

  next = reconcileValuePropositionLens(next, hasOwn(patch, "targetUsers"));

  return {
    ...next,
    researchInteractionId: base.researchInteractionId,
    sourceProblem: base.sourceProblem,
    generatedAt: base.generatedAt,
    generationStatus: base.generationStatus,
  };
}

/** 코치 follow-up 프롬프트용 — 현재 Overview 요약 JSON */
export function serializePrePmfOverviewForFollowup(data: PrePmfOverviewData): string {
  const compact = {
    problemStatement: data.problemStatement,
    targetUsers: data.targetUsers,
    stakeholders: data.stakeholders,
    valueProposition: data.valueProposition.body,
    industryLandscape: data.industryLandscape.body,
    marketSize: data.marketSize.body,
    marketStats: data.marketStats,
    competitiveLandscape: data.competitiveLandscape.body,
    similarServices: data.similarServices.items,
    businessModel: data.businessModel,
    researchLenses: data.researchLenses,
    verdict: {
      decision: data.verdict.decision,
      rationale: data.verdict.rationale,
    },
  };
  return JSON.stringify(compact, null, 2);
}

export function formatFollowupConversationHistory(
  history: { role: string; content: string }[],
  maxTurns = 14,
): string {
  if (!history.length) return "(대화 없음)";
  return history
    .slice(-maxTurns)
    .map((item) => {
      const role =
        item.role === "user" ? "사용자" : item.role === "model" ? "코치" : "코치";
      return `${role}: ${item.content.trim()}`;
    })
    .filter((line) => line.length > 4)
    .join("\n\n");
}

export function prePmfOverviewPatchHasChanges(
  before: PrePmfOverviewData,
  after: PrePmfOverviewData,
): boolean {
  return (
    serializePrePmfOverviewForFollowup(before) !==
    serializePrePmfOverviewForFollowup(after)
  );
}
