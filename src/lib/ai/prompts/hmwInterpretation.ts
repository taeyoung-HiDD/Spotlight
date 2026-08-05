/** HMW 해석 레이어 — 문제 분해용 (해결책 금지) */
export function buildHmwInterpretationPrompt(input: {
  hmwText: string;
  latentNeedText?: string;
  subjectName?: string;
  evidenceLines: string[];
  rationaleLines: string[];
}): string {
  const evidence =
    input.evidenceLines.length > 0
      ? input.evidenceLines.map((l, i) => `${i + 1}. ${l}`).join("\n")
      : "(조사 발화 없음 — 일반 해석 허용, sourceEvidence 비움)";
  const rationales =
    input.rationaleLines.length > 0
      ? input.rationaleLines.map((l, i) => `${i + 1}. ${l}`).join("\n")
      : "(선별 근거 없음)";

  return `
당신은 디자인씽킹 코치 Kevin입니다. 아래 HMW를 **문제 해석**만 합니다. 아이디어·해결책을 제안하지 마세요.

HMW: ${input.hmwText.trim()}
잠재 니즈: ${input.latentNeedText?.trim() || "(없음)"}
추정 주체: ${input.subjectName?.trim() || "(생략됨 — who 슬롯에서 복원)"}

조사 데이터 (인용·관찰·잠재 니즈):
${evidence}

핵심 니즈 선별 근거:
${rationales}

슬롯 (문장에 없는 슬롯은 생략):
- who: 누가 (생략된 주체 복원·상태 구체화)
- object: 무엇 (대상 범위 갈래)
- outcome: 어떤 감정·결과 (추상어 갈래)
- direction: 어느 방향 (변화 동사 갈래)

규칙:
1. 슬롯당 해석 2~3개. 각 text는 짧은 명사구·절 (20자 내외 권장).
2. **금지**: 앱, 알림, 기능, 서비스, 자동화, 플랫폼, 시스템, 대시보드, 챗봇, 푸시, 솔루션, 소프트웨어, 프로토타입 등 해결책 명사.
3. 해석은 "~하는 것 / ~한 상태 / ~한 순간"처럼 문제·경험 언어만.
4. 조사 근거가 있으면 options[].sourceEvidence에 해당 줄 번호 또는 짧은 인용 조각.
5. slotLabel 예: "뿌듯함이란?", "번 돈이란?", "키운다란?"
6. JSON만 출력.

형식:
{"interpretations":[{"slot":"who"|"object"|"outcome"|"direction","slotLabel":"...","options":[{"id":"object-1","text":"...","sourceEvidence":"..."}]}]}
`.trim();
}
