import { NextResponse } from "next/server";
import { resolveGroqApiKey, resolveGroqTextModels } from "@/lib/ai/env";
import { groqComplete } from "@/lib/ai/providers/groqText";
import {
  COACH_KOREAN_LABEL_RULE,
  sanitizeCoachKoreanText,
} from "@/lib/coach/sanitizeCoachKorean";
import { COACH_SYSTEM_INSTRUCTION } from "@/lib/coach/systemInstruction";
import { fetchProjectAccess } from "@/lib/projects/projectAccess";

interface PersonaPayload {
  subjectId: string;
  name: string;
  context: string;
  items: Array<{ kind: string; text: string }>;
}

interface GeneratedPersonaStages {
  subjectId: string;
  stages: string[];
}

const MIN_STAGES = 4;
const MAX_STAGES = 6;
const MAX_LABEL_LENGTH = 16;
const MAX_ITEMS_PER_PERSONA = 12;
const GENERIC_LABELS = [
  "문제 인지",
  "정보 탐색",
  "선택·결정",
  "선택 결정",
  "사용·경험",
  "사용 경험",
  "사후·반복",
  "사후 반복",
];

function clip(text: string, max: number): string {
  const trimmed = text.trim();
  return trimmed.length <= max ? trimmed : `${trimmed.slice(0, max - 1)}…`;
}

function kindLabel(kind: string): string {
  if (kind === "quote") return "언급";
  if (kind === "observation") return "관찰";
  return "조사";
}

function parsePersonas(raw: unknown): PersonaPayload[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((entry) => entry && typeof entry === "object")
    .map((entry) => {
      const o = entry as Record<string, unknown>;
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
            .slice(0, MAX_ITEMS_PER_PERSONA)
        : [];
      return {
        subjectId: String(o.subjectId ?? "").trim(),
        name: String(o.name ?? "").trim(),
        context: String(o.context ?? "").trim(),
        items,
      };
    })
    .filter((persona) => persona.subjectId);
}

function buildPrompt(
  problem: string,
  prePmfSummary: string,
  personas: PersonaPayload[],
): string {
  const personaBlocks = personas
    .map((persona) => {
      const research =
        persona.items.length > 0
          ? persona.items
              .map(
                (item, index) =>
                  `  ${index + 1}. [${kindLabel(item.kind)}] ${clip(item.text, 120)}`,
              )
              .join("\n")
          : "  (아직 리서치 카드 없음 — 문제 정의와 대상 맥락으로 추론)";
      return `- subjectId: ${persona.subjectId}
  대상: ${persona.name || "(이름 미정)"}${persona.context ? ` — ${clip(persona.context, 80)}` : ""}
  리서치 카드:
${research}`;
    })
    .join("\n");

  return `${COACH_SYSTEM_INSTRUCTION}

---
[지시]
사용자 여정 지도의 **여정 단계**를 디자인씽킹·서비스 디자인의 표준 여정 지도 형식으로, 프로젝트 주제에 맞게 설계합니다.

프로젝트 문제 정의:
${problem}
${prePmfSummary ? `\n리서치 방향·맥락 요약:\n${clip(prePmfSummary, 600)}\n` : ""}
조사 대상(페르소나)별 리서치 자료:
${personaBlocks}

규칙:
- 각 페르소나마다 여정 단계 ${MIN_STAGES}~${MAX_STAGES}개를 시간 순서대로 만듭니다.
- 서비스 디자인 여정 지도의 표준 국면 흐름을 따릅니다: [계기·필요 인지 → 탐색·정보 수집 → 비교·선택 → 실행·사용 → 사후·유지]. 이 국면 구조를 유지하면서 각 국면 이름에 이 주제의 맥락을 담아 표현합니다.
- 각 단계 라벨은 한국어 명사형 4~${MAX_LABEL_LENGTH}자. (예: 금융 주제라면 "돈 관리 필요 인지" "금융 정보 탐색" "저축·투자 방법 결정" "돈 관리 실행" "습관 점검·조정")
- 특정 개인의 생애 사건(예: "고등학교 졸업 후 직장 입사")이나 일회성 행동(예: "적금 계좌 개설")을 단계로 쓰지 않습니다. 조사 대상 누구에게나 반복 적용되는 경험 국면이어야 합니다.
- "문제 인지" "정보 탐색" "선택·결정" "사용·경험" "사후·반복"처럼 주제 맥락이 전혀 없는 범용 라벨 그대로도 금지합니다.
- 리서치 카드는 각 국면에서 무슨 일이 벌어지는지 파악하는 근거로만 씁니다. 카드 속 사건을 단계 이름으로 옮기지 않습니다.
- 페르소나의 상황이 다르면 국면 표현·구성이 조금씩 달라질 수 있습니다.
${COACH_KOREAN_LABEL_RULE}
- JSON만 출력: {"personas":[{"subjectId":"...","stages":["단계1","단계2","..."]}]}`;
}

function parseStagesJson(text: string): GeneratedPersonaStages[] | null {
  const jsonMatch = text.trim().match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as { personas?: unknown };
    if (!Array.isArray(parsed.personas)) return null;
    const result: GeneratedPersonaStages[] = [];
    for (const entry of parsed.personas) {
      if (!entry || typeof entry !== "object") continue;
      const o = entry as Record<string, unknown>;
      const subjectId = String(o.subjectId ?? "").trim();
      if (!subjectId || !Array.isArray(o.stages)) continue;

      const seen = new Set<string>();
      const stages: string[] = [];
      for (const raw of o.stages) {
        if (typeof raw !== "string") continue;
        const label = clip(
          sanitizeCoachKoreanText(raw).replace(/^[-·•\d.\s]+/, ""),
          MAX_LABEL_LENGTH,
        );
        if (!label || seen.has(label)) continue;
        if (GENERIC_LABELS.includes(label)) continue;
        seen.add(label);
        stages.push(label);
        if (stages.length >= MAX_STAGES) break;
      }
      if (stages.length >= MIN_STAGES) {
        result.push({ subjectId, stages });
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
  const problem = String(record.problem ?? "").trim();
  const prePmfSummary = String(record.prePmfSummary ?? "").trim();
  const personas = parsePersonas(record.personas);

  if (!projectId || !problem || personas.length === 0) {
    return NextResponse.json({ error: "필수 값이 없습니다." }, { status: 400 });
  }

  const access = await fetchProjectAccess(projectId);
  if (!access) {
    return NextResponse.json(
      { error: "프로젝트 접근 권한이 없습니다." },
      { status: 403 },
    );
  }

  // AI를 못 쓰면 기본 단계를 유지하도록 빈 결과를 돌려줍니다.
  if (!resolveGroqApiKey()) {
    return NextResponse.json({ personas: [], source: "heuristic" });
  }

  try {
    const result = await groqComplete(
      buildPrompt(problem, prePmfSummary, personas),
      {
        models: resolveGroqTextModels(),
        temperature: 0.4,
        jsonMode: true,
      },
    );

    const generated = parseStagesJson(result.text);
    if (!generated) {
      return NextResponse.json({ personas: [], source: "heuristic" });
    }

    return NextResponse.json({
      personas: generated,
      source: "groq",
      model: result.model,
    });
  } catch {
    return NextResponse.json({ personas: [], source: "heuristic" });
  }
}
