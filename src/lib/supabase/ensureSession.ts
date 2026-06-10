import type { SupabaseClient } from "@supabase/supabase-js";

const AUTH_HELP =
  [
    "로그인 세션이 필요합니다. 아래 중 하나를 진행해 주세요.",
    "",
    "【권장】 Supabase Dashboard → Authentication → Sign In / Providers",
    "  → Anonymous Sign-Ins → Enable",
    "",
    "【또는】 개발용 계정 (.env.local)",
    "  NEXT_PUBLIC_DEV_AUTH_EMAIL=you@example.com",
    "  NEXT_PUBLIC_DEV_AUTH_PASSWORD=8자리이상비밀번호",
    "  (Auth에서 이메일 확인 끄거나, 가입 후 메일 인증)",
    "",
    "설정 후 npm run dev 재시작",
  ].join("\n");

/**
 * 프로젝트 생성 등 RLS 작업 전에 auth.uid() 세션을 확보합니다.
 */
export async function ensureAuthSession(
  supabase: SupabaseClient,
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user?.id) return user.id;

  const devEmail = process.env.NEXT_PUBLIC_DEV_AUTH_EMAIL?.trim();
  const devPassword = process.env.NEXT_PUBLIC_DEV_AUTH_PASSWORD?.trim();

  if (devEmail && devPassword) {
    const { data: signInData, error: signInError } =
      await supabase.auth.signInWithPassword({
        email: devEmail,
        password: devPassword,
      });

    if (signInData.user?.id) return signInData.user.id;

    if (
      signInError &&
      !signInError.message.toLowerCase().includes("invalid login credentials")
    ) {
      throw new Error(`${signInError.message}\n\n${AUTH_HELP}`);
    }

    const devDisplayName =
      process.env.NEXT_PUBLIC_DEV_AUTH_DISPLAY_NAME?.trim() ||
      devEmail.split("@")[0]?.trim() ||
      "개발자";

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: devEmail,
      password: devPassword,
      options: {
        data: { display_name: devDisplayName },
      },
    });

    if (signUpError) {
      throw new Error(
        `개발 계정 가입 실패: ${signUpError.message}\n\n${AUTH_HELP}`,
      );
    }

    if (signUpData.user?.id) return signUpData.user.id;

    const { data: retryData, error: retryError } =
      await supabase.auth.signInWithPassword({
        email: devEmail,
        password: devPassword,
      });

    if (retryData.user?.id) return retryData.user.id;

    throw new Error(
      `개발 계정 로그인 실패: ${retryError?.message ?? "세션을 만들 수 없습니다."}\n\n${AUTH_HELP}`,
    );
  }

  const { data: anonData, error: anonError } =
    await supabase.auth.signInAnonymously();

  if (anonError) {
    const hint =
      anonError.message.toLowerCase().includes("anonymous") ||
      anonError.message.toLowerCase().includes("disabled")
        ? "Anonymous sign-ins are disabled — Supabase에서 익명 로그인을 켜 주세요."
        : anonError.message;

    throw new Error(`${hint}\n\n${AUTH_HELP}`);
  }

  if (!anonData.user?.id) {
    throw new Error(`사용자 ID를 확인할 수 없습니다.\n\n${AUTH_HELP}`);
  }

  return anonData.user.id;
}
