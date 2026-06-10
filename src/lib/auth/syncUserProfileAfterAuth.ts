import type { SupabaseClient, User } from "@supabase/supabase-js";
import { DISPLAY_NAME_FALLBACK, resolveDisplayName } from "@/lib/users/displayName";

function oauthMetadataName(user: User): string | null {
  const meta = user.user_metadata ?? {};
  const candidates = [
    meta.display_name,
    meta.full_name,
    meta.name,
    meta.nickname,
    meta.preferred_username,
    meta.user_name,
  ];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) {
      return value.trim().slice(0, 16);
    }
  }
  return null;
}

/** OAuth·이메일 인증 직후 public.users.display_name 동기화 */
export async function syncUserProfileAfterAuth(
  supabase: SupabaseClient,
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  const { data: profile } = await supabase
    .from("users")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle<{ display_name: string | null }>();

  const existing = profile?.display_name?.trim();
  if (existing) return;

  const fromOAuth = oauthMetadataName(user);
  const resolved = fromOAuth || resolveDisplayName(user, null);
  if (!resolved || resolved === DISPLAY_NAME_FALLBACK) return;

  await supabase
    .from("users")
    .update({ display_name: resolved })
    .eq("id", user.id);
}
