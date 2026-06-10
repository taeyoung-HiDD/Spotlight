/** 조사 대상 이름 → 원형 배지용 이니셜 (1자) */
export function subjectInitials(name: string, fallbackIndex = 0): string {
  const trimmed = name.trim();
  if (!trimmed) return String(fallbackIndex + 1);
  return trimmed[0]!.toUpperCase();
}

export function subjectDisplayLabel(
  name: string,
  fallbackIndex: number,
): string {
  return name.trim() || `조사 대상 ${fallbackIndex + 1}`;
}
