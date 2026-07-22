import { NextResponse } from "next/server";
import { safeNextPath } from "@/lib/auth/safeNextPath";
import { syncUserProfileAfterAuth } from "@/lib/auth/syncUserProfileAfterAuth";
import { createClient } from "@/lib/supabase/server";

function loginErrorRedirect(origin: string, message: string) {
  return NextResponse.redirect(
    `${origin}/login?error=auth&message=${encodeURIComponent(message)}`,
  );
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));
  const markVerified = searchParams.get("verified") === "1";

  if (!code) {
    return loginErrorRedirect(origin, "인증 코드가 없어요. 다시 로그인해 주세요.");
  }

  try {
    const supabase = await createClient();

    // createServerClient는 skipAutoInitialize — 교환 전 명시적으로 초기화
    await supabase.auth.initialize();

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      return loginErrorRedirect(origin, error.message);
    }

    try {
      await syncUserProfileAfterAuth(supabase);
    } catch {
      // 프로필 동기화 실패해도 로그인은 완료된 상태 — 홈으로 보냄
    }

    const redirectPath = markVerified
      ? `/login?verified=1&next=${encodeURIComponent(next)}`
      : next;

    const forwardedHost = request.headers.get("x-forwarded-host");
    const isLocalEnv = process.env.NODE_ENV === "development";

    if (isLocalEnv) {
      return NextResponse.redirect(`${origin}${redirectPath}`);
    }
    if (forwardedHost) {
      return NextResponse.redirect(`https://${forwardedHost}${redirectPath}`);
    }
    return NextResponse.redirect(`${origin}${redirectPath}`);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "로그인 처리 중 오류가 났어요.";
    return loginErrorRedirect(origin, message);
  }
}
