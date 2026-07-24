export type KanoSignal = "must_be" | "attractive" | "unknown";

export type CoreNeedReview = {
  needId: string;
  counterQuestion: string;
  riskNote: string;
  /** Kano 관점 신호 — 판정이 아니라 질문 강조용 */
  kanoSignal?: KanoSignal;
  mustBeSuspicion?: boolean;
};

export type ReviewCoreNeedsResponse = {
  reviews: CoreNeedReview[];
  source?: string;
};

export async function requestCoreNeedsReview(
  projectId: string,
  coreNeeds: Array<{ id: string; text: string }>,
  parkedNeeds: Array<{ id: string; text: string }>,
): Promise<ReviewCoreNeedsResponse> {
  const res = await fetch("/api/stage5/review-core-needs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, coreNeeds, parkedNeeds }),
  });

  const json = (await res.json()) as ReviewCoreNeedsResponse & {
    error?: string;
  };

  if (!res.ok) {
    throw new Error(json.error ?? "Kevin 관점 요청에 실패했습니다.");
  }

  return json;
}
