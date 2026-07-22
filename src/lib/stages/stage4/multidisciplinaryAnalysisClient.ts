import {
  normalizeMultidisciplinaryAnalysis,
  type MultidisciplinaryAnalysisData,
} from "@/lib/stages/stage4/multidisciplinaryAnalysis";
import type { ResearchSynthesisData } from "@/lib/stages/stage4/researchSynthesisTypes";

export async function requestMultidisciplinaryAnalysis({
  projectId,
  synthesis,
}: {
  projectId: string;
  synthesis: ResearchSynthesisData;
}): Promise<MultidisciplinaryAnalysisData> {
  const res = await fetch("/api/stage4/multidisciplinary-analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, synthesis }),
  });

  const json = (await res.json().catch(() => null)) as {
    analysis?: unknown;
    error?: string;
  } | null;

  if (!res.ok) {
    throw new Error(json?.error ?? "다학제적 분석 요청에 실패했습니다.");
  }

  const analysis = normalizeMultidisciplinaryAnalysis(json?.analysis);
  if (!analysis.bySubject.length) {
    throw new Error("다학제적 분석 결과가 비어 있습니다.");
  }
  return analysis;
}
