import { NextResponse } from "next/server";
import {
  isGeminiDeepResearchEnabled,
  resolveGeminiApiKey,
  resolveGeminiDeepResearchAgent,
} from "@/lib/ai/env";
import { startDeepResearch } from "@/lib/ai/providers/geminiDeepResearch";
import { buildPrePmfDeepResearchPrompt } from "@/lib/stages/stage2/prePmfDeepResearch";
import {
  buildPrePmfHeuristicFallback,
  runSyncPrePmfOverview,
} from "@/lib/stages/stage2/prePmfSyncGeneration";

/** 사전 조사는 웹검색 6회 + JSON 생성으로 수 분 걸릴 수 있음 */
export const maxDuration = 300;

function aiGenerationFailed(source: string, detail?: string) {
  return NextResponse.json(
    {
      error:
        detail?.trim() ||
        "AI 사전 조사 생성에 실패했습니다. 잠시 후 「다시 시도」를 눌러 주세요.",
      source,
    },
    { status: 502 },
  );
}

/** 동기 grounded 생성 (Deep Research 비활성·실패 시 폴백) */
async function runSyncGeneration(problem: string) {
  try {
    const overview = await runSyncPrePmfOverview(problem);
    return NextResponse.json({
      overview,
      source: "gemini",
      webSearch: true,
    });
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "Gemini generation failed";
    console.error("[pre-pmf-overview] sync generation failed:", detail);
    return aiGenerationFailed("gemini_fallback", detail);
  }
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
      ? (body as { problem: string }).problem.trim().slice(0, 3000)
      : "";
  const forceSync = (body as { forceSync?: boolean }).forceSync === true;

  if (!resolveGeminiApiKey()) {
    return NextResponse.json({
      overview: buildPrePmfHeuristicFallback(problem),
      source: "heuristic",
      error: "GEMINI_API_KEY가 서버에 설정되지 않았습니다.",
    });
  }

  // 로컬·배포 동일 — grounded 동기 생성 (기본). Deep Research는 명시적으로 켠 경우만.
  if (!forceSync && isGeminiDeepResearchEnabled()) {
    try {
      const { interactionId, status } = await startDeepResearch(
        buildPrePmfDeepResearchPrompt(problem),
        { webOnly: true },
      );
      return NextResponse.json({
        mode: "deep_research",
        interactionId,
        status,
        agent: resolveGeminiDeepResearchAgent(),
      });
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : "Deep Research start failed";
      console.error("[pre-pmf-overview] Deep Research start failed:", detail);
      // 유료 티어 미사용·프리뷰 미가용 등 → 동기 grounded 생성으로 폴백
    }
  }

  return runSyncGeneration(problem);
}
