import { NextResponse } from "next/server";
import { resolveGroqApiKey, resolveGroqTextModels } from "@/lib/ai/env";
import { groqComplete } from "@/lib/ai/providers/groqText";
import { COACH_SYSTEM_INSTRUCTION } from "@/lib/coach/systemInstruction";
import { fetchProjectAccess } from "@/lib/projects/projectAccess";
import {
  buildHeuristicCandidates,
  evaluateHmwQualityRules,
  mergeQualityTips,
  pickBestHmwCandidate,
} from "@/lib/stages/stage7/hmwQualityChecklist";
import { needToHmwDraft } from "@/lib/stages/stage7/hmwText";
import type {
  HmwQualityTip,
  HmwQualityTipId,
  HmwVariationCandidate,
  HmwVariationKind,
} from "@/lib/stages/stage7/hmwTypes";

interface HmwItemPayload {
  questionId: string;
  latentNeedText: string;
}

interface GeneratedVariation {
  kind: HmwVariationKind;
  hmwText: string;
}

interface GeneratedItem {
  questionId: string;
  variations: GeneratedVariation[];
}

export interface SelectedHmwItem {
  questionId: string;
  hmwText: string;
  variationKind?: HmwVariationKind;
  qualityTips: HmwQualityTip[];
  candidates: HmwVariationCandidate[];
}

const KINDS: HmwVariationKind[] = [
  "amp_up",
  "remove_bad",
  "explore_opposite",
];

function parseItems(raw: unknown): HmwItemPayload[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && typeof item === "object")
    .map((item) => {
      const o = item as Record<string, unknown>;
      return {
        questionId: String(o.questionId ?? "").trim(),
        latentNeedText: String(o.latentNeedText ?? "").trim(),
      };
    })
    .filter((item) => item.questionId && item.latentNeedText);
}

function buildVariationPrompt(items: HmwItemPayload[]): string {
  const blocks = items.map((item, idx) => {
    return `[${idx + 1}] id=${item.questionId}
잠재 니즈: ${item.latentNeedText}`;
  });

  return `${COACH_SYSTEM_INSTRUCTION}

---
[지시]
아래 **잠재 니즈**마다 d.school HMW 변주 3가지를 각각 1개씩 만드세요.
코치 Kevin 톤: 정답을 단정하지 말고, 아이디어를 열어 주는 열린 질문만 씁니다.

변주 종류 (kind):
- amp_up (좋은 점 증폭): 니즈 안의 긍정적 요소를 더 키우는 방향
- remove_bad (나쁜 점 제거): 불편·장애를 없애는 방향이되, **긍정문**으로 쓰기 (줄이다/없애다 대신 늘리다·만들다·향상시키다)
- explore_opposite (반대 탐색): 통념을 뒤집어 보는 방향

형식 규칙:
- 반드시 「어떻게 하면 ~하기 위해 ~할 수 있을까?」 형태
- 솔루션·기능·앱 이름 암시 금지
- 잠재 니즈를 그대로 복사하지 말 것
- JSON만 출력. 마크다운·설명 없음

few-shot 예:
니즈: "사장님은 놓친 매출을 파악하기 위해 실시간 재고 현황을 알고 싶다"
→ amp_up: "어떻게 하면 놓친 매출을 파악하기 위해 실시간 재고 변화를 즐거운 확인 습관으로 만들 수 있을까?"
→ remove_bad: "어떻게 하면 매출 기회를 놓치지 않기 위해 재고 상태를 항상 또렷이 알 수 있을까?"
→ explore_opposite: "어떻게 하면 사장님이 직접 확인하지 않아도 매대가 재고 변화를 스스로 알려 줄 수 있을까?"

출력 형식:
{"items":[{"questionId":"...","variations":[{"kind":"amp_up","hmwText":"..."},{"kind":"remove_bad","hmwText":"..."},{"kind":"explore_opposite","hmwText":"..."}]}]}

잠재 니즈 목록:
${blocks.join("\n\n")}`;
}

function buildQualityPrompt(
  rows: Array<{
    questionId: string;
    kind: HmwVariationKind;
    latentNeedText: string;
    hmwText: string;
  }>,
): string {
  const blocks = rows
    .map(
      (r, i) =>
        `[${i + 1}] questionId=${r.questionId} kind=${r.kind}
니즈: ${r.latentNeedText}
HMW: ${r.hmwText}`,
    )
    .join("\n\n");

  return `${COACH_SYSTEM_INSTRUCTION}

---
[지시]
각 HMW를 NN/g 5-Tip으로 점검하세요. Kevin 톤: "틀렸다" 금지. warn일 때만 짧은 note로 「이렇게 바꾸면 아이디어가 더 나와요」식 제안.

팁 id:
1 니즈·인사이트 근거
2 원하는 결과 초점
3 긍정문
4 적정 범위
5 솔루션 비암시

JSON만:
{"reviews":[{"questionId":"...","kind":"amp_up","tips":[{"id":1,"status":"pass"},{"id":2,"status":"warn","note":"..."},{"id":3,"status":"pass"},{"id":4,"status":"pass"},{"id":5,"status":"pass"}]}]}

점검 대상:
${blocks}`;
}

function parseVariationKind(raw: unknown): HmwVariationKind | null {
  const v = String(raw ?? "").trim();
  return KINDS.includes(v as HmwVariationKind)
    ? (v as HmwVariationKind)
    : null;
}

function parseVariationJson(text: string): GeneratedItem[] | null {
  const jsonMatch = text.trim().match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      items?: Array<{
        questionId?: string;
        variations?: Array<{ kind?: string; hmwText?: string }>;
        hmwText?: string;
      }>;
    };
    if (!Array.isArray(parsed.items)) return null;
    const items: GeneratedItem[] = [];
    for (const item of parsed.items) {
      const questionId = String(item.questionId ?? "").trim();
      if (!questionId) continue;
      const variations: GeneratedVariation[] = [];
      if (Array.isArray(item.variations)) {
        for (const v of item.variations) {
          const kind = parseVariationKind(v.kind);
          const hmwText = String(v.hmwText ?? "").trim();
          if (kind && hmwText) variations.push({ kind, hmwText });
        }
      }
      // 구형식 호환: 단일 hmwText면 amp_up으로 취급
      if (variations.length === 0 && item.hmwText) {
        const hmwText = String(item.hmwText).trim();
        if (hmwText) variations.push({ kind: "amp_up", hmwText });
      }
      if (variations.length > 0) items.push({ questionId, variations });
    }
    return items.length > 0 ? items : null;
  } catch {
    return null;
  }
}

function parseQualityJson(
  text: string,
): Map<string, HmwQualityTip[]> {
  const out = new Map<string, HmwQualityTip[]>();
  const jsonMatch = text.trim().match(/\{[\s\S]*\}/);
  if (!jsonMatch) return out;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      reviews?: Array<{
        questionId?: string;
        kind?: string;
        tips?: Array<{ id?: number; status?: string; note?: string }>;
      }>;
    };
    if (!Array.isArray(parsed.reviews)) return out;
    for (const review of parsed.reviews) {
      const questionId = String(review.questionId ?? "").trim();
      const kind = parseVariationKind(review.kind);
      if (!questionId || !kind || !Array.isArray(review.tips)) continue;
      const tips = review.tips
        .map((t) => {
          const id = Number(t.id);
          if (![1, 2, 3, 4, 5].includes(id)) return null;
          const status = t.status === "warn" ? "warn" : "pass";
          const note = String(t.note ?? "").trim();
          return {
            id: id as HmwQualityTipId,
            status: status as "pass" | "warn",
            ...(note ? { note } : {}),
          } satisfies HmwQualityTip;
        })
        .filter((t): t is HmwQualityTip => t !== null);
      out.set(`${questionId}:${kind}`, tips);
    }
  } catch {
    return out;
  }
  return out;
}

function heuristicSelected(item: HmwItemPayload): SelectedHmwItem {
  const draft = needToHmwDraft(item.latentNeedText);
  const candidates = buildHeuristicCandidates(item.latentNeedText, draft);
  const best = pickBestHmwCandidate(candidates)!;
  return {
    questionId: item.questionId,
    hmwText: best.text,
    variationKind: best.kind,
    qualityTips: best.tips,
    candidates,
  };
}

function toCandidates(
  item: HmwItemPayload,
  variations: GeneratedVariation[],
  llmTipsByKey: Map<string, HmwQualityTip[]>,
): HmwVariationCandidate[] {
  const byKind = new Map<HmwVariationKind, string>();
  for (const v of variations) {
    if (!byKind.has(v.kind)) byKind.set(v.kind, v.hmwText);
  }
  // 빠진 kind는 휴리스틱으로 채움
  const draft = needToHmwDraft(item.latentNeedText);
  for (const kind of KINDS) {
    if (!byKind.has(kind)) byKind.set(kind, draft);
  }

  return KINDS.map((kind) => {
    const text = byKind.get(kind)!;
    const ruleTips = evaluateHmwQualityRules(text, item.latentNeedText);
    const llmTips = llmTipsByKey.get(`${item.questionId}:${kind}`) ?? [];
    return {
      kind,
      text,
      tips: mergeQualityTips(ruleTips, llmTips),
    };
  });
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      projectId?: string;
      items?: unknown;
    };
    const projectId = String(body.projectId ?? "").trim();
    const items = parseItems(body.items);

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId가 필요합니다." },
        { status: 400 },
      );
    }
    if (items.length === 0) {
      return NextResponse.json(
        { error: "변환할 잠재 니즈가 없습니다." },
        { status: 400 },
      );
    }

    const access = await fetchProjectAccess(projectId);
    if (!access) {
      return NextResponse.json(
        { error: "접근 권한이 없습니다." },
        { status: 403 },
      );
    }

    if (!resolveGroqApiKey()) {
      return NextResponse.json({
        items: items.map(heuristicSelected),
        source: "heuristic",
      });
    }

    let generated: GeneratedItem[] | null = null;
    let model: string | undefined;
    try {
      const result = await groqComplete(buildVariationPrompt(items), {
        models: resolveGroqTextModels(),
        temperature: 0.45,
        jsonMode: true,
      });
      model = result.model;
      generated = parseVariationJson(result.text);
    } catch {
      generated = null;
    }

    if (!generated?.length) {
      return NextResponse.json({
        items: items.map(heuristicSelected),
        source: "heuristic_fallback",
      });
    }

    const byQuestion = new Map(
      generated.map((g) => [g.questionId, g.variations] as const),
    );

    // 2차 LLM 품질 점검 (배치)
    const reviewRows: Array<{
      questionId: string;
      kind: HmwVariationKind;
      latentNeedText: string;
      hmwText: string;
    }> = [];
    for (const item of items) {
      const variations = byQuestion.get(item.questionId) ?? [];
      for (const v of variations) {
        reviewRows.push({
          questionId: item.questionId,
          kind: v.kind,
          latentNeedText: item.latentNeedText,
          hmwText: v.hmwText,
        });
      }
    }

    let llmTipsByKey = new Map<string, HmwQualityTip[]>();
    if (reviewRows.length > 0) {
      try {
        const qualityResult = await groqComplete(
          buildQualityPrompt(reviewRows),
          {
            models: resolveGroqTextModels(),
            temperature: 0.25,
            jsonMode: true,
          },
        );
        llmTipsByKey = parseQualityJson(qualityResult.text);
        model = qualityResult.model ?? model;
      } catch {
        llmTipsByKey = new Map();
      }
    }

    const selected: SelectedHmwItem[] = items.map((item) => {
      const variations = byQuestion.get(item.questionId);
      if (!variations?.length) return heuristicSelected(item);
      const candidates = toCandidates(item, variations, llmTipsByKey);
      const best = pickBestHmwCandidate(candidates);
      if (!best) return heuristicSelected(item);
      return {
        questionId: item.questionId,
        hmwText: best.text,
        variationKind: best.kind,
        qualityTips: best.tips,
        candidates,
      };
    });

    return NextResponse.json({
      items: selected,
      source: "groq",
      model,
    });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "HMW 질문 생성에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
