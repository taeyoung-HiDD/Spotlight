import type { CoachChatHistoryItem } from "@/lib/coach/chatClient";
import {
  normalizePrePmfOverview,
  type PrePmfOverviewData,
} from "@/lib/stages/stage2/prePmfOverview";

export interface PrePmfFollowupResult {
  coachReply: string;
  researched: boolean;
  overviewUpdated: boolean;
  overview?: PrePmfOverviewData;
}

export async function runPrePmfFollowupResearch(input: {
  problem: string;
  overview: PrePmfOverviewData;
  userRequest: string;
  conversationHistory?: CoachChatHistoryItem[];
}): Promise<PrePmfFollowupResult> {
  const res = await fetch("/api/stage2/pre-pmf-followup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      problem: input.problem,
      overview: input.overview,
      userRequest: input.userRequest,
      conversationHistory: input.conversationHistory ?? [],
    }),
  });

  const data = (await res.json()) as {
    coachReply?: string;
    researched?: boolean;
    overviewUpdated?: boolean;
    overview?: unknown;
    error?: string;
  };

  if (!res.ok) {
    throw new Error(data.error ?? "추가 조사에 실패했습니다.");
  }

  return {
    coachReply:
      typeof data.coachReply === "string" && data.coachReply.trim()
        ? data.coachReply.trim()
        : "조사를 마쳤어요. 내용을 확인해 주세요.",
    researched: Boolean(data.researched),
    overviewUpdated: Boolean(data.overviewUpdated),
    overview: data.overview
      ? normalizePrePmfOverview(data.overview)
      : undefined,
  };
}
