import {
  resolveGeminiApiKey,
  resolveGeminiTextModels,
} from "@/lib/ai/env";
import { geminiGroundedChat } from "@/lib/ai/providers/geminiText";

export interface WebSearchResult {
  title: string;
  url: string;
  content: string;
}

function buildSearchPrompt(query: string): string {
  return `다음 주제에 대해 Google 검색을 활용해 최신 정보를 조사하고 핵심만 요약하세요.

주제: ${query}

규칙:
- 한국·글로벌 맥락을 함께 고려하세요.
- 시장 수치·서비스명·경쟁사 등 검증 가능한 사실 위주로 3~6개 불릿(~습니다 체)로 답하세요.
- 추측은 「(가설)」로 표시하세요.`;
}

function toWebResults(
  query: string,
  text: string,
  sources: Array<{ title: string; url: string }>,
): WebSearchResult[] {
  const summary = text.trim();
  if (!sources.length) {
    return summary ? [{ title: query, url: "", content: summary }] : [];
  }
  return sources.map((s) => ({
    title: s.title,
    url: s.url,
    content: summary.slice(0, 500),
  }));
}

/** Gemini Google Search grounding 1회. 키 미설정·오류 시 빈 배열. */
export async function webSearch(
  query: string,
  options?: { signal?: AbortSignal },
): Promise<WebSearchResult[]> {
  if (!resolveGeminiApiKey()) return [];
  const q = query.trim();
  if (!q) return [];

  try {
    const result = await geminiGroundedChat({
      user: buildSearchPrompt(q),
      models: resolveGeminiTextModels(),
      temperature: 0.35,
    });
    if (options?.signal?.aborted) return [];
    return toWebResults(q, result.text, result.sources);
  } catch {
    return [];
  }
}

/** 여러 쿼리를 병렬 검색하고 URL 기준 중복 제거 */
export async function webSearchMany(
  queries: string[],
  options?: { signal?: AbortSignal },
): Promise<WebSearchResult[]> {
  if (!resolveGeminiApiKey()) return [];
  const batches = await Promise.all(
    queries.map((q) => webSearch(q, { signal: options?.signal })),
  );
  const seen = new Set<string>();
  const merged: WebSearchResult[] = [];
  for (const batch of batches) {
    for (const r of batch) {
      const key = r.url || `${r.title}:${r.content.slice(0, 80)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(r);
    }
  }
  return merged;
}

export function isWebSearchEnabled(): boolean {
  return Boolean(resolveGeminiApiKey());
}
