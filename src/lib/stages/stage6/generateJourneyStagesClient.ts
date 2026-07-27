import type { JourneyMapItem } from "@/lib/stages/stage6/userJourneyTypes";

export interface GenerateJourneyStagesPersonaInput {
  subjectId: string;
  name: string;
  context: string;
  items: Array<Pick<JourneyMapItem, "kind" | "text">>;
}

export interface GenerateJourneyStagesInput {
  projectId: string;
  problem: string;
  prePmfSummary: string;
  personas: GenerateJourneyStagesPersonaInput[];
}

export interface GeneratedJourneyStages {
  subjectId: string;
  stages: string[];
}

export async function requestJourneyStageGeneration(
  input: GenerateJourneyStagesInput,
): Promise<GeneratedJourneyStages[]> {
  const res = await fetch("/api/stage6/generate-journey-stages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const json = (await res.json()) as {
    personas?: GeneratedJourneyStages[];
    error?: string;
  };

  if (!res.ok) {
    throw new Error(json.error ?? "여정 단계 생성에 실패했습니다.");
  }

  return Array.isArray(json.personas) ? json.personas : [];
}
