import { NextResponse } from "next/server";
import { safeNextPath } from "@/lib/auth/safeNextPath";
import { syncUserProfileAfterAuth } from "@/lib/auth/syncUserProfileAfterAuth";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));
  const markVerified = searchParams.get("verified") === "1";

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=auth&message=${encodeURIComponent("인증 코드가 없어요.")}`,
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=auth&message=${encodeURIComponent(error.message)}`,
    );
  }

  await syncUserProfileAfterAuth(supabase);

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
}
