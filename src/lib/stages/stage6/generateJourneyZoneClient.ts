import type { JourneyAiZone, JourneyMapItem } from "@/lib/stages/stage6/userJourneyTypes";

export interface GenerateJourneyZoneInput {
  projectId: string;
  subjectName: string;
  stepLabel: string;
  expectations: string;
  zone: JourneyAiZone;
  items: Array<Pick<JourneyMapItem, "kind" | "text">>;
}

export interface GenerateJourneyZoneResponse {
  text: string;
  source?: string;
}

export async function requestJourneyZoneGeneration(
  input: GenerateJourneyZoneInput,
): Promise<GenerateJourneyZoneResponse> {
  const res = await fetch("/api/stage6/generate-journey-zone", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const json = (await res.json()) as GenerateJourneyZoneResponse & {
    error?: string;
  };

  if (!res.ok) {
    throw new Error(json.error ?? "AI 작성에 실패했습니다.");
  }

  return json;
}
