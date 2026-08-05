/** 선택 해석 → 문법에 맞는 하위 HMW 한 문장 */
export function buildHmwSubQuestionComposePrompt(input: {
  hmwText: string;
  selections: Array<{ slot: string; slotLabel: string; text: string }>;
}): string {
  const lines = input.selections
    .map((s) => `- [${s.slot}] ${s.slotLabel} → ${s.text}`)
    .join("\n");

  return `
당신은 디자인씽킹 코치입니다. 아래 원본 HMW와 사용자가 고른 **해석 조각**을 바탕으로,
조각을 이어 붙이지 말고 **자연스러운 한국어 HMW 한 문장**으로 다시 쓰세요.

원본 HMW:
${input.hmwText.trim()}

선택한 해석:
${lines}

규칙:
1. 형식: 「어떻게 하면 ~할 수 있을까?」 한 문장만.
2. 선택 해석의 의미를 모두 녹이되, 칩 문구를 그대로 나열하거나 「~하는 것에 대해 ~을(를)」처럼 붙이지 말 것.
3. 조사(이/가, 을/를, 에, 으로 등)와 호응을 문법에 맞게 쓸 것.
4. 선택하지 않은 슬롯은 지어내지 말 것. 원본 HMW의 열린 부분은 선택 해석으로만 좁힐 것.
5. 앱·알림·기능·서비스·자동화·플랫폼 등 해결책 명사 금지.
6. 따옴표·마크다운·설명 없이 문장만 출력.
`.trim();
}
