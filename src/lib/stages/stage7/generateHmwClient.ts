import {
  buildHeuristicCandidates,
  evaluateHmwQualityRules,
  pickBestHmwCandidate,
} from "@/lib/stages/stage7/hmwQualityChecklist";
import { needToHmwDraft } from "@/lib/stages/stage7/hmwText";
import type {
  HmwQualityTip,
  HmwVariationCandidate,
  HmwVariationKind,
  Stage7HmwData,
} from "@/lib/stages/stage7/hmwTypes";

export interface GenerateHmwItemInput {
  questionId: string;
  latentNeedText: string;
}

export interface GenerateHmwItemResult {
  questionId: string;
  hmwText: string;
  variationKind?: HmwVariationKind;
  qualityTips?: HmwQualityTip[];
  candidates?: HmwVariationCandidate[];
}

export interface GenerateHmwResponse {
  items: GenerateHmwItemResult[];
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
    questions: data.questions.map((q) => {
      if (q.hmwText.trim()) return q;
      const draft = needToHmwDraft(q.latentNeedText);
      const candidates = buildHeuristicCandidates(q.latentNeedText, draft);
      const best = pickBestHmwCandidate(candidates);
      return {
        ...q,
        hmwText: best?.text ?? draft,
        variationKind: best?.kind,
        qualityTips: best?.tips ?? evaluateHmwQualityRules(draft, q.latentNeedText),
        candidates,
        kevinGenerated: false,
      };
    }),
  };
}

export function applyGeneratedHmw(
  data: Stage7HmwData,
  items: GenerateHmwItemResult[],
): Stage7HmwData {
  const byId = new Map(items.map((item) => [item.questionId, item]));
  return {
    ...data,
    kevinGeneratedAt: new Date().toISOString(),
    questions: data.questions.map((q) => {
      const generated = byId.get(q.id);
      if (!generated?.hmwText.trim()) return q;
      return {
        ...q,
        hmwText: generated.hmwText.trim(),
        kevinGenerated: true,
        variationKind: generated.variationKind,
        qualityTips: generated.qualityTips,
        candidates: generated.candidates,
      };
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
