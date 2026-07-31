import { NextResponse } from "next/server";
import { resolveGroqApiKey, resolveGroqTextModels } from "@/lib/ai/env";
import { groqComplete } from "@/lib/ai/providers/groqText";
import { COACH_SYSTEM_INSTRUCTION } from "@/lib/coach/systemInstruction";
import { sanitizeCoachKoreanText } from "@/lib/coach/sanitizeCoachKorean";
import { fetchProjectAccess } from "@/lib/projects/projectAccess";
import {
  CORE_NEED_LIMIT,
  type NeedQuadrantCell,
  type NeedSignalId,
  type Stage5LatentNeedsData,
} from "@/lib/stages/stage5/latentNeedsTypes";
import {
  heuristicSelectCoreNeeds,
  type CoreNeedPlacement,
  type CoreNeedSelectionItem,
  type CoreNeedSelectionResult,
} from "@/lib/stages/stage5/selectCoreNeeds";

type NeedInput = {
  id: string;
  text: string;
  subjectId: string;
  groupName: string;
  linkedSourceTexts: string[];
};

function parseNeeds(raw: unknown): NeedInput[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((n) => n && typeof n === "object")
    .map((n) => {
      const o = n as Record<string, unknown>;
      const linked = Array.isArray(o.linkedSourceTexts)
        ? o.linkedSourceTexts
            .filter((t): t is string => typeof t === "string")
            .map((t) => t.trim())
            .filter(Boolean)
            .slice(0, 4)
        : [];
      return {
        id: String(o.id ?? "").trim(),
        text: String(o.text ?? "").trim(),
        subjectId: String(o.subjectId ?? "").trim(),
        groupName: String(o.groupName ?? "").trim(),
        linkedSourceTexts: linked,
      };
    })
    .filter((n) => n.id && n.text);
}

function parseStringList(raw: unknown, max: number): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, max);
}

function buildPrompt(
  problem: string,
  painPoints: string[],
  needs: NeedInput[],
): string {
  const needBlocks = needs
    .map((n, i) => {
      const sources =
        n.linkedSourceTexts.length > 0
          ? n.linkedSourceTexts.map((t) => `  - ${t}`).join("\n")
          : "  - (연결 근거 없음)";
      return `[${i + 1}] id=${n.id}
니즈: ${n.text}
조사대상: ${n.subjectId || "(미상)"}
그룹: ${n.groupName || "(없음)"}
근거(언급·관찰):
${sources}`;
    })
    .join("\n\n");

  const pains =
    painPoints.length > 0
      ? painPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")
      : "(여정 Pain point 없음)";

  return `${COACH_SYSTEM_INSTRUCTION}

---
[지시]
잠재 니즈 목록에서 **핵심 니즈**를 골라 주세요. 보통 **2~3개**, 최대 ${CORE_NEED_LIMIT}개.

선별 기준 (모두 강하게 맞을수록 우선):
1. **최초 문제점 주제와 가장 밀접**한 잠재 니즈
2. **Pain point와 직접 연결**되어 있음 (여정 Pain·언급·관찰 근거)
3. **여러 사용자에게 반복**적으로 나타남 (같은 그룹·유사 표현)
4. **Pain의 깊이가 큼** (막막·불안·스트레스·포기 등)
5. **HMW Question으로 변환이 용이**함 (목적·상태가 드러나는 Need Statement형)

추가 가이드 (Stanford d.school · Nielsen Norman Group):
- d.school: Extreme User의 깊은 unmet need가 보편 패턴을 드러내면 우선. 아이디어로 바로 갈 수 있게 **행동 가능한(POV/HMW로 이어질)** 니즈를 고름. 솔루션을 전제한 니즈는 피함.
- NN/g: **심각도(severity) × 빈도(frequency)**가 높은 문제를 우선. 여러 사용자에게 반복되는 테마를 묶음. 「없으면 불만만 나는 당연 기능(must-be)」만으로는 핵심으로 두지 말고, 차별화·행동 변화로 이어질 unmet need를 선호.

규칙:
- selections: 핵심 니즈 2~${CORE_NEED_LIMIT}개. needId는 아래 목록 id만. cell은 "high_importance_high_gap".
- placements: **대부분의 잠재 니즈**를 사분면에 배치. 핵심도 포함. 네 cell 중 하나.
  - high_importance_high_gap / high_importance_low_gap / low_importance_high_gap / low_importance_low_gap
  - 중요도 = 고통·빈도·문제 밀접 / 해결 공백 = 쓸 만한 대안이 없는가
- parkedNeedIds: 주제와 거의 무관하거나 중복·노이즈인 **소수만** (전체의 15% 이하). 나머지를 전부 보류하지 말 것.
- signals: "pain"|"frequency"|"breadth"|"gap"|"workaround" 중 해당하는 것만.
- rationale: 핵심에만 — 왜 골랐는지 한 줄 (한국어 일상어, 가설 톤).
- JSON만 출력.

문제 정의:
${problem || "(없음)"}

여정 Pain point:
${pains}

잠재 니즈:
${needBlocks}

출력 형식:
{"selections":[{"needId":"...","cell":"high_importance_high_gap","signals":["pain","breadth","gap"],"rationale":"..."}],"placements":[{"needId":"...","cell":"high_importance_high_gap","signals":["pain","gap"]},{"needId":"...","cell":"low_importance_high_gap","signals":["gap"]}],"parkedNeedIds":["..."]}`;
}

function normalizeResult(
  parsed: unknown,
  needs: NeedInput[],
): CoreNeedSelectionResult | null {
  if (!parsed || typeof parsed !== "object") return null;
  const o = parsed as Record<string, unknown>;
  const valid = new Set(needs.map((n) => n.id));
  const cells = new Set<NeedQuadrantCell>([
    "high_importance_high_gap",
    "high_importance_low_gap",
    "low_importance_high_gap",
    "low_importance_low_gap",
  ]);
  const signalSet = new Set<NeedSignalId>([
    "workaround",
    "frequency",
    "pain",
    "breadth",
    "gap",
  ]);

  const selections: CoreNeedSelectionItem[] = [];
  const used = new Set<string>();
  if (Array.isArray(o.selections)) {
    for (const item of o.selections) {
      if (!item || typeof item !== "object") continue;
      const s = item as Record<string, unknown>;
      const needId = String(s.needId ?? "").trim();
      if (!valid.has(needId) || used.has(needId)) continue;
      used.add(needId);
      const cellRaw = String(s.cell ?? "high_importance_high_gap");
      const cell = cells.has(cellRaw as NeedQuadrantCell)
        ? (cellRaw as NeedQuadrantCell)
        : "high_importance_high_gap";
      const signals = Array.isArray(s.signals)
        ? s.signals
            .filter((x): x is string => typeof x === "string")
            .map((x) => x.trim())
            .filter((x): x is NeedSignalId => signalSet.has(x as NeedSignalId))
        : [];
      const rationale = sanitizeCoachKoreanText(
        String(s.rationale ?? "").trim(),
      ).slice(0, 200);
      selections.push({
        needId,
        cell,
        signals: signals.length ? signals : ["pain", "gap"],
        rationale:
          rationale ||
          "문제·Pain·반복 패턴을 종합해 핵심 후보로 골랐어요",
      });
      if (selections.length >= CORE_NEED_LIMIT) break;
    }
  }

  if (selections.length === 0) return null;

  const coreSet = new Set(selections.map((s) => s.needId));
  const placements: CoreNeedPlacement[] = [];
  const placedIds = new Set<string>();

  const pushPlacement = (
    needId: string,
    cell: NeedQuadrantCell,
    signals: NeedSignalId[],
  ) => {
    if (!valid.has(needId) || placedIds.has(needId)) return;
    placedIds.add(needId);
    placements.push({
      needId,
      cell: coreSet.has(needId) ? "high_importance_high_gap" : cell,
      signals: signals.length ? signals : coreSet.has(needId) ? ["pain", "gap"] : [],
    });
  };

  if (Array.isArray(o.placements)) {
    for (const item of o.placements) {
      if (!item || typeof item !== "object") continue;
      const p = item as Record<string, unknown>;
      const needId = String(p.needId ?? "").trim();
      const cellRaw = String(p.cell ?? "low_importance_low_gap");
      const cell = cells.has(cellRaw as NeedQuadrantCell)
        ? (cellRaw as NeedQuadrantCell)
        : "low_importance_low_gap";
      const signals = Array.isArray(p.signals)
        ? p.signals
            .filter((x): x is string => typeof x === "string")
            .map((x) => x.trim())
            .filter((x): x is NeedSignalId => signalSet.has(x as NeedSignalId))
        : [];
      pushPlacement(needId, cell, signals);
    }
  }

  for (const s of selections) {
    pushPlacement(s.needId, s.cell, s.signals);
  }

  const maxPark = Math.max(0, Math.floor(needs.length * 0.15));
  let parkedNeedIds = Array.isArray(o.parkedNeedIds)
    ? o.parkedNeedIds
        .filter((id): id is string => typeof id === "string")
        .map((id) => id.trim())
        .filter((id) => valid.has(id) && !coreSet.has(id) && !placedIds.has(id))
        .slice(0, maxPark)
    : [];

  // 누락분 → 보류가 아니라 사분면(낮은 셀)에 배치
  for (const n of needs) {
    if (placedIds.has(n.id) || parkedNeedIds.includes(n.id)) continue;
    pushPlacement(n.id, "low_importance_low_gap", []);
  }

  return { selections, placements, parkedNeedIds };
}

function toHeuristicData(needs: NeedInput[]): Stage5LatentNeedsData {
  const subjects = [
    ...new Map(
      needs.map((n) => [
        n.subjectId || "unknown",
        {
          id: n.subjectId || "unknown",
          name: n.subjectId || "조사 대상",
          context: "",
          thumbnailUrl: "",
        },
      ]),
    ).values(),
  ];
  const postits = needs.map((n) => ({
    id: n.id,
    subjectId: n.subjectId || "unknown",
    kind: "latent_need" as const,
    text: n.text,
    readonly: false,
    linkedSourceIds: [],
  }));
  // 그룹 힌트
  const groupMap = new Map<string, string[]>();
  for (const n of needs) {
    const key = n.groupName || "__none__";
    if (!groupMap.has(key)) groupMap.set(key, []);
    groupMap.get(key)!.push(n.id);
  }
  const needGroups = [...groupMap.keys()].map((name, i) => ({
    id: `g-${i}`,
    name: name === "__none__" ? "그룹" : name,
    order: i,
  }));
  const needGroupMemberIds: Record<string, string[]> = {};
  needGroups.forEach((g, i) => {
    const key = [...groupMap.keys()][i]!;
    needGroupMemberIds[g.id] = groupMap.get(key) ?? [];
  });

  return {
    subjects,
    postits,
    stage4SyncedAt: "",
    kevinGeneratedAt: "",
    journeyStepNeedIds: {},
    workflowPhase: "core_selection",
    needGroups,
    needGroupMemberIds,
    needRatings: {},
    coreNeedIds: [],
    parkedNeedIds: [],
    selectionRationales: {},
  };
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
  const problem = String(record.problem ?? "").trim().slice(0, 2000);
  const painPoints = parseStringList(record.painPoints, 40);
  const needs = parseNeeds(record.needs);

  if (!projectId || needs.length === 0) {
    return NextResponse.json({ error: "필수 값이 없습니다." }, { status: 400 });
  }

  const access = await fetchProjectAccess(projectId);
  if (!access) {
    return NextResponse.json(
      { error: "프로젝트 접근 권한이 없습니다." },
      { status: 403 },
    );
  }

  const heuristic = () =>
    heuristicSelectCoreNeeds(toHeuristicData(needs), problem, painPoints);

  if (!resolveGroqApiKey()) {
    return NextResponse.json({ ...heuristic(), source: "heuristic" });
  }

  try {
    const result = await groqComplete(
      buildPrompt(problem, painPoints, needs),
      {
        models: resolveGroqTextModels(),
        temperature: 0.35,
        jsonMode: true,
      },
    );
    const jsonMatch = result.text.trim().match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]) as unknown;
      const normalized = normalizeResult(parsed, needs);
      if (normalized && normalized.selections.length > 0) {
        return NextResponse.json({ ...normalized, source: "groq" });
      }
    }
  } catch (error) {
    console.error("[select-core-needs]", error);
  }

  return NextResponse.json({ ...heuristic(), source: "heuristic_fallback" });
}
