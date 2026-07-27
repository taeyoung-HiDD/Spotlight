import { NextResponse } from "next/server";
import { resolveGroqApiKey, resolveGroqTextModels } from "@/lib/ai/env";
import { groqComplete } from "@/lib/ai/providers/groqText";
import {
  COACH_KOREAN_LABEL_RULE,
  sanitizeCoachKoreanText,
} from "@/lib/coach/sanitizeCoachKorean";
import { COACH_SYSTEM_INSTRUCTION } from "@/lib/coach/systemInstruction";
import { fetchProjectAccess } from "@/lib/projects/projectAccess";
import { isTemplateLatentNeedText } from "@/lib/stages/stage5/generateLatentNeedsHeuristic";

interface SourcePayload {
  sourceId: string;
  subjectId: string;
  subjectName: string;
  kind: "quote" | "observation" | "finding";
  text: string;
}

const KIND_SET = new Set(["quote", "observation", "finding"]);

/** 포스트잇이 많을 때 한 호출 실패로 전체가 비지 않도록 묶어서 요청 */
const CHUNK_SIZE = 10;

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
아래 조사 결과 포스트잇마다 **잠재 니즈(Latent Needs)를 정확히 1개씩** 도출합니다.

잠재 니즈란:
- 겉으로 보이는 사실(Fact)은 빙산의 일각입니다. 그 아래에 있는, 사용자가 바라고 희망하지만 사회적 압력(체면·부끄러움) 때문에 표현하지 못하거나 스스로 자각하지 못하는 깊은 욕구(Desire)입니다.
- 말로 표현된 니즈(Explicit)나 행동으로 드러나는 니즈(Tacit)를 넘어, 분석을 통해서만 찾아지는 욕구입니다.

작성 형식 — Need Statement 한 문장:
- "〈궁극적 이유·얻으려는 가치〉하기 위해서 〈가치 달성을 위한 행위〉하고 싶다"
- 예: "막연한 돈 불안에서 벗어나 잘하고 있다는 확신을 얻기 위해서, 내 상황에 맞는 돈 관리 기준을 세우고 싶다"

규칙:
- 반드시 해당 포스트잇 내용에서 출발해, 그 사람의 상황에 맞는 구체적인 니즈를 씁니다. 포스트잇마다 내용이 서로 달라야 합니다.
- 포스트잇 문장을 되풀이하거나 요약하지 않습니다. 표면 사실 아래의 욕구를 씁니다.
- 솔루션(기능·서비스·제품 아이디어)이 아니라 욕구·가치를 씁니다.
- "아직 드러나지 않은 욕구가 있을 수 있어요" 같은 뭉뚱그린 문장은 금지합니다.
- (가설) 같은 접두어는 쓰지 않고, 결론처럼 단정하지 않습니다.
${COACH_KOREAN_LABEL_RULE}
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
        text: sanitizeCoachKoreanText(String(n.text ?? "")).trim(),
      }))
      .filter(
        (n) =>
          n.sourceId &&
          n.subjectId &&
          n.text &&
          !isTemplateLatentNeedText(n.text),
      );
    return needs.length > 0 ? needs : null;
  } catch {
    return null;
  }
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

  // AI를 못 쓰면 뭉뚱그린 템플릿 대신 빈 결과를 돌려 다음에 다시 시도하게 둡니다.
  if (!resolveGroqApiKey()) {
    return NextResponse.json({ needs: [], source: "heuristic" });
  }

  const chunks: SourcePayload[][] = [];
  for (let i = 0; i < sources.length; i += CHUNK_SIZE) {
    chunks.push(sources.slice(i, i + CHUNK_SIZE));
  }

  const settled = await Promise.all(
    chunks.map(async (chunk) => {
      try {
        const result = await groqComplete(buildPrompt(chunk), {
          models: resolveGroqTextModels(),
          temperature: 0.5,
          jsonMode: true,
        });
        return { parsed: parseNeedsJson(result.text), model: result.model };
      } catch {
        return { parsed: null, model: undefined };
      }
    }),
  );

  const bySource = new Map(sources.map((s) => [s.sourceId, s]));
  const needs: Array<{ sourceId: string; subjectId: string; text: string }> =
    [];
  let model: string | undefined;
  for (const { parsed, model: chunkModel } of settled) {
    if (!parsed) continue;
    model ??= chunkModel;
    for (const n of parsed) {
      const src = bySource.get(n.sourceId);
      if (!src) continue;
      needs.push({
        sourceId: n.sourceId,
        subjectId: src.subjectId,
        text: n.text,
      });
    }
  }

  if (needs.length === 0) {
    return NextResponse.json({ needs: [], source: "heuristic" });
  }

  return NextResponse.json({ needs, source: "groq", model });
}
