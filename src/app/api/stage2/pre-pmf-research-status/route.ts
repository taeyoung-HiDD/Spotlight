import { NextResponse } from "next/server";
import { resolveGeminiApiKey, resolveGeminiTextModels } from "@/lib/ai/env";
import {
  getDeepResearch,
  type DeepResearchSource,
} from "@/lib/ai/providers/geminiDeepResearch";
import { geminiChat } from "@/lib/ai/providers/geminiText";
import { buildPrePmfStructurePrompt } from "@/lib/stages/stage2/prePmfDeepResearch";
import {
  enrichSimilarServiceUrls,
  normalizePrePmfNextActivities,
  normalizePrePmfPersonItems,
  normalizePrePmfStatCards,
  PRE_PMF_MAX_SIMILAR_SERVICES,
  sanitizePrePmfMarketStats,
  type PrePmfSourceRef,
  type SimilarServiceItem,
} from "@/lib/stages/stage2/prePmfOverview";
import { runSyncPrePmfOverview } from "@/lib/stages/stage2/prePmfSyncGeneration";
import { normalizePrePmfReadableBody } from "@/lib/stages/stage2/prePmfReadable";

/** Deep Research 완료 후 JSON 정리·동기 폴백에 충분한 시간 */
export const maxDuration = 300;

interface RawOverview {
  problemStatement?: unknown;
  targetUsers?: unknown;
  stakeholders?: unknown;
  marketSize?: unknown;
  industryLandscape?: unknown;
  marketStats?: unknown;
  competitiveLandscape?: unknown;
  similarServices?: unknown;
  businessModel?: unknown;
  nextSteps?: unknown;
}

function str(v: unknown): string {
  return typeof v === "string" ? v.trim() : "";
}

function readableField(text: string): string {
  const t = text.trim();
  return t ? normalizePrePmfReadableBody(t) : "";
}

function toSourceRefs(sources: DeepResearchSource[], max = 5): PrePmfSourceRef[] {
  return sources
    .filter((s) => s.url.trim())
    .slice(0, max)
    .map((s) => ({ title: s.title || s.url, url: s.url }));
}

function parseSimilarServices(
  v: unknown,
  sources: PrePmfSourceRef[],
): SimilarServiceItem[] {
  if (!Array.isArray(v)) return [];
  const parsed: SimilarServiceItem[] = [];
  for (const raw of v) {
    if (!raw || typeof raw !== "object") continue;
    const o = raw as Record<string, unknown>;
    const name = str(o.name);
    if (!name) continue;
    const region = str(o.region) === "korea" ? "korea" : "global";
    parsed.push({
      name,
      region,
      note: readableField(str(o.note)),
      url: str(o.url) || undefined,
    });
    if (parsed.length >= PRE_PMF_MAX_SIMILAR_SERVICES) break;
  }
  return enrichSimilarServiceUrls(parsed, sources);
}

async function structureFromDeepResearch(
  problem: string,
  reportText: string,
  sources: PrePmfSourceRef[],
) {
  const result = await geminiChat({
    user: buildPrePmfStructurePrompt(problem, reportText),
    models: resolveGeminiTextModels(),
    temperature: 0.3,
    jsonMode: true,
  });

  const raw = JSON.parse(result.text) as RawOverview;
  const problemContext = problem.trim();
  const marketStatsRaw = normalizePrePmfStatCards(raw.marketStats, 6);

  return {
    problemStatement: readableField(str(raw.problemStatement)),
    targetUsers: normalizePrePmfPersonItems(raw.targetUsers),
    stakeholders: [],
    industryLandscape: {
      status: "done" as const,
      body: readableField(str(raw.industryLandscape)),
      sources,
    },
    marketSize: {
      status: "done" as const,
      body: readableField(str(raw.marketSize)),
      sources,
    },
    marketStats: sanitizePrePmfMarketStats(problemContext, marketStatsRaw),
    competitiveLandscape: {
      status: "done" as const,
      body: readableField(str(raw.competitiveLandscape)),
      sources,
    },
    similarServices: {
      status: "done" as const,
      items: parseSimilarServices(raw.similarServices, sources),
      sources,
    },
    businessModel: readableField(str(raw.businessModel)),
    nextSteps: normalizePrePmfNextActivities(raw.nextSteps),
    researchInteractionId: "",
    sourceProblem: problem.trim(),
    generatedAt: new Date().toISOString(),
    generationStatus: "done" as const,
  };
}

/** Deep Research 실패·정리 실패 시 grounded 동기 생성으로 폴백 */
async function syncFallbackOverview(problem: string, reason: string) {
  console.warn("[pre-pmf-research-status] falling back to sync generation:", reason);
  try {
    const overview = await runSyncPrePmfOverview(problem);
    return NextResponse.json({
      status: "completed",
      overview,
      source: "gemini_sync_fallback",
    });
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Sync fallback failed";
    console.error("[pre-pmf-research-status] sync fallback failed:", detail);
    return NextResponse.json({
      status: "failed",
      error: detail,
    });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 JSON입니다." }, { status: 400 });
  }

  const interactionId = str((body as { interactionId?: string }).interactionId);
  const problem =
    typeof (body as { problem?: string }).problem === "string"
      ? (body as { problem: string }).problem.trim().slice(0, 3000)
      : "";

  if (!interactionId) {
    return NextResponse.json(
      { error: "interactionId가 필요합니다." },
      { status: 400 },
    );
  }
  if (!resolveGeminiApiKey()) {
    return NextResponse.json({ error: "GEMINI_API_KEY 미설정" }, { status: 400 });
  }

  let poll;
  try {
    poll = await getDeepResearch(interactionId);
  } catch (e) {
    const detail = e instanceof Error ? e.message : "Deep Research 조회 실패";
    return syncFallbackOverview(problem, detail);
  }

  if (poll.status === "in_progress" || poll.status === "requires_action") {
    return NextResponse.json({ status: "in_progress" });
  }

  if (poll.status === "failed" || poll.status === "cancelled") {
    return syncFallbackOverview(
      problem,
      poll.error ?? `Deep Research ${poll.status}`,
    );
  }

  if (!poll.text) {
    return syncFallbackOverview(problem, "Deep Research 결과가 비어 있습니다.");
  }

  const sources = toSourceRefs(poll.sources);

  try {
    const overview = await structureFromDeepResearch(
      problem,
      poll.text,
      sources,
    );
    return NextResponse.json({
      status: "completed",
      overview,
      source: "deep_research",
    });
  } catch (e) {
    const detail =
      e instanceof Error ? e.message : "Deep Research 결과 정리에 실패했습니다.";
    return syncFallbackOverview(problem, detail);
  }
}
