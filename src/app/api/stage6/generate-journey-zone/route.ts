import { NextResponse } from "next/server";
import { resolveGroqApiKey, resolveGroqTextModels } from "@/lib/ai/env";
import { groqComplete } from "@/lib/ai/providers/groqText";
import { COACH_SYSTEM_INSTRUCTION } from "@/lib/coach/systemInstruction";
import { fetchProjectAccess } from "@/lib/projects/projectAccess";
import type { JourneyAiZone } from "@/lib/stages/stage6/userJourneyTypes";

interface ResearchItemPayload {
  kind: string;
  text: string;
}

const ZONE_GUIDE: Record<
  JourneyAiZone,
  { label: string; instruction: string }
> = {
  touchpoint: {
    label: "터치포인트",
    instruction:
      "이 여정 단계에서 사용자가 만나는 채널·접점·도구·장소·서비스 접점을 2~4개 bullet로 정리하세요.",
  },
  pain_point: {
    label: "Pain point",
    instruction:
      "이 단계의 불편·장애·막힘·좌절 포인트를 2~4개 bullet로 정리하세요.",
  },
};

function parseItems(raw: unknown): ResearchItemPayload[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const o = item as Record<string, unknown>;
      return {
        kind: String(o.kind ?? "").trim(),
        text: String(o.text ?? "").trim(),
      };
    })
    .filter((item) => item.text);
}

function kindLabel(kind: string): string {
  if (kind === "quote") return "언급";
  if (kind === "observation") return "관찰";
  if (kind === "latent_need") return "잠재 니즈";
  return "조사";
}

function buildPrompt(
  zone: JourneyAiZone,
  subjectName: string,
  stepLabel: string,
  expectations: string,
  items: ResearchItemPayload[],
): string {
  const guide = ZONE_GUIDE[zone];
  const researchBlock = items
    .map((item, index) => `${index + 1}. [${kindLabel(item.kind)}] ${item.text}`)
    .join("\n");

  return `${COACH_SYSTEM_INSTRUCTION}

---
[지시]
6단계 사용자 여정 지도 — **${guide.label}** 칸 초안을 작성합니다.

페르소나: ${subjectName || "(이름 미정)"}
여정 단계: ${stepLabel || "(단계 미정)"}
${expectations.trim() ? `기대 사항: ${expectations.trim()}` : ""}

${guide.instruction}

규칙:
- 아래 리서치 카드(언급·관찰·잠재 니즈)만 근거로 씁니다. 없는 사실은 만들지 않습니다.
- 결론처럼 단정하지 않고, 가설·관찰 톤으로 짧게 씁니다.
- 한국어 일상어. 각 bullet은 한 문장.
- JSON만 출력: {"text":"bullet1\\nbullet2\\n..."}

리서치 카드:
${researchBlock}`;
}

function parseTextJson(text: string): string | null {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as { text?: unknown };
    if (typeof parsed.text !== "string" || !parsed.text.trim()) return null;
    return parsed.text.trim();
  } catch {
    return null;
  }
}

function heuristicFallback(
  zone: JourneyAiZone,
  items: ResearchItemPayload[],
): string {
  const guide = ZONE_GUIDE[zone];
  const lines = items.slice(0, 3).map((item) => {
    const prefix =
      zone === "touchpoint"
        ? "이 단계에서 만나는 접점"
        : "이 단계의 불편";
    return `· ${prefix}: ${item.text}`;
  });
  return lines.length > 0
    ? lines.join("\n")
    : `· ${guide.label}을 리서치 카드와 함께 채워 보세요.`;
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
  const zone = String(record.zone ?? "").trim() as JourneyAiZone;
  const subjectName = String(record.subjectName ?? "").trim();
  const stepLabel = String(record.stepLabel ?? "").trim();
  const expectations = String(record.expectations ?? "").trim();
  const items = parseItems(record.items);

  if (
    !projectId ||
    !zone ||
    !["touchpoint", "pain_point"].includes(zone) ||
    items.length === 0
  ) {
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
    return NextResponse.json({
      text: heuristicFallback(zone, items),
      source: "heuristic",
    });
  }

  try {
    const result = await groqComplete(
      buildPrompt(zone, subjectName, stepLabel, expectations, items),
      {
        models: resolveGroqTextModels(),
        temperature: 0.4,
        jsonMode: true,
      },
    );

    const text = parseTextJson(result.text);
    if (!text) {
      return NextResponse.json({
        text: heuristicFallback(zone, items),
        source: "heuristic",
      });
    }

    return NextResponse.json({
      text,
      source: "groq",
      model: result.model,
    });
  } catch {
    return NextResponse.json({
      text: heuristicFallback(zone, items),
      source: "heuristic",
    });
  }
}
