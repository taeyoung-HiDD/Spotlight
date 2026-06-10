import { NextResponse } from "next/server";
import { resolveGroqApiKey, resolveGroqTextModels } from "@/lib/ai/env";
import { groqComplete } from "@/lib/ai/providers/groqText";
import { COACH_SYSTEM_INSTRUCTION } from "@/lib/coach/systemInstruction";
import { fetchProjectAccess } from "@/lib/projects/projectAccess";
import {
  heuristicLatentNeedsForSubject,
  type SubjectLatentInput,
} from "@/lib/stages/stage5/generateLatentNeedsHeuristic";

interface SubjectPayload {
  subjectId: string;
  name: string;
  quotes: string[];
  observations: string[];
}

function parseSubjects(raw: unknown): SubjectPayload[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s) => s && typeof s === "object")
    .map((s) => {
      const o = s as Record<string, unknown>;
      return {
        subjectId: String(o.subjectId ?? "").trim(),
        name: String(o.name ?? "").trim(),
        quotes: Array.isArray(o.quotes)
          ? o.quotes.filter((q): q is string => typeof q === "string")
          : [],
        observations: Array.isArray(o.observations)
          ? o.observations.filter((x): x is string => typeof x === "string")
          : [],
      };
    })
    .filter((s) => s.subjectId);
}

function buildPrompt(subjects: SubjectPayload[]): string {
  const blocks = subjects.map((s, idx) => {
    const label = s.name.trim() || `조사 대상 ${idx + 1}`;
    const quotes = s.quotes
      .filter((q) => q.trim())
      .map((q, i) => `  - 언급 ${i + 1}: ${q.trim()}`)
      .join("\n");
    const observations = s.observations
      .filter((o) => o.trim())
      .map((o, i) => `  - 관찰 ${i + 1}: ${o.trim()}`)
      .join("\n");
    return `[조사 대상 id=${s.subjectId} · ${label}]
${quotes || "  - (언급 없음)"}
${observations || "  - (관찰 없음)"}`;
  });

  return `${COACH_SYSTEM_INSTRUCTION}

---
[지시]
아래는 4단계 데이터 정리에서 모은 **언급한 것·관찰한 것**입니다.
각 조사 대상마다 **잠재 니즈** 2~4개를 도출하세요.

규칙:
- 말로 드러난 것 아래에 있을 수 있는 더 깊은 욕구·불편·기대를 추론합니다.
- 각 항목은 한 문장으로 씁니다. (가설) 같은 접두어는 쓰지 않습니다.
- 결론처럼 단정하지 않습니다.
- JSON만 출력합니다. 마크다운·설명 없음.

출력 형식:
{"needs":[{"subjectId":"...","items":["...","..."]}]}

조사 자료:
${blocks.join("\n\n")}`;
}

function parseNeedsJson(
  text: string,
): Array<{ subjectId: string; items: string[] }> | null {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      needs?: Array<{ subjectId?: string; items?: unknown }>;
    };
    if (!Array.isArray(parsed.needs)) return null;
    const needs = parsed.needs
      .map((n) => ({
        subjectId: String(n.subjectId ?? "").trim(),
        items: Array.isArray(n.items)
          ? n.items.filter((x): x is string => typeof x === "string")
          : [],
      }))
      .filter((n) => n.subjectId && n.items.length > 0);
    return needs.length > 0 ? needs : null;
  } catch {
    return null;
  }
}

function heuristicFallback(subjects: SubjectPayload[]) {
  return {
    needs: subjects.map((s) => ({
      subjectId: s.subjectId,
      items: heuristicLatentNeedsForSubject(s as SubjectLatentInput),
    })),
    source: "heuristic",
  };
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 JSON입니다." }, { status: 400 });
  }

  const projectId = String(
    (body as { projectId?: string }).projectId ?? "",
  ).trim();
  const subjects = parseSubjects((body as { subjects?: unknown }).subjects);

  if (!projectId || subjects.length === 0) {
    return NextResponse.json({ error: "필수 값이 없습니다." }, { status: 400 });
  }

  const access = await fetchProjectAccess(projectId);
  if (!access) {
    return NextResponse.json(
      { error: "프로젝트 접근 권한이 없습니다." },
      { status: 403 },
    );
  }

  if (!resolveGroqApiKey()) {
    return NextResponse.json(heuristicFallback(subjects));
  }

  try {
    const result = await groqComplete(buildPrompt(subjects), {
      models: resolveGroqTextModels(),
      temperature: 0.4,
      jsonMode: true,
    });

    const parsed = parseNeedsJson(result.text);
    if (!parsed?.length) {
      return NextResponse.json(heuristicFallback(subjects));
    }

    return NextResponse.json({
      needs: parsed,
      source: "groq",
      model: result.model,
    });
  } catch {
    return NextResponse.json(heuristicFallback(subjects));
  }
}
