import { needToHmwDraft } from "@/lib/stages/stage7/hmwText";
import type { HmwQuestion, Stage7HmwData } from "@/lib/stages/stage7/hmwTypes";

export interface GenerateHmwItemInput {
  questionId: string;
  latentNeedText: string;
}

export interface GenerateHmwResponse {
  items: Array<{ questionId: string; hmwText: string }>;
  source?: string;
}

export async function requestHmwGeneration(
  projectId: string,
  items: GenerateHmwItemInput[],
): Promise<GenerateHmwResponse> {
  const res = await fetch("/api/stage7/generate-hmw", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, items }),
  });

  const json = (await res.json()) as GenerateHmwResponse & { error?: string };

  if (!res.ok) {
    throw new Error(json.error ?? "HMW 질문 생성에 실패했습니다.");
  }

  return json;
}

export function applyHeuristicHmwDrafts(data: Stage7HmwData): Stage7HmwData {
  return {
    ...data,
    questions: data.questions.map((q) =>
      q.hmwText.trim()
        ? q
        : {
            ...q,
            hmwText: needToHmwDraft(q.latentNeedText),
            kevinGenerated: false,
          },
    ),
  };
}

export function applyGeneratedHmw(
  data: Stage7HmwData,
  items: Array<{ questionId: string; hmwText: string }>,
): Stage7HmwData {
  const byId = new Map(items.map((item) => [item.questionId, item.hmwText.trim()]));
  return {
    ...data,
    kevinGeneratedAt: new Date().toISOString(),
    questions: data.questions.map((q) => {
      const generated = byId.get(q.id);
      if (!generated) return q;
      return { ...q, hmwText: generated, kevinGenerated: true };
    }),
  };
}

export function buildHmwGenerationInputs(
  data: Stage7HmwData,
): GenerateHmwItemInput[] {
  return data.questions
    .filter((q) => q.latentNeedText.trim() && !q.hmwText.trim())
    .map((q) => ({
      questionId: q.id,
      latentNeedText: q.latentNeedText,
    }));
}
