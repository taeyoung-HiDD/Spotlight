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

export async function requestComposeHmwSubQuestion(params: {
  projectId: string;
  hmwText: string;
  selections: Array<{ slot: string; slotLabel: string; text: string }>;
  fallbackDraft?: string;
}): Promise<{ subQuestion: string; source?: string }> {
  const res = await fetch("/api/stage7/compose-hmw-subquestion", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
  const json = (await res.json()) as {
    subQuestion?: string;
    source?: string;
    error?: string;
  };
  if (!res.ok) {
    throw new Error(json.error ?? "하위 질문을 만들지 못했습니다.");
  }
  if (!json.subQuestion?.trim()) {
    throw new Error("하위 질문이 비어 있습니다.");
  }
  return {
    subQuestion: json.subQuestion.trim(),
    source: json.source,
  };
}
