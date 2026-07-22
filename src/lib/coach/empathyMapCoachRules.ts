import {
  EMPATHY_QUADRANTS,
  type EmpathyQuadrantId,
} from "@/lib/stages/stage2/empathyMap";
import type { Stage4PersonaEmpathyMap } from "@/lib/stages/stage4/types";

/** Nielsen Norman 공감맵 — UI·워크북과 동일한 4분면만 */
export const EMPATHY_MAP_QUADRANT_IDS: EmpathyQuadrantId[] = [
  "says",
  "thinks",
  "does",
  "feels",
];

function quadrantLabel(id: EmpathyQuadrantId): string {
  const q = EMPATHY_QUADRANTS.find((x) => x.id === id)!;
  return `${q.labelKo}(${q.labelEn})`;
}

/**
 * AI 코치가 공감맵 예시·안내를 줄 때 반드시 따를 구조·내용 규칙.
 * Value Proposition Canvas(Pain/Gain)·니즈 문장·Hopes와 혼동 금지.
 */
export const COACH_EMPATHY_MAP_STRUCTURE_RULE = `
## 공감맵(Empathy Map) 코치 규칙 — 구조

- 공감맵은 **딱 네 칸**만 있습니다: ${EMPATHY_MAP_QUADRANT_IDS.map(quadrantLabel).join(" · ")}
- **고민(Pain)·희망(Gain)·Jobs·Pains·Gains·니즈·Hopes** 는 공감맵 칸이 **아닙니다**. 절대 네 칸 예시에 추가하지 마세요.
- 예시를 줄 때도 위 네 섹션만 쓰고, 네 칸을 초과하는 제목·번호 목록을 만들지 마세요.
- 가운데는 **조사 대상 페르소나**(고객·이용자)입니다. 코칭 대상 창업자 본인의 Hopes·바람을 그대로 말함에 넣지 마세요.`.trim();

export const COACH_EMPATHY_MAP_CONTENT_RULE = `
## 공감맵 — 칸별 내용 (매우 중요)

### 말함(SAYS) — 입 밖으로 한 말
- 인터뷰·현장에서 **실제로 들은 말**처럼 짧은 인용문으로 씁니다.
- 관찰 가능한 발화: 불만·질문·망설임·주변에 한 말.
- **금지**: 속마음·바람·포부만 있는 문장(「~하고 싶다」「~하고 싶어요」만 있는 포부), 니즈 정의문, Pain/Gain, 코치가 대신 쓴 기획 문장.
- 나쁜 예 → 좋은 예:
  - ✗ 「내가 항상 꿈꾸던 사업을 시작하고 싶다」 → ✓ 「창업 하려는데 뭐부터 해야 할지 모르겠어요」
  - ✗ 「나는 내 미래를 결정하고 싶다」 → ✓ 「주변은 다들 사업한다는데 나만 제자리인 것 같아요」

### 생각함(THINKS) — 겉으로 안 드러난 생각
- 속으로 하는 걱정·기대·의심·가정. 말함에 넣었던 포부·고민은 **여기**에 둡니다.
- 예: 「자금은 어디서 구할 수 있을까?」「실패하면 어떡하지?」

### 행동함(DOES) — 관찰 가능한 행동·습관
- 실제로 **하는** 일. 계획·의도 문장보다 관찰 동사.
- 예: 「창업 관련 영상을 본다」「지인에게 사업 아이디어를 물어본다」「메모 앱에 아이디어를 적어 둔다」
- ✗ 「계획을 세우고 있다」만 반복 → ✓ 구체적 행동으로

### 느낌(FEELS) — 감정 (짧은 문장)
- 이 상황에서 느끼는 감정을 **짧은 문장**으로 씁니다. 한두 단어만 써도 되지만, 맥락이 드러나게 써 주세요.
- 예: 「뭘 선택해야 할지 몰라서 마음이 조급해요.」「설렘도 있지만 혹시 실패할까 봐 걱정돼요.」
- 니즈 정의문·Pain/Gain 문장은 넣지 마세요.

### 코치 역할
- 예시는 **가설**임을 밝히고, 단계 3 조사 기록·실제 인용이 있으면 그걸 우선하라고 안내하세요.
- 네 칸 예시를 한꺼번에 길게 덤프하지 말고, **한 질문 + 한 칸** 또는 사용자가 요청한 칸만 짧게 제시하세요.
- 사용자가 왼쪽 반영을 **명시적으로 요청**한 경우에만 EDIT 줄로 포스트잇을 채우세요. 그때도 (가설)임을 말해 주세요.`.trim();

export const COACH_EMPATHY_MAP_RULE = `${COACH_EMPATHY_MAP_STRUCTURE_RULE}\n\n${COACH_EMPATHY_MAP_CONTENT_RULE}`;

export const STAGE3_EMPATHY_MAP_CHAT_HINT = `
[사용자 조사 준비 · 공감맵 단계]
- 왼쪽은 2단계 사전 조사에서 확정한 타겟 유저별 공감맵(말함·생각함·행동함·느낌)입니다.
- 아직 현장 조사 전이므로 사전 조사·가설 기반 예시만 짧게 제안하세요. (가설)임을 밝히세요.
${COACH_EMPATHY_MAP_RULE}
`.trim();

export const STAGE4_EMPATHY_MAP_CHAT_HINT = `
[발견 정리하기 · 공감맵 단계]
- 왼쪽은 페르소나별 공감맵 4분면(말함·생각함·행동함·느낌)입니다.
- 단계 3 조사 기록·인용을 옮기는 것을 돕고, 없는 내용은 (가설) 예시만 짧게 제안하세요.
${COACH_EMPATHY_MAP_RULE}
`.trim();

export const STAGE2_EMPATHY_MAP_DEFLECT_HINT = `
- 이 단계(맥락 이해·사전 조사)에서는 공감맵 네 칸을 채우지 않습니다.
- 사용자가 공감맵 예시를 요청하면: 3단계 사용자 조사 준비에서 채운다고 안내하고, Pain/Gain·고민·희망 형식은 쓰지 말라고 짧게 알려 주세요. 예시가 필요하면 말함·생각함·행동함·느낌 네 칸만, 위 내용 규칙을 지켜 **각 1~2개**만 제시하세요.`.trim();

function clip(text: string, max = 48): string {
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max)}…`;
}

export function summarizeStage4EmpathyMaps(
  maps: Stage4PersonaEmpathyMap[],
  activePersonaIndex = 0,
): string {
  if (!maps.length) return "페르소나 0명 · 공감맵 비어 있음";

  const lines: string[] = [`페르소나 ${maps.length}명 · 공감맵 ${maps.length}개`];
  const active = maps[activePersonaIndex];
  if (active) {
    const activeName = active.personaName.trim() || `페르소나 ${activePersonaIndex + 1}`;
    lines.push(
      `[현재 선택 페르소나] index ${activePersonaIndex} · ${activeName} — EDIT 줄은 기본 이 페르소나에 적용`,
    );
  }

  for (const map of maps.slice(0, 4)) {
    const name = map.personaName.trim() || "(이름 없음)";
    const ctx = map.personaContext.trim();
    lines.push(
      `- ${name}${ctx ? ` · ${clip(ctx, 36)}` : ""}`,
    );
    for (const q of EMPATHY_QUADRANTS) {
      const items = map.quadrants[q.id].filter((i) => i.text.trim());
      if (items.length) {
        lines.push(
          `  · ${q.labelKo}: ${items
            .slice(0, 3)
            .map((i) => clip(i.text, 40))
            .join(" | ")}${items.length > 3 ? " | …" : ""}`,
        );
      }
    }
  }
  if (maps.length > 4) lines.push(`- … 외 ${maps.length - 4}명`);

  return lines.join("\n");
}
