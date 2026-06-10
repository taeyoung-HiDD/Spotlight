import type { SupabaseClient, User } from "@supabase/supabase-js";

export const DISPLAY_NAME_FALLBACK = "회원";

/** auth 메타·DB 프로필·이메일에서 호칭을 결정합니다. */
export function resolveDisplayName(
  authUser: User | null | undefined,
  profileDisplayName?: string | null,
): string {
  const fromDb = profileDisplayName?.trim();
  if (fromDb) return fromDb;

  const meta =
    (typeof authUser?.user_metadata?.display_name === "string"
      ? authUser.user_metadata.display_name.trim()
      : "") ||
    (typeof authUser?.user_metadata?.full_name === "string"
      ? authUser.user_metadata.full_name.trim()
      : "") ||
    (typeof authUser?.user_metadata?.name === "string"
      ? authUser.user_metadata.name.trim()
      : "") ||
    (typeof authUser?.user_metadata?.nickname === "string"
      ? authUser.user_metadata.nickname.trim()
      : "");
  if (meta) return meta;

  const emailPrefix = authUser?.email?.split("@")[0]?.trim();
  if (emailPrefix && !/^anon/i.test(emailPrefix)) return emailPrefix;

  return DISPLAY_NAME_FALLBACK;
}

/** 현재 세션 사용자의 호칭 (public.users 우선). */
export async function fetchUserDisplayName(
  supabase: SupabaseClient,
): Promise<string> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return DISPLAY_NAME_FALLBACK;

  const { data } = await supabase
    .from("users")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle<{ display_name: string | null }>();

  return resolveDisplayName(user, data?.display_name);
}
