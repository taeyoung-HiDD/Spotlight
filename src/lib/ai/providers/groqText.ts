import { resolveGroqApiKey, resolveGroqTextModels } from "@/lib/ai/env";
import type { GroqChatOptions, GroqChatResult, GroqMessage } from "@/lib/ai/types";

function buildMessages(options: GroqChatOptions): GroqMessage[] {
  const messages: GroqMessage[] = [];
  if (options.system?.trim()) {
    messages.push({ role: "system", content: options.system.trim() });
  }
  if (options.messages?.length) {
    messages.push(...options.messages);
  }
  if (options.user?.trim()) {
    messages.push({ role: "user", content: options.user.trim() });
  }
  return messages;
}

async function groqChatOnce(
  apiKey: string,
  model: string,
  messages: GroqMessage[],
  temperature: number,
  jsonMode: boolean,
): Promise<string> {
  const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      ...(jsonMode ? { response_format: { type: "json_object" } } : {}),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(detail || `Groq HTTP ${res.status}`);
  }

  const json = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = json.choices?.[0]?.message?.content?.trim() ?? "";
  if (!text) throw new Error("empty Groq response");
  return text;
}

export async function groqChat(
  options: GroqChatOptions,
): Promise<GroqChatResult> {
  const apiKey = resolveGroqApiKey();
  if (!apiKey) throw new Error("GROQ_API_KEY missing");

  const messages = buildMessages(options);
  if (messages.length === 0) {
    throw new Error("Groq messages required");
  }

  const models =
    options.models ??
    (options.model ? [options.model] : resolveGroqTextModels());
  const temperature = options.temperature ?? 0.4;
  const jsonMode = options.jsonMode ?? false;

  let lastError: unknown;
  for (const model of models) {
    try {
      const text = await groqChatOnce(
        apiKey,
        model,
        messages,
        temperature,
        jsonMode,
      );
      return { text, model };
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError ?? new Error("Groq generation failed");
}

/** 단일 프롬프트 완성 (system 없이 user만) */
export async function groqComplete(
  prompt: string,
  options?: Omit<GroqChatOptions, "user" | "messages">,
): Promise<GroqChatResult> {
  return groqChat({ ...options, user: prompt });
}
