import { NextResponse } from "next/server";
import { resolveGroqApiKey, resolveGroqTextModels } from "@/lib/ai/env";
import { groqComplete } from "@/lib/ai/providers/groqText";
import { COACH_SYSTEM_INSTRUCTION } from "@/lib/coach/systemInstruction";
import { fetchProjectAccess } from "@/lib/projects/projectAccess";
import { needToHmwDraft } from "@/lib/stages/stage7/hmwText";

interface HmwItemPayload {
  questionId: string;
  latentNeedText: string;
}

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

function buildPrompt(items: HmwItemPayload[]): string {
  const blocks = items.map((item, idx) => {
    return `[${idx + 1}] id=${item.questionId}
잠재 니즈: ${item.latentNeedText}`;
  });

  return `${COACH_SYSTEM_INSTRUCTION}

---
[지시]
아래 **잠재 니즈**마다 HMW(How Might We) 질문을 하나씩 만드세요.

규칙:
- 반드시 「어떻게 하면 ~하기 위해 ~할 수 있을까?」 형태로 씁니다.
  - 앞칸(~하기 위해): 목적·이유·제약 조건 (왜 / 어떤 조건에서)
  - 뒷칸(~할 수 있을까): 구체적 상태·행동 (무엇을) — 아이디어 단계에서 솔루션을 떠올릴 수 있을 만큼 구체적이어야 합니다.
- ✗ 단순형 금지: 「어떻게 하면 프라이빗한 공간을 선점할 수 있을까?」
- ✓ 구체형 예: 「어떻게 하면 부가적인 요청 없이도 알아서 카페에서 나만의 프라이빗한 공간을 쉽게 선점할 수 있을까?」
- 잠재 니즈가 「A하기 위해서 B하고 싶다」면 → 「어떻게 하면 A하기 위해 B할 수 있을까?」로 바꾸되, 맥락·제약을 살려 더 구체적으로 다듬습니다.
- 잠재 니즈를 그대로 복사하지 말고, 단정·솔루션 제시 없이 열린 질문만 씁니다.
- JSON만 출력합니다. 마크다운·설명 없음.

출력 형식:
{"items":[{"questionId":"...","hmwText":"..."}]}

잠재 니즈 목록:
${blocks.join("\n\n")}`;
}

function parseHmwJson(
  text: string,
): Array<{ questionId: string; hmwText: string }> | null {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  try {
    const parsed = JSON.parse(jsonMatch[0]) as {
      items?: Array<{ questionId?: string; hmwText?: string }>;
    };
    if (!Array.isArray(parsed.items)) return null;
    return parsed.items
      .map((item) => ({
        questionId: String(item.questionId ?? "").trim(),
        hmwText: String(item.hmwText ?? "").trim(),
      }))
      .filter((item) => item.questionId && item.hmwText);
  } catch {
    return null;
  }
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
      return NextResponse.json({ error: "접근 권한이 없습니다." }, { status: 403 });
    }

    if (!resolveGroqApiKey()) {
      return NextResponse.json({
        items: items.map((item) => ({
          questionId: item.questionId,
          hmwText: needToHmwDraft(item.latentNeedText),
        })),
        source: "heuristic",
      });
    }

    const result = await groqComplete(buildPrompt(items), {
      models: resolveGroqTextModels(),
      temperature: 0.4,
      jsonMode: true,
    });

    const parsed = parseHmwJson(result.text);
    if (!parsed?.length) {
      return NextResponse.json({
        items: items.map((item) => ({
          questionId: item.questionId,
          hmwText: needToHmwDraft(item.latentNeedText),
        })),
        source: "heuristic_fallback",
      });
    }

    const byId = new Map(parsed.map((item) => [item.questionId, item.hmwText]));
    return NextResponse.json({
      items: items.map((item) => ({
        questionId: item.questionId,
        hmwText:
          byId.get(item.questionId) ?? needToHmwDraft(item.latentNeedText),
      })),
      source: "groq",
      model: result.model,
    });
  } catch (e) {
    const message =
      e instanceof Error ? e.message : "HMW 질문 생성에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
