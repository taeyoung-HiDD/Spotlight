export interface SlotBackfillInput {
  stageId: number;
  stageTitle: string;
  slotKey: string;
  slotLabel: string;
  artifactSummary?: string;
  existingHint?: string;
}

export function buildSlotBackfillPrompt(input: SlotBackfillInput): string {
  const summary = input.artifactSummary?.trim()
    ? `프로젝트 산출물 요약:\n${input.artifactSummary.trim().slice(0, 3000)}`
    : "(산출물 요약 없음)";
  const hint = input.existingHint?.trim()
    ? `사용자가 남긴 힌트: ${input.existingHint.trim().slice(0, 500)}`
    : "";

  return `
당신은 DT Coach의 슬롯 백필 보조입니다.
빈 입력란에 들어갈 **가설** 초안을 한국어로 작성하세요.

단계: ${input.stageId} · ${input.stageTitle}
슬롯: ${input.slotLabel} (${input.slotKey})

${summary}
${hint}

규칙:
- 1~3문장 또는 2~4개 불릿(· 로 시작) 중 슬롯 성격에 맞게 선택
- 사실 단정 금지 — 가설·관찰·제안 톤
- 질문형·물음표 금지
- JSON만 출력: {"content":"..."}
`.trim();
}
