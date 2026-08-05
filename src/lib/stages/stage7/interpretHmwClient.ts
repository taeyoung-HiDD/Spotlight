import type { HmwInterpretation } from "@/lib/stages/stage7/hmwTypes";

export async function requestHmwInterpretations(params: {
  projectId: string;
  hmwText: string;
  latentNeedText?: string;
  subjectName?: string;
  evidenceLines?: string[];
  rationaleLines?: string[];
}): Promise<{ interpretations: HmwInterpretation[]; source?: string }> {
  const res = await fetch("/api/stage7/interpret-hmw", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const json = (await res.json()) as {
    interpretations?: HmwInterpretation[];
    source?: string;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(json.error ?? "HMW 해석을 만들지 못했습니다.");
  }
  if (!Array.isArray(json.interpretations) || json.interpretations.length === 0) {
    throw new Error("해석 결과가 비어 있습니다.");
  }
  return {
    interpretations: json.interpretations,
    source: json.source,
  };
}
