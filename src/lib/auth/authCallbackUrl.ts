import { safeNextPath } from "@/lib/auth/safeNextPath";

type AuthCallbackOptions = {
  /** 이메일 인증 완료 후 로그인 화면에 안내 표시 */
  markVerified?: boolean;
};

/** 이메일 인증·OAuth 완료 후 돌아올 콜백 URL */
export function buildAuthCallbackUrl(
  origin: string,
  nextPath?: string | null,
  options?: AuthCallbackOptions,
): string {
  const next = safeNextPath(nextPath);
  const url = new URL("/auth/callback", origin);
  url.searchParams.set("next", next);
  if (options?.markVerified) {
    url.searchParams.set("verified", "1");
  }
  return url.toString();
}
