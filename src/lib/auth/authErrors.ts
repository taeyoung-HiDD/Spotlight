/** Supabase Auth 오류를 한국어 안내로 변환 */
export function formatAuthError(message: string, mode: "signin" | "signup"): string {
  const lower = message.toLowerCase();

  if (
    lower.includes("email not confirmed") ||
    lower.includes("email_not_confirmed")
  ) {
    return "이메일 인증이 아직 완료되지 않았어요. 메일함의 인증 링크를 눌러 주세요.";
  }

  if (lower.includes("invalid login credentials")) {
    return "이메일 또는 비밀번호가 맞지 않아요.";
  }

  if (lower.includes("user already registered")) {
    return "이미 가입된 이메일이에요. 로그인하거나 소셜 계정으로 시도해 보세요.";
  }

  if (lower.includes("signup requires a valid password")) {
    return "비밀번호는 8자 이상이어야 해요.";
  }

  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.";
  }

  if (mode === "signup" && lower.includes("email")) {
    return "이메일 주소를 확인해 주세요.";
  }

  return message;
}
