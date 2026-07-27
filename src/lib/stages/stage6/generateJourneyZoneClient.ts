import type {
  JourneyZoneAutoFillResult,
  JourneyZoneAutoFillStep,
} from "@/lib/stages/stage6/autoFillJourneyZones";
import { JOURNEY_AI_ZONES } from "@/lib/stages/stage6/journeyStepZones";

export interface AutoFillJourneyZonesInput {
  projectId: string;
  subjectName: string;
  expectations: string;
  steps: JourneyZoneAutoFillStep[];
}

/** 페르소나 한 명의 여정 단계별 터치포인트·Pain point를 한 번에 생성 */
export async function requestJourneyZonesAutoFill(
  input: AutoFillJourneyZonesInput,
): Promise<JourneyZoneAutoFillResult[]> {
  const res = await fetch("/api/stage6/generate-journey-zones", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const json = (await res.json()) as {
    steps?: Array<{
      stepId?: string;
      touchpoint?: string[];
      pain_point?: string[];
    }>;
    error?: string;
  };

  if (!res.ok) {
    throw new Error(json.error ?? "AI 분석에 실패했습니다.");
  }

  const results: JourneyZoneAutoFillResult[] = [];
  for (const step of json.steps ?? []) {
    const stepId = typeof step.stepId === "string" ? step.stepId : "";
    if (!stepId) continue;
    for (const zone of JOURNEY_AI_ZONES) {
      const entries = step[zone];
      if (!Array.isArray(entries) || entries.length === 0) continue;
      results.push({
        stepId,
        zone,
        entries: entries.filter(
          (entry): entry is string => typeof entry === "string",
        ),
      });
    }
  }
  return results;
}
