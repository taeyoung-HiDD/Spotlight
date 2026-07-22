import {
  normalizeStage3ResearchPrep,
  type Stage3ResearchPrep,
} from "@/lib/stages/fieldResearch/stage3ResearchPrep";

export async function generateStage3ResearchPrep(input: {
  problem: string;
  prePmfSummary?: string;
  targetLabels: string[];
}): Promise<Stage3ResearchPrep> {
  const res = await fetch("/api/stage3/research-prep-recommendations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = (await res.json()) as {
    researchPrep?: unknown;
    source?: string;
    error?: string;
  };

  if (!res.ok) {
    if (data.researchPrep) {
      return normalizeStage3ResearchPrep(data.researchPrep);
    }
    throw new Error(data.error ?? "조사 준비 추천 생성에 실패했습니다.");
  }

  if (!data.researchPrep) {
    throw new Error(data.error ?? "조사 준비 추천을 받지 못했습니다.");
  }

  return normalizeStage3ResearchPrep(data.researchPrep);
}
