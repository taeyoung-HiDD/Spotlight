/**
 * Design Thinking Approach · Problem Statement(POV) 작성 원칙
 * Define 단계 — 사용자·니즈·맥락·인사이트 중심, 솔루션 비포함
 */

/** AI 프롬프트용 — problemStatement 필드 작성 규칙 */
export const DT_PROBLEM_STATEMENT_WRITING_RULE = `
problemStatement(문제 정의)는 Design Thinking Approach의 Problem Statement(POV) 원칙을 따르세요:
- **사용자 관점**: 누구(세그먼트·역할)가 겪는지 명시하세요. 우리·서비스·제품 관점이 아닌 사용자 관점으로 씁니다.
- **니즈 중심**: 사용자가 **무엇을 하려 하거나 필요로 하는지**를 적으세요. 앱·기능·제품·솔루션·기술 이름은 넣지 마세요.
- **맥락**: 언제·어디서·어떤 상황에서 문제가 일어나는지 짧게 포함하세요.
- **인사이트·이유**: 왜 중요한지, 어떤 어려움이 있는지(~때문에, ~하지 못해)를 연결하세요.
- **가설 명시**: 아직 검증 전이면 단정하지 말고 「~로 보여요」「~일 수 있어요」 등 가설 톤을 쓰세요.
- **열린 문제 정의**: 한 가지 해법으로 좁히지 말고, 이후 아이디어 단계로 이어질 여지를 남기세요.
- 한 줄 구조 권장: 「· [누구]가 [상황/맥락]에서 [니즈·어려움] — [왜 중요한지]」
- POV 문장 예: 「[사용자]는 [상황]에서 [필요·목표]가 필요해요. [인사이트/이유]」
`.trim();

/** 작업 화면·코치 안내용 짧은 설명 */
export const DT_PROBLEM_STATEMENT_BRIEF =
  "누구가, 어떤 상황에서, 무엇이 필요한지(니즈)와 왜 중요한지를 적어요. 솔루션·기능 이름은 넣지 않아요.";

/** 1단계 출발 입력 코치용 */
export const DT_PROBLEM_STATEMENT_CAPTURE_HINT =
  "사용자(누구)·상황(언제/어디)·니즈(무엇이 필요한지)·왜 중요한지를 알려 주세요. 아이디어·솔루션도 함께 적어도 괜찮아요.";

/** API·폴백용 — 1단계 입력을 POV 형식 가설로 정리 */
export function buildHeuristicProblemStatement(input: string): string {
  const raw = input.trim();
  if (!raw) {
    return [
      "· (가설) 어떤 사용자가 어떤 상황에서 어떤 니즈를 겪는지 현장 조사로 확인이 필요해요.",
      "· 왜 중요한지·누구에게 해당하는지는 아직 가설 단계예요.",
    ].join("\n");
  }

  const firstLine = raw.includes("\n")
    ? raw
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean)[0] ?? raw
    : raw;

  const clipped = firstLine.length > 120 ? `${firstLine.slice(0, 117)}…` : firstLine;

  return [
    `· (가설) ${clipped}`,
    "· 누구·어떤 맥락·왜 중요한지는 사용자 조사로 구체화할 필요가 있어요.",
    "· 솔루션보다 니즈와 상황에 초점을 맞춰 검증할 예정이에요.",
  ].join("\n");
}
