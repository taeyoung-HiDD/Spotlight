/** Kevin 생성 텍스트에서 (가설) 접두 표기 제거 */
export function cleanLatentNeedText(text: string): string {
  return text.replace(/^\(가설\)\s*/u, "").trim();
}
