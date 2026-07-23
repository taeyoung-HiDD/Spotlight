/** 포스트잇 카드 래퍼 — 4·5단계 보드 기준 크기 (최대 13.5rem) */
export const POSTIT_SHELL_WIDTH =
  "w-[clamp(10.4rem,100%,13.5rem)] shrink-0";

/** 5단계 니즈 분석 — 기준의 약 75% (최대 10.125rem) */
export const POSTIT_SHELL_WIDTH_STAGE5 =
  "w-[clamp(7.8rem,100%,10.125rem)] shrink-0";

/** HMW 페어 카드 안 포스트잇 — 기준(13.5rem)의 75%, 동일 고정 크기 */
export const POSTIT_SHELL_WIDTH_HMW_PAIR =
  "w-[clamp(7.8rem,100%,10.125rem)] shrink-0";

/** id에 포함된 타임스탬프로 생성 순 정렬 */
export function postitSortKey(id: string): number {
  const match = id.match(/(\d{10,})/);
  return match ? Number(match[1]) : 0;
}
