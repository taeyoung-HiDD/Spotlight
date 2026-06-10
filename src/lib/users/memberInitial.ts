import { DISPLAY_NAME_FALLBACK } from "@/lib/users/displayName";

/** 팀원 아바타 이니셜 (한 글자) */
export function memberDisplayInitial(name: string): string {
  const t = name.trim();
  if (!t) return DISPLAY_NAME_FALLBACK.charAt(0);
  return t.charAt(0);
}
