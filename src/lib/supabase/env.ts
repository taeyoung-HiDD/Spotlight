export type SupabasePublicEnv = {
  url: string;
  anonKey: string;
};

/**
 * Supabase 공개 환경 변수.
 * 클라이언트 번들에는 `process.env.NEXT_PUBLIC_*` 정적 참조만 인라인됩니다.
 * (동적 `process.env[name]` 접근은 브라우저에서 항상 undefined)
 */
export function getSupabaseEnv(): SupabasePublicEnv {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url || !anonKey) {
    const missing = [
      !url && "NEXT_PUBLIC_SUPABASE_URL",
      !anonKey && "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    ].filter(Boolean) as string[];

    throw new Error(
      [
        "Supabase 환경 변수가 비어 있거나 로드되지 않았습니다.",
        "",
        `누락: ${missing.join(", ")}`,
        "",
        "로컬: Spotlight/.env.local 에 아래 두 값을 넣고 npm run dev 를 다시 실행하세요.",
        "Vercel: 프로젝트 Settings → Environment Variables 에 동일한 이름으로 추가한 뒤 Redeploy 하세요.",
        "",
        "Supabase Dashboard → Project Settings → API",
        "  · Project URL  → NEXT_PUBLIC_SUPABASE_URL",
        "  · anon public  → NEXT_PUBLIC_SUPABASE_ANON_KEY",
      ].join("\n"),
    );
  }

  if (!url.startsWith("https://")) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL는 https:// 로 시작해야 합니다. (예: https://xxxx.supabase.co)",
    );
  }

  return { url, anonKey };
}
