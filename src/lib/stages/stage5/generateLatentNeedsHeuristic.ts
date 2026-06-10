export interface SubjectLatentInput {
  subjectId: string;
  name: string;
  quotes: string[];
  observations: string[];
}

export function heuristicLatentNeedsForSubject(
  input: SubjectLatentInput,
): string[] {
  const label = input.name.trim() || "조사 대상";
  const out: string[] = [];

  if (input.quotes.length > 0) {
    const q = input.quotes[0]!.slice(0, 80);
    out.push(
      `${label}님이 「${q}」라고 한 말 뒤에, 더 깊은 불편·욕구가 있을 수 있어요.`,
    );
  }

  if (input.observations.length > 0) {
    const o = input.observations[0]!.slice(0, 80);
    out.push(
      `관찰 「${o}」에서 보이는 반복 패턴이 잠재 니즈 단서일 수 있어요.`,
    );
  }

  if (input.quotes.length > 1) {
    out.push(
      `${label}님의 여러 발화를 묶어 보면, 아직 말로 드러나지 않은 기대가 있을 수 있어요.`,
    );
  }

  if (out.length === 0) {
    out.push(
      `${label}님에 대한 언급·관찰이 쌓이면 잠재 니즈를 더 구체화할 수 있어요.`,
    );
  }

  return out.slice(0, 3);
}
