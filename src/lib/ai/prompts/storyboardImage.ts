/** 무드 가이드 v3 — 스토리보드 일러스트 스타일 토큰 */
import { appendImageNoTextConstraint } from "@/lib/ai/prompts/imageNoTextConstraint";

const STYLE_TOKENS = `
- 차콜 선 (#2D2D2A), 흰 배경 (#FFFFFF), 노랑 강조 (#F4C430)
- 일관된 라인 일러스트, 평면·미니멀, 텍스트·워터마크 없음
- 한 컷 단일 장면, 스토리보드 패널 1장
`.trim();

export interface StoryboardImageInput {
  cutIndex: number;
  totalCuts?: number;
  conceptName: string;
  userNeed?: string;
  cutCaption: string;
  personaContext?: string;
  isFinale?: boolean;
}

export function buildStoryboardImagePrompt(input: StoryboardImageInput): string {
  const total = input.totalCuts ?? 5;
  const finale = input.isFinale ?? input.cutIndex === total;
  const needLine = input.userNeed?.trim()
    ? `사용자 니즈: ${input.userNeed.trim().slice(0, 400)}`
    : "";
  const personaLine = input.personaContext?.trim()
    ? `페르소나·맥락: ${input.personaContext.trim().slice(0, 500)}`
    : "";

  const body = `
DT Coach 스토리보드 일러스트 1컷을 생성하세요.

컨셉: ${input.conceptName.trim().slice(0, 120)}
${needLine}
${personaLine}
컷 ${input.cutIndex}/${total} 장면: ${input.cutCaption.trim().slice(0, 600)}
${finale ? "이 컷은 체험 도착점(클라이맥스) — 사용자가 니즈가 해소되는 순간을 강조하세요." : ""}

스타일:
${STYLE_TOKENS}

규칙:
- UI 목업이 아닌 스토리보드 일러스트
- 인물·상황·인터랙션·결과가 한 장면에 읽히게
- 노랑은 핵심 포인트(손·아이콘·강조 오브젝트)에만 소량 사용
- UI 슬롯(헤더·버튼·캡션 영역)은 비워 둔 채 레이아웃만 표현
`.trim();

  return appendImageNoTextConstraint(body);
}
