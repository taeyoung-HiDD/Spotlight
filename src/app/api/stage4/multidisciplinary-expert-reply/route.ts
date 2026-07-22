import { resolveGroqApiKey, resolveGroqTextModels } from "@/lib/ai/env";
import { groqComplete } from "@/lib/ai/providers/groqText";
import { fetchProjectAccess } from "@/lib/projects/projectAccess";
import {
  getMultidisciplinaryExpert,
  mergeRootReading,
  normalizeRootReading,
  type MultidisciplinaryExpertId,
  type MultidisciplinaryRootReading,
} from "@/lib/stages/stage4/multidisciplinaryAnalysis";
import { NextResponse } from "next/server";

interface Body {
  projectId?: string;
  subjectId?: string;
  subjectName?: string;
  expertId?: string;
  question?: string;
  priorInsight?: string;
  quotes?: Array<{ id?: string; text?: string } | string>;
  observations?: Array<{ id?: string; text?: string } | string>;
  findings?: Array<{ id?: string; text?: string } | string>;
  problem?: string;
  rootReading?: unknown;
  noteIds?: string[];
}

function clipList(
  raw: Body["quotes"],
  max: number,
): Array<{ id: string; text: string }> {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item, i) => {
      if (typeof item === "string") {
        const text = item.trim().slice(0, 400);
        return text ? { id: `legacy-${i}`, text } : null;
      }
      if (!item || typeof item !== "object") return null;
      const text = String(item.text ?? "").trim().slice(0, 400);
      if (!text) return null;
      const id = String(item.id ?? "").trim() || `legacy-${i}`;
      return { id, text };
    })
    .filter((x): x is { id: string; text: string } => Boolean(x))
    .slice(0, max);
}

function formatNotes(
  label: string,
  items: Array<{ id: string; text: string }>,
): string {
  if (!items.length) return `${label}: (없음)`;
  return `${label}:\n${items.map((n) => `· [noteId=${n.id}] ${n.text}`).join("\n")}`;
}

function extractJsonObject(text: string): Record<string, unknown> | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "잘못된 JSON입니다." }, { status: 400 });
  }

  const projectId = String(body.projectId ?? "").trim();
  const expertId = String(body.expertId ?? "").trim() as MultidisciplinaryExpertId;
  const question = String(body.question ?? "").trim();
  const expert = getMultidisciplinaryExpert(expertId);

  if (!projectId || !expert || !question) {
    return NextResponse.json({ error: "필수 값이 없습니다." }, { status: 400 });
  }

  const access = await fetchProjectAccess(projectId);
  if (!access) {
    return NextResponse.json(
      { error: "프로젝트 접근 권한이 없습니다." },
      { status: 403 },
    );
  }

  const subjectName = String(body.subjectName ?? "").trim() || "조사 대상";
  const priorInsight = String(body.priorInsight ?? "").trim();
  const problem = String(body.problem ?? "").trim();
  const quotes = clipList(body.quotes, 8);
  const observations = clipList(body.observations, 8);
  const findings = clipList(body.findings, 8);
  const allowed = new Set(
    [
      ...quotes.map((n) => n.id),
      ...observations.map((n) => n.id),
      ...findings.map((n) => n.id),
      ...(Array.isArray(body.noteIds) ? body.noteIds : []),
    ].filter(Boolean),
  );
  const currentReading = normalizeRootReading(body.rootReading, allowed);

  const heuristicReply = () => {
    const tip = priorInsight
      ? `앞서 말씀드린 「${priorInsight.slice(0, 80)}」 흐름에서 보면, `
      : "";
    return `${tip}「${question.slice(0, 60)}」에 대해 ${expert.labelKo} 렌즈(${expert.lens})로 다시 읽어 보면, ${subjectName}의 조사 기록 속에 더 파볼 내면 욕구·장벽이 보여요. ${expert.rootProbe} 아직은 가설이에요.`;
  };

  const heuristicPatch = (): Partial<MultidisciplinaryRootReading> | null => {
    if (!currentReading) return null;
    return {
      latentRoot: {
        id: currentReading.latentRoot?.id ?? `rr-latent-${Date.now()}`,
        layer: "latentRoot",
        text: `질문 「${question.slice(0, 40)}」을(를) 반영하면, 근원에는 인정·안전 욕구가 더 또렷해 보여요. (가설)`,
        sourceRefs:
          currentReading.latentRoot?.sourceRefs?.length
            ? currentReading.latentRoot.sourceRefs
            : [...allowed].slice(0, 3),
        confidence: "hypothesis",
      },
    };
  };

  if (!resolveGroqApiKey()) {
    const patch = heuristicPatch();
    return NextResponse.json({
      reply: heuristicReply(),
      rootReadingPatch: patch,
      rootReading: mergeRootReading(currentReading, patch, allowed),
      source: "heuristic",
    });
  }

  const prompt = `당신은 다학제적 분석 세션의 **${expert.labelKo} (${expert.labelEn})** 입니다.
렌즈: ${expert.lens}
필수 근원 질문: ${expert.rootProbe}

역할:
- 조사 대상 「${subjectName}」에 대해 사용자 질문에 답합니다.
- 아래 **내부 근원 읽기(JSON)** 는 화면에 보이지 않습니다. 당신이 학습·답변에만 쓰세요.
- 본인 전문 분야 관점만 유지합니다.
- 한국어 **해요체**만. 4~7문장. 단정 금지. 「(가설)」.
- 언급 재서술 금지. 모순·침묵·구조·근원을 파고드세요.
- Kevin처럼 행동하지 마세요. 근원 읽기 필드를 그대로 나열하지 마세요.

프로젝트 주제: ${problem || "(미정)"}
이전 본인 해설: ${priorInsight || "(없음)"}
내부 근원 읽기(학습용 JSON, 사용자 미노출): ${JSON.stringify(currentReading ?? {})}
${formatNotes("언급", quotes)}
${formatNotes("관찰", observations)}
${formatNotes("발견", findings)}

사용자 질문:
${question}

JSON만 출력:
{
  "reply":"전문가 답변 본문",
  "rootReadingPatch":{
    "tension": null,
    "latentRoot": {"id":"...","layer":"latentRoot","text":"... (가설)","sourceRefs":["noteId"],"confidence":"hypothesis"}
  }
}
- rootReadingPatch에는 갱신할 레이어만 넣으세요. 없으면 {}.
- sourceRefs는 위 noteId만.`;

  try {
    const result = await groqComplete(prompt, {
      models: resolveGroqTextModels(),
      temperature: 0.45,
      jsonMode: true,
    });
    const parsed = extractJsonObject(result.text);
    const reply =
      (typeof parsed?.reply === "string" && parsed.reply.trim()) ||
      result.text.trim() ||
      heuristicReply();
    const patchRaw =
      parsed?.rootReadingPatch && typeof parsed.rootReadingPatch === "object"
        ? (parsed.rootReadingPatch as Partial<MultidisciplinaryRootReading>)
        : null;
    const merged = mergeRootReading(currentReading, patchRaw, allowed);
    return NextResponse.json({
      reply,
      rootReadingPatch: patchRaw,
      rootReading: merged,
      source: "groq",
      model: result.model,
      expertId: expert.id,
    });
  } catch (e) {
    const patch = heuristicPatch();
    return NextResponse.json({
      reply: heuristicReply(),
      rootReadingPatch: patch,
      rootReading: mergeRootReading(currentReading, patch, allowed),
      source: "heuristic",
      details: e instanceof Error ? e.message : String(e),
    });
  }
}
