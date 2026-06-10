import type { Provider } from "@supabase/supabase-js";

/** Supabase Dashboard에서 활성화할 OAuth 제공자 */
export type SocialAuthProviderId = "google" | "kakao" | "naver";

export type SocialAuthProvider = {
  id: SocialAuthProviderId;
  label: string;
  /** signInWithOAuth provider 인자 */
  supabaseProvider: Provider;
  /** 카카오는 이메일 scope 권장 (Dashboard 동의항목과 맞출 것) */
  scopes?: string;
};

/**
 * 네이버: Supabase Auth → Custom OAuth2 provider
 * 식별자 `custom:naver` · Authorization/Token/UserInfo는 네이버 개발자센터 문서 기준
 */
export const SOCIAL_AUTH_PROVIDERS: SocialAuthProvider[] = [
  {
    id: "google",
    label: "Google",
    supabaseProvider: "google",
  },
  {
    id: "kakao",
    label: "카카오",
    supabaseProvider: "kakao",
    scopes: "account_email profile_nickname",
  },
  {
    id: "naver",
    label: "네이버",
    supabaseProvider: "custom:naver",
  },
];

export function getSocialAuthProvider(
  id: SocialAuthProviderId,
): SocialAuthProvider {
  const provider = SOCIAL_AUTH_PROVIDERS.find((p) => p.id === id);
  if (!provider) throw new Error(`Unknown auth provider: ${id}`);
  return provider;
}
