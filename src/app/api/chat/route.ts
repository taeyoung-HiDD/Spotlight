import { NextResponse } from "next/server";
import { formatGroqError } from "@/lib/ai/errors";
import { resolveGroqApiKey, resolveGroqTextModels } from "@/lib/ai/env";
import { groqChat } from "@/lib/ai/providers/groqText";
import type { GroqMessage } from "@/lib/ai/types";
import { buildOfflineCoachReply } from "@/lib/coach/offlineCoachReply";
import { sanitizeCoachKoreanText } from "@/lib/coach/sanitizeCoachKorean";
import { COACH_SYSTEM_INSTRUCTION } from "@/lib/coach/systemInstruction";

type ChatRole = "user" | "model";

interface ChatHistoryItem {
  role: ChatRole;
  content: string;
}

interface ChatRequestBody {
  message?: string;
  history?: ChatHistoryItem[];
  /** 단계·프로젝트 맥락 (선택) */
  context?: {
    projectId?: string;
    stageId?: number;
    stageTitle?: string;
    artifactSummary?: string;
    inputGuideContext?: string;
    stageBehaviorNote?: string;
    uiLocale?: "ko" | "en";
  };
}

function parseHistory(raw: unknown): ChatHistoryItem[] {
  if (!Array.isArray(raw)) return [];
  const items: ChatHistoryItem[] = [];
  for (const entry of raw) {
    if (
      entry &&
      typeof entry === "object" &&
      (entry as ChatHistoryItem).role &&
      typeof (entry as ChatHistoryItem).content === "string"
    ) {
      const role = (entry as ChatHistoryItem).role;
      const content = (entry as ChatHistoryItem).content.trim();
      if ((role === "user" || role === "model") && content) {
        items.push({ role, content });
      }
    }
  }
  return items.slice(-20);
}

function toGroqHistory(history: ChatHistoryItem[]): GroqMessage[] {
  return history.map((item) => ({
    role: item.role === "model" ? "assistant" : "user",
    content: item.content,
  }));
}

function buildContextPrefix(context: ChatRequestBody["context"]): string {
  if (!context) return "";
  const lines: string[] = ["[현재 작업 맥락]"];
  if (context.projectId) lines.push(`- projectId: ${context.projectId}`);
  if (context.stageId != null) lines.push(`- stageId: ${context.stageId}`);
  if (context.stageTitle) lines.push(`- 단계: ${context.stageTitle}`);
  if (context.artifactSummary) {
    lines.push(`- 산출물 요약:\n${context.artifactSummary}`);
  }
  if (context.inputGuideContext) {
    lines.push(context.inputGuideContext);
  }
  if (context.stageBehaviorNote?.trim()) {
    lines.push(context.stageBehaviorNote.trim());
  }
  if (context.uiLocale === "en") {
    lines.push(
      "- Response language: English. Reply entirely in clear, natural English. Keep Korean only for unavoidable proper nouns.",
    );
  }
  return lines.length > 1 ? `${lines.join("\n")}\n\n` : "";
}

export async function POST(request: Request) {
  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ error: "잘못된 JSON 요청입니다." }, { status: 400 });
  }

  const message = body.message?.trim();
  if (!message) {
    return NextResponse.json(
      { error: "message 필드가 필요합니다." },
      { status: 400 },
    );
  }

  if (!resolveGroqApiKey()) {
    const offline = buildOfflineCoachReply(message, body.context);
    const preferEnglish = body.context?.uiLocale === "en";
    return NextResponse.json({
      reply: preferEnglish
        ? "I'm offline right now (no API key). Keep going on the left panel—I'll help again once the connection is back."
        : sanitizeCoachKoreanText(offline),
      model: "offline",
      source: "offline",
    });
  }

  const history = parseHistory(body.history);
  const userTurn = `${buildContextPrefix(body.context)}${message}`;

  const preferEnglish = body.context?.uiLocale === "en";
  const system = preferEnglish
    ? `${COACH_SYSTEM_INSTRUCTION}

---
[Language override]
The user interface is in English. Respond entirely in English (natural, concise). Do not default to Korean.`
    : COACH_SYSTEM_INSTRUCTION;

  try {
    const result = await groqChat({
      system,
      messages: toGroqHistory(history),
      user: userTurn,
      models: resolveGroqTextModels(),
      temperature: 0.4,
    });

    return NextResponse.json({
      reply: preferEnglish
        ? result.text.trim()
        : sanitizeCoachKoreanText(result.text),
      model: result.model,
      source: "groq",
    });
  } catch (error) {
    console.error("[api/chat] Groq error:", error);
    return NextResponse.json(
      { error: formatGroqError(error) },
      { status: 502 },
    );
  }
}
