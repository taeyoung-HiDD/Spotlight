import { NextResponse } from "next/server";
import { resolveGroqApiKey, resolveGroqTextModels } from "@/lib/ai/env";
import { groqComplete } from "@/lib/ai/providers/groqText";
import { sanitizeCoachKoreanText } from "@/lib/coach/sanitizeCoachKorean";
import { COACH_SYSTEM_INSTRUCTION } from "@/lib/coach/systemInstruction";
import { fetchProjectAccess } from "@/lib/projects/projectAccess";
import type { JourneyAiZone } from "@/lib/stages/stage6/userJourneyTypes";

interface StepPayload {
  stepId: string;
  stepLabel: string;
  zones: JourneyAiZone[];
  items: Array<{ kind: string; text: string }>;
}

interface GeneratedStepZones {
  stepId: string;
  touchpoint?: string[];
  pain_point?: string[];
}

const MAX_ENTRIES_PER_ZONE = 4;
const MAX_ITEMS_PER_STEP = 10;

const ZONE_GUIDE: Record<JourneyAiZone, string> = {
  touchpoint:
    "touchpoint: 이 단계에서 사용자가 만나는 채널·접점·도구·장소·서비스 접점 2~3개",
  pain_point:
    "pain_point: 이 단계의 불편·장애·막힘·좌절 포인트 2~3개",
};

function kindLabel(kind: string): string {
  if (kind === "quote") return "언급";
  if (kind === "observation") return "관찰";
  return "조사";
}

function clip(text: string, max: number): string {
  const trimmed = text.trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1)}…`;
}

function parseSteps(raw: unknown): StepPayload[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => {
      const o = entry as Record<string, unknown>;
      const zones = Array.isArray(o.zones)
        ? o.zones.filter(
            (zone): zone is JourneyAiZone =>
              zone === "touchpoint" || zone === "pain_point",
          )
        : [];
      const items = Array.isArray(o.items)
        ? o.items
            .filter((item) => item && typeof item === "object")
            .map((item) => {
              const it = item as Record<string, unknown>;
              return {
                kind: String(it.kind ?? "").trim(),
                text: String(it.text ?? "").trim(),
              };
            })
            .filter((item) => item.text)
            .slice(0, MAX_ITEMS_PER_STEP)
        : [];
      return {
        stepId: String(o.stepId ?? "").trim(),
        stepLabel: String(o.stepLabel ?? "").trim(),
        zones,
        items,
      };
    })
    .filter((step) => step.stepId && step.zones.length > 0 && step.items.length > 0);
}

function buildPrompt(
  subjectName: string,
  expectations: string,
  steps: StepPayload[],
): string {
  const stepBlocks = steps
    .map((step) => {
      const research = step.items
        .map(
          (item, index) =>
            `  ${index + 1}. [${kindLabel(item.kind)}] ${clip(item.text, 120)}`,
        )
        .join("\n");
      const zoneLines = step.zones
        .map((zone) => `  - ${ZONE_GUIDE[zone]}`)
        .join("\n");
      return `- stepId: ${step.stepId}
  여정 단계: ${step.stepLabel || "(단계 미정)"}
  채울 구역:
${zoneLines}
  리서치 카드:
${research}`;
    })
    .join("\n");

  return `${COACH_SYSTEM_INSTRUCTION}

---
[지시]
사용자 여정 지도의 **터치포인트·Pain point** 초안을 여정 단계별로 한 번에 작성합니다.

페르소나: ${subjectName || "(이름 미정)"}
${expectations.trim() ? `기대 사항: ${expectations.trim()}` : ""}

여정 단계별 작성 대상:
${stepBlocks}

규칙:
- 각 단계의 리서치 카드(언급·관찰)만 근거로 씁니다. 없는 사실은 만들지 않습니다.
- 결론처럼 단정하지 않고, 가설·관찰 톤으로 짧게 씁니다.
- 한국어 일상어. 각 항목은 한 문장.
- 요청된 구역만 채웁니다. 근거가 부족한 구역은 빈 배열로 둡니다.
- JSON만 출력: {"steps":[{"stepId":"...","touchpoint":["항목1","항목2"],"pain_point":["항목1","항목2"]}]}`;
}

function normalizeEntries(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const entries: string[] = [];
  for (const value of raw) {
    if (typeof value !== "string") continue;
    const text = sanitizeCoachKoreanText(value).replace(/^[\s·•\-*\d.]+/, "").trim();
    if (!text || seen.has(text)) continue;
    seen.add(text);
    entries.push(text);
    if (entries.length >= MAX_ENTRIES_PER_ZONE) break;
  }
  return entries;
}

function parseStepsJson(
  text: string,
  requested: StepPayload[],
): GeneratedStepZones[] | null {
  const jsonMatch = text.trim().match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as { steps?: unknown };
    if (!Array.isArray(parsed.steps)) return null;

    const requestedById = new Map(requested.map((step) => [step.stepId, step]));
    const result: GeneratedStepZones[] = [];
    for (const entry of parsed.steps) {
      if (!entry || typeof entry !== "object") continue;
      const o = entry as Record<string, unknown>;
      const stepId = String(o.stepId ?? "").trim();
      const request = requestedById.get(stepId);
      if (!request) continue;

      const generated: GeneratedStepZones = { stepId };
      for (const zone of request.zones) {
        const entries = normalizeEntries(o[zone]);
        if (entries.length > 0) generated[zone] = entries;
      }
      if (generated.touchpoint || generated.pain_point) {
        result.push(generated);
      }
    }
    return result.length > 0 ? result : null;
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

  const record = body as Record<string, unknown>;
  const projectId = String(record.projectId ?? "").trim();
  const subjectName = String(record.subjectName ?? "").trim();
  const expectations = String(record.expectations ?? "").trim();
  const steps = parseSteps(record.steps);

  if (!projectId || steps.length === 0) {
    return NextResponse.json({ error: "필수 값이 없습니다." }, { status: 400 });
  }

  const access = await fetchProjectAccess(projectId);
  if (!access) {
    return NextResponse.json(
      { error: "프로젝트 접근 권한이 없습니다." },
      { status: 403 },
    );
  }

  // AI를 못 쓰면 빈 결과를 돌려 사용자가 직접 채우게 둡니다.
  if (!resolveGroqApiKey()) {
    return NextResponse.json({ steps: [], source: "heuristic" });
  }

  try {
    const result = await groqComplete(
      buildPrompt(subjectName, expectations, steps),
      {
        models: resolveGroqTextModels(),
        temperature: 0.4,
        jsonMode: true,
      },
    );

    const generated = parseStepsJson(result.text, steps);
    if (!generated) {
      return NextResponse.json({ steps: [], source: "heuristic" });
    }

    return NextResponse.json({
      steps: generated,
      source: "groq",
      model: result.model,
    });
  } catch {
    return NextResponse.json({ steps: [], source: "heuristic" });
  }
}
