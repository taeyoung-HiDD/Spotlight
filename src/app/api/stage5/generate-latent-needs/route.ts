import { NextResponse } from "next/server";
import { resolveGroqApiKey, resolveGroqTextModels } from "@/lib/ai/env";
import { groqComplete } from "@/lib/ai/providers/groqText";
import { COACH_SYSTEM_INSTRUCTION } from "@/lib/coach/systemInstruction";
import { fetchProjectAccess } from "@/lib/projects/projectAccess";
import {
  heuristicLatentNeedForSource,
  type SourceLatentInput,
} from "@/lib/stages/stage5/generateLatentNeedsHeuristic";

interface SourcePayload {
  sourceId: string;
  subjectId: string;
  subjectName: string;
  kind: "quote" | "observation" | "finding";
  text: string;
}

const KIND_SET = new Set(["quote", "observation", "finding"]);

function parseSources(raw: unknown): SourcePayload[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((s) => s && typeof s === "object")
    .map((s) => {
      const o = s as Record<string, unknown>;
      const kindRaw = String(o.kind ?? "").trim();
      const kind = KIND_SET.has(kindRaw)
        ? (kindRaw as SourcePayload["kind"])
        : "observation";
      return {
        sourceId: String(o.sourceId ?? "").trim(),
        subjectId: String(o.subjectId ?? "").trim(),
        subjectName: String(o.subjectName ?? "").trim(),
        kind,
        text: String(o.text ?? "").trim(),
      };
    })
    .filter((s) => s.sourceId && s.subjectId && s.text);
}

function buildPrompt(sources: SourcePayload[]): string {
  const blocks = sources.map((s, idx) => {
    const label = s.subjectName.trim() || `조사 대상`;
    const kindLabel =
      s.kind === "quote"
        ? "언급한 것"
        : s.kind === "finding"
          ? "발견한 것"
          : "관찰한 것";
    return `[${idx + 1}] sourceId=${s.sourceId} · subjectId=${s.subjectId} · ${label}
종류: ${kindLabel}
내용: ${s.text}`;
  });

  return `${COACH_SYSTEM_INSTRUCTION}

---
[지시]
아래는 조사 결과 포스트잇입니다. **각 포스트잇마다 잠재 니즈를 정확히 1개** 도출하세요.

규칙:
- 해당 언급·관찰·발견 아래에 있을 수 있는 더 깊은 욕구·불편·기대를 추론합니다.
- 각 항목은 한 문장으로 씁니다. (가설) 같은 접두어는 쓰지 않습니다.
- 결론처럼 단정하지 않습니다.
- sourceId를 그대로 반환해 어떤 조사 포스트잇에 붙일지 알 수 있게 합니다.
- JSON만 출력합니다. 마크다운·설명 없음.

출력 형식:
{"needs":[{"sourceId":"...","subjectId":"...","text":"..."}]}

조사 포스트잇:
${blocks.join("\n\n")}`;
}

function parseNeedsJson(
  text: string,
): Array<{ sourceId: string; subjectId: string; text: string }> | null {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      needs?: Array<{
        sourceId?: string;
        subjectId?: string;
        text?: string;
      }>;
    };
    if (!Array.isArray(parsed.needs)) return null;
    const needs = parsed.needs
      .map((n) => ({
        sourceId: String(n.sourceId ?? "").trim(),
        subjectId: String(n.subjectId ?? "").trim(),
        text: String(n.text ?? "").trim(),
      }))
      .filter((n) => n.sourceId && n.subjectId && n.text);
    return needs.length > 0 ? needs : null;
  } catch {
    return null;
  }
}

function heuristicFallback(sources: SourcePayload[]) {
  return {
    needs: sources.map((s) => ({
      sourceId: s.sourceId,
      subjectId: s.subjectId,
      text: heuristicLatentNeedForSource(s as SourceLatentInput),
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
  const sources = parseSources((body as { sources?: unknown }).sources);

  if (!projectId || sources.length === 0) {
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
    return NextResponse.json(heuristicFallback(sources));
  }

  try {
    const result = await groqComplete(buildPrompt(sources), {
      models: resolveGroqTextModels(),
      temperature: 0.4,
      jsonMode: true,
    });

    const parsed = parseNeedsJson(result.text);
    if (!parsed?.length) {
      return NextResponse.json(heuristicFallback(sources));
    }

    const bySource = new Map(sources.map((s) => [s.sourceId, s]));
    const needs = parsed.map((n) => {
      const src = bySource.get(n.sourceId);
      return {
        sourceId: n.sourceId,
        subjectId: src?.subjectId ?? n.subjectId,
        text: n.text,
      };
    });

    // 모델이 일부 source를 빠뜨리면 휴리스틱으로 보완
    const covered = new Set(needs.map((n) => n.sourceId));
    for (const src of sources) {
      if (covered.has(src.sourceId)) continue;
      needs.push({
        sourceId: src.sourceId,
        subjectId: src.subjectId,
        text: heuristicLatentNeedForSource(src),
      });
    }

    return NextResponse.json({
      needs,
      source: "groq",
      model: result.model,
    });
  } catch {
    return NextResponse.json(heuristicFallback(sources));
  }
}
