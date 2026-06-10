/** 포스트잇 카드 래퍼 — 가로 2배 확대 크기 */
export const POSTIT_SHELL_WIDTH =
  "w-[clamp(10.4rem,100%,13.5rem)] shrink-0";

/** id에 포함된 타임스탬프로 생성 순 정렬 */
export function postitSortKey(id: string): number {
  const match = id.match(/(\d{10,})/);
  return match ? Number(match[1]) : 0;
}
