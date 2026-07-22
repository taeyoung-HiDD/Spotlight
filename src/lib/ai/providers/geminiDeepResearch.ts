import {
  resolveGeminiApiKey,
  resolveGeminiDeepResearchAgent,
} from "@/lib/ai/env";

/**
 * Gemini Deep Research Agent (Interactions API)
 * 자율적으로 계획→검색→읽기→종합하는 멀티스텝 리서치. generateContent가 아니라
 * /v1beta/interactions 로 호출하며 background=true 비동기 실행 후 폴링한다.
 * 참고: ai.google.dev/gemini-api/docs/deep-research
 */

const INTERACTIONS_URL =
  "https://generativelanguage.googleapis.com/v1beta/interactions";

export type DeepResearchStatus =
  | "in_progress"
  | "completed"
  | "failed"
  | "incomplete"
  | "requires_action"
  | "cancelled";

export interface DeepResearchSource {
  title: string;
  url: string;
}

export interface DeepResearchPoll {
  status: DeepResearchStatus;
  /** 최종 리포트 본문 (완료 시) */
  text: string;
  sources: DeepResearchSource[];
  error?: string;
}

interface RawAnnotation {
  type?: string;
  url?: string;
  title?: string;
}

interface RawContent {
  type?: string;
  text?: string;
  annotations?: RawAnnotation[];
}

interface RawStep {
  type?: string;
  content?: RawContent[];
}

interface RawInteraction {
  id?: string;
  status?: DeepResearchStatus;
  steps?: RawStep[];
  error?: { message?: string } | string;
}

function authHeaders(apiKey: string): Record<string, string> {
  return { "x-goog-api-key": apiKey };
}

/** model_output 텍스트(마지막 비어있지 않은 블록) + url 인용을 추출 */
function extractReport(json: RawInteraction): {
  text: string;
  sources: DeepResearchSource[];
} {
  const steps = Array.isArray(json.steps) ? json.steps : [];
  let text = "";
  const sources: DeepResearchSource[] = [];
  const seen = new Set<string>();

  for (const step of steps) {
    if (step?.type !== "model_output") continue;
    for (const content of step.content ?? []) {
      if (content?.type !== "text" || typeof content.text !== "string") continue;
      if (content.text.trim()) text = content.text;
      for (const ann of content.annotations ?? []) {
        if (ann?.type !== "url_citation") continue;
        const url = ann.url?.trim();
        if (!url || seen.has(url)) continue;
        seen.add(url);
        sources.push({ title: ann.title?.trim() || url, url });
      }
    }
  }

  return { text: text.trim(), sources };
}

function errorMessage(err: RawInteraction["error"]): string | undefined {
  if (!err) return undefined;
  if (typeof err === "string") return err;
  return err.message;
}

export interface StartDeepResearchOptions {
  /** 기본 google_search + url_context */
  webOnly?: boolean;
}

/** Deep Research 작업 시작 → interactionId 반환 (background=true) */
export async function startDeepResearch(
  input: string,
  options?: StartDeepResearchOptions,
): Promise<{ interactionId: string; status: DeepResearchStatus }> {
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) throw new Error("GEMINI_API_KEY missing");

  const res = await fetch(INTERACTIONS_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(apiKey) },
    body: JSON.stringify({
      input,
      agent: resolveGeminiDeepResearchAgent(),
      background: true,
      store: true,
      agent_config: {
        type: "deep-research",
        thinking_summaries: "auto",
        visualization: "off",
      },
      ...(options?.webOnly
        ? { tools: [{ type: "google_search" }, { type: "url_context" }] }
        : {}),
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(detail || `Deep Research HTTP ${res.status}`);
  }

  const json = (await res.json()) as RawInteraction;
  if (!json.id) throw new Error("Deep Research interaction id missing");
  return { interactionId: json.id, status: json.status ?? "in_progress" };
}

/** Deep Research 작업 상태 폴링 */
export async function getDeepResearch(
  interactionId: string,
): Promise<DeepResearchPoll> {
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) throw new Error("GEMINI_API_KEY missing");

  const res = await fetch(
    `${INTERACTIONS_URL}/${encodeURIComponent(interactionId)}`,
    { method: "GET", headers: authHeaders(apiKey) },
  );

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(detail || `Deep Research HTTP ${res.status}`);
  }

  const json = (await res.json()) as RawInteraction;
  const { text, sources } = extractReport(json);
  return {
    status: json.status ?? "in_progress",
    text,
    sources,
    error: errorMessage(json.error),
  };
}

export function isDeepResearchTerminal(status: DeepResearchStatus): boolean {
  return (
    status === "completed" ||
    status === "failed" ||
    status === "cancelled" ||
    status === "incomplete"
  );
}
