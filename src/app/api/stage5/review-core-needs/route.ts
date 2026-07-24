import { NextResponse } from "next/server";
import { resolveGroqApiKey, resolveGroqTextModels } from "@/lib/ai/env";
import { groqComplete } from "@/lib/ai/providers/groqText";
import { COACH_SYSTEM_INSTRUCTION } from "@/lib/coach/systemInstruction";
import { fetchProjectAccess } from "@/lib/projects/projectAccess";
import type { KanoSignal } from "@/lib/stages/stage5/reviewCoreNeedsClient";

interface NeedPayload {
  id: string;
  text: string;
}

interface CoreNeedReview {
  needId: string;
  counterQuestion: string;
  riskNote: string;
  kanoSignal: KanoSignal;
  mustBeSuspicion: boolean;
}

function parseNeeds(raw: unknown): NeedPayload[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((n) => n && typeof n === "object")
    .map((n) => {
      const o = n as Record<string, unknown>;
      return {
        id: String(o.id ?? "").trim(),
        text: String(o.text ?? "").trim(),
      };
    })
    .filter((n) => n.id && n.text);
}

function normalizeKanoSignal(raw: unknown): KanoSignal {
  const v = String(raw ?? "").trim();
  if (v === "must_be" || v === "attractive" || v === "unknown") return v;
  return "unknown";
}

function buildPrompt(
  coreNeeds: NeedPayload[],
  parkedNeeds: NeedPayload[],
): string {
  const coreBlocks = coreNeeds
    .map((n, i) => `[핵심 ${i + 1}] id=${n.id}\n내용: ${n.text}`)
    .join("\n\n");
  const parkedBlocks =
    parkedNeeds.length > 0
      ? parkedNeeds
          .map((n, i) => `[보류 ${i + 1}] id=${n.id}\n내용: ${n.text}`)
          .join("\n\n")
      : "(없음)";

  return `${COACH_SYSTEM_INSTRUCTION}

---
[지시]
사용자가 잠재 니즈 중 아래를 「핵심 니즈」로 골랐습니다. 혼자 고르는 상황이므로,
팀 투표를 대신해 **각 핵심 니즈마다 반대 관점 1개**를 던지세요.

Kano 모델 관점을 참고하세요:
- must_be(당연적 품질): 없으면 불만이지만 있어도 특별히 감동하지 않는 니즈 의
- attractive(매력적 품질): 있으면 만족·차별화가 되는 잠재 니즈 후보
- unknown: 판단이 애매함

규칙:
- counterQuestion: 사용자가 스스로 재검토하게 만드는 짧은 질문 1문장 (한국어 일상어).
  must_be 의심이면 예: "이건 당연히 있어야 하는 것 아닐까요? 없으면 불만이지만, 있어도 특별히 감동하지는 않을 것 같은데요."
- riskNote: 이 니즈를 핵심으로 밀 때의 리스크 한 줄. 단정하지 말고 가설 톤. **판정하지 말 것.**
- kanoSignal: "must_be" | "attractive" | "unknown"
- mustBeSuspicion: kanoSignal이 must_be이면 true, 아니면 false
- 모든 핵심 니즈 id를 정확히 하나씩 다룹니다.
- JSON만 출력. 마크다운·설명 없음.

출력 형식:
{"reviews":[{"needId":"id1","counterQuestion":"...","riskNote":"...","kanoSignal":"must_be","mustBeSuspicion":true}]}

핵심 니즈:
${coreBlocks}

보류한 니즈:
${parkedBlocks}`;
}

function parseReviewsJson(text: string): CoreNeedReview[] | null {
  const jsonMatch = text.trim().match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      reviews?: Array<{
        needId?: unknown;
        counterQuestion?: unknown;
        riskNote?: unknown;
        kanoSignal?: unknown;
        mustBeSuspicion?: unknown;
      }>;
    };
    if (!Array.isArray(parsed.reviews)) return null;
    const reviews = parsed.reviews
      .map((r) => {
        const kanoSignal = normalizeKanoSignal(r.kanoSignal);
        const mustBeSuspicion =
          r.mustBeSuspicion === true || kanoSignal === "must_be";
        return {
          needId: String(r.needId ?? "").trim(),
          counterQuestion: String(r.counterQuestion ?? "").trim(),
          riskNote: String(r.riskNote ?? "").trim(),
          kanoSignal: mustBeSuspicion ? ("must_be" as const) : kanoSignal,
          mustBeSuspicion,
        };
      })
      .filter((r) => r.needId && r.counterQuestion);
    return reviews.length > 0 ? reviews : null;
  } catch {
    return null;
  }
}

const FALLBACK_QUESTIONS = [
  "이건 당연히 있어야 하는 것 아닐까요? 없으면 불만이지만, 있어도 특별히 감동하지는 않을 것 같은데요.",
  "이미 쓰고 있는 자구책·대안이 충분히 편하다면, 굳이 새 해결이 필요할까요?",
  "이 니즈, 실제 조사에서 몇 명이나 겪고 있었나요? 한 사람의 극단 사례는 아닌지 돌아봐 주세요.",
  "이 니즈가 해결되면 사용자의 하루가 실제로 달라지나요, 아니면 조금 편해지는 정도인가요?",
  "보류함에 넣은 니즈 중 이것보다 자주·아프게 겪는 게 없는지 한 번만 다시 봐 주세요.",
];

function fallbackReviews(coreNeeds: NeedPayload[]): CoreNeedReview[] {
  return coreNeeds.map((n, i) => {
    const mustBeSuspicion = i % 5 === 0;
    return {
      needId: n.id,
      counterQuestion: FALLBACK_QUESTIONS[i % FALLBACK_QUESTIONS.length],
      riskNote:
        "조사 기록(언급·관찰)으로 근거를 다시 확인해 보면 좋아요. 아직은 가설이에요.",
      kanoSignal: mustBeSuspicion ? "must_be" : "unknown",
      mustBeSuspicion,
    };
  });
}

function normalizeReviews(
  reviews: CoreNeedReview[],
  coreNeeds: NeedPayload[],
): CoreNeedReview[] {
  const byId = new Map(reviews.map((r) => [r.needId, r] as const));
  const fallback = fallbackReviews(coreNeeds);
  return coreNeeds.map((n, i) => byId.get(n.id) ?? fallback[i]!);
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
  const coreNeeds = parseNeeds(record.coreNeeds);
  const parkedNeeds = parseNeeds(record.parkedNeeds);

  if (!projectId || coreNeeds.length === 0) {
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
    reviews: fallbackReviews(coreNeeds),
    source: "fallback" as const,
  });

  if (!resolveGroqApiKey()) {
    return NextResponse.json(fallback());
  }

  try {
    const result = await groqComplete(buildPrompt(coreNeeds, parkedNeeds), {
      models: resolveGroqTextModels(),
      temperature: 0.5,
      jsonMode: true,
    });
    const parsed = parseReviewsJson(result.text);
    if (!parsed?.length) {
      return NextResponse.json(fallback());
    }
    return NextResponse.json({
      reviews: normalizeReviews(parsed, coreNeeds),
      source: "groq",
    });
  } catch {
    return NextResponse.json(fallback());
  }
}
