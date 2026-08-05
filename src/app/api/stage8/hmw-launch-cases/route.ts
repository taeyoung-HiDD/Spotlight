import { NextResponse } from "next/server";
import { resolveGroqApiKey, resolveGroqTextModels } from "@/lib/ai/env";
import { groqComplete } from "@/lib/ai/providers/groqText";
import {
  webSearchMany,
  type WebSearchResult,
} from "@/lib/ai/providers/webSearch";
import { KOREAN_PRIMARY_OUTPUT_RULE } from "@/lib/coach/outputLanguage";
import { sanitizeCoachKoreanText } from "@/lib/coach/sanitizeCoachKorean";
import { COACH_SYSTEM_INSTRUCTION } from "@/lib/coach/systemInstruction";
import { fetchProjectAccess } from "@/lib/projects/projectAccess";
import {
  buildHmwLaunchSearchQueries,
  heuristicHmwLaunchCases,
  isHmwLinkRepeatingQuestion,
  type HmwLaunchCase,
  type HmwLaunchCaseRegion,
} from "@/lib/stages/stage8/hmwLaunchCases";

function formatSearchBlob(results: WebSearchResult[]): string {
  if (results.length === 0) return "(검색 결과 없음)";
  return results
    .slice(0, 8)
    .map((r, i) => {
      const url = r.url.trim() ? `\nURL: ${r.url.trim()}` : "";
      return `[${i + 1}] ${r.title.trim() || "제목 없음"}${url}\n${r.content.trim().slice(0, 400)}`;
    })
    .join("\n\n");
}

function buildNormalizePrompt(
  hmwText: string,
  latentNeedText: string,
  searchBlob: string,
): string {
  return `${COACH_SYSTEM_INSTRUCTION}

---
[지시]
아래 HMW 질문에 **비슷하게 답을 내며 이미 출시된** 서비스·제품 사례를 2~3개 골라 JSON으로 정리하세요.
웹 검색 요약을 우선 근거로 쓰고, 없으면 널리 알려진 출시 사례만 가설 톤으로 적으세요.

${KOREAN_PRIMARY_OUTPUT_RULE}

규칙:
- 사용자 아이디어 제목·설명을 대신 쓰지 마세요. 사례는 영감·참고용입니다.
- 솔루션을 단정하지 마세요. 「(가설)」·「가설」 문구는 쓰지 마세요.
- hmwLink: 이 사례가 위 HMW에 **어떻게 맞닿는지** 짧은 해석 한 문장. HMW 문장·「」인용·질문을 그대로 반복하지 마세요. (예: "알림으로 놓침을 줄이는 방식이 이 질문의 ‘쉽게’ 축과 닿아요.")
- hint는 설명란에 붙일 **짧은 변형 힌트** 한 문장. 경쟁 서비스 이름·복붙 금지.
- region은 "korea" 또는 "global".
- url은 검색에 나온 공식·신뢰 가능한 링크만. 없으면 "".
- JSON만 출력.

HMW:
${hmwText}

잠재 니즈(참고):
${latentNeedText.trim() || "(없음)"}

웹 검색 요약:
${searchBlob}

출력 형식:
{"cases":[{"name":"...","summary":"...","hmwLink":"...","url":"...","region":"korea","hint":"..."}]}`;
}

function normalizeCases(raw: unknown, hmwText: string): HmwLaunchCase[] {
  if (!raw || typeof raw !== "object") return [];
  const list = (raw as { cases?: unknown }).cases;
  if (!Array.isArray(list)) return [];

  const fallbackLink =
    "이 사례의 접근 방식이 질문의 축과 맞닿을 수 있어요.";
  const stripHypothesisLabel = (text: string) =>
    text
      .replace(/\s*[（(]\s*가설\s*[）)]\s*/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  const out: HmwLaunchCase[] = [];
  for (const item of list) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const name = sanitizeCoachKoreanText(String(o.name ?? "")).trim().slice(0, 80);
    const summary = stripHypothesisLabel(
      sanitizeCoachKoreanText(String(o.summary ?? ""))
        .trim()
        .slice(0, 280),
    );
    let hmwLink = stripHypothesisLabel(
      sanitizeCoachKoreanText(String(o.hmwLink ?? ""))
        .trim()
        .slice(0, 200),
    );
    if (!hmwLink || isHmwLinkRepeatingQuestion(hmwLink, hmwText)) {
      hmwLink = fallbackLink;
    }
    const hint = sanitizeCoachKoreanText(String(o.hint ?? ""))
      .trim()
      .slice(0, 160);
    const urlRaw = String(o.url ?? "").trim();
    const url = /^https?:\/\//i.test(urlRaw) ? urlRaw.slice(0, 500) : "";
    const regionRaw = String(o.region ?? "").trim().toLowerCase();
    const region: HmwLaunchCaseRegion =
      regionRaw === "global" ? "global" : "korea";
    if (!name || !summary) continue;
    out.push({
      name,
      summary,
      hmwLink,
      url,
      region,
      hint:
        hint ||
        "이 사례의 ‘방식’만 빌려, 우리 사용자에게 맞게 바꾸는 한 줄을 적어 보세요.",
    });
    if (out.length >= 3) break;
  }
  return out;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 JSON입니다." }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const projectId = String(record.projectId ?? "").trim();
  const hmwText = String(record.hmwText ?? "").trim().slice(0, 500);
  const latentNeedText = String(record.latentNeedText ?? "")
    .trim()
    .slice(0, 400);

  if (!projectId || !hmwText) {
    return NextResponse.json({ error: "필수 값이 없습니다." }, { status: 400 });
  }

  const access = await fetchProjectAccess(projectId);
  if (!access) {
    return NextResponse.json(
      { error: "프로젝트 접근 권한이 없습니다." },
      { status: 403 },
    );
  }

  const fallback = () => ({
    cases: heuristicHmwLaunchCases(hmwText, latentNeedText),
    source: "heuristic_fallback" as const,
  });

  const queries = buildHmwLaunchSearchQueries(hmwText, latentNeedText);
  let searchResults: WebSearchResult[] = [];
  try {
    searchResults = await webSearchMany(queries);
  } catch (error) {
    console.error("[hmw-launch-cases] webSearch", error);
  }

  if (!resolveGroqApiKey()) {
    return NextResponse.json(fallback());
  }

  try {
    const result = await groqComplete(
      buildNormalizePrompt(
        hmwText,
        latentNeedText,
        formatSearchBlob(searchResults),
      ),
      {
        models: resolveGroqTextModels(),
        temperature: 0.4,
        jsonMode: true,
      },
    );
    const jsonMatch = result.text.trim().match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as unknown;
      const cases = normalizeCases(parsed, hmwText);
      if (cases.length > 0) {
        return NextResponse.json({ cases, source: "groq+web" as const });
      }
    }
  } catch (error) {
    console.error("[hmw-launch-cases]", error);
  }

  return NextResponse.json(fallback());
}
