import { STAGE_META } from "@/lib/stages/constants";

export interface CoachChatContext {
  projectId?: string;
  stageId?: number;
  stageTitle?: string;
  artifactSummary?: string;
  /** 입력 대기 예시 가이드 (API·Kevin 발화용) */
  inputGuideContext?: string;
  /** 단계별 코치 동작 규약 (예: 공감맵 페르소나 블록) */
  stageBehaviorNote?: string;
}

export interface CoachChatHistoryItem {
  role: "user" | "model";
  content: string;
}

export function stageChatTitle(stageId: number): string {
  const meta = STAGE_META[stageId];
  return meta ? `단계 ${stageId} · ${meta.title}` : `단계 ${stageId}`;
}

export async function sendCoachChat(params: {
  message: string;
  history?: CoachChatHistoryItem[];
  context?: CoachChatContext;
}): Promise<{ reply: string; model: string }> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });

  const data = (await res.json()) as { reply?: string; model?: string; error?: string };

  if (!res.ok) {
    throw new Error(data.error ?? "코치 응답을 받지 못했습니다.");
  }

  if (!data.reply) {
    throw new Error("코치 응답이 비어 있습니다.");
  }

  return { reply: data.reply, model: data.model ?? "unknown" };
}
