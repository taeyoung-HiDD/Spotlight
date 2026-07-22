export interface SourceLatentInput {
  sourceId: string;
  subjectId: string;
  subjectName: string;
  kind: "quote" | "observation" | "finding";
  text: string;
}

const KIND_LABEL = {
  quote: "언급",
  observation: "관찰",
  finding: "발견",
} as const;

/** 조사 포스트잇 1장 → 잠재 니즈 초안 1문장 (오프라인·폴백) */
export function heuristicLatentNeedForSource(input: SourceLatentInput): string {
  const label = input.subjectName.trim() || "조사 대상";
  const kindLabel = KIND_LABEL[input.kind];
  const clip = input.text.trim().slice(0, 72);
  if (!clip) {
    return `${label}님의 ${kindLabel} 아래에 더 깊은 욕구·불편이 있을 수 있어요.`;
  }
  return `${label}님의 ${kindLabel} 「${clip}」 뒤에, 아직 말로 드러나지 않은 욕구·불편이 있을 수 있어요.`;
}
