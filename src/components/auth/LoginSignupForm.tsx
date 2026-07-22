"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SocialAuthButtons } from "@/components/auth/SocialAuthButtons";
import { HiDDCoachBrand } from "@/components/brand/HiDDCoachBrand";
import { buildAuthCallbackUrl } from "@/lib/auth/authCallbackUrl";
import { formatAuthError } from "@/lib/auth/authErrors";
import { safeNextPath } from "@/lib/auth/safeNextPath";
import { createClient } from "@/lib/supabase/client";
import { stageBtnPrimary, stageField, stageLabel } from "@/lib/stages/ui";

type AuthMode = "signin" | "signup";
type FormPhase = "form" | "email_sent";

export function LoginSignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));

  const [mode, setMode] = useState<AuthMode>("signin");
  const [phase, setPhase] = useState<FormPhase>("form");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  useEffect(() => {
    const authError = searchParams.get("error");
    const authMessage = searchParams.get("message");
    if (authError === "auth" && authMessage) {
      // useSearchParams().get()은 이미 한 번 디코딩됨.
      // decodeURIComponent를 다시 치면 메시지에 '%'가 있을 때 URIError로
      // 로그인 화면 전체가 하얀 화면이 됩니다.
      setError(formatAuthError(authMessage, "signin"));
    }
    if (searchParams.get("verified") === "1") {
      setInfo("이메일 인증이 완료됐어요. 로그인해 주세요.");
    }
  }, [searchParams]);

  const resetMessages = () => {
    setError(null);
    setInfo(null);
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    const supabase = createClient();
    const trimmedEmail = email.trim();
    const trimmedName = displayName.trim();

    try {
      if (!trimmedName) {
        setError("이름을 입력해 주세요.");
        return;
      }
      if (trimmedName.length > 16) {
        setError("이름은 16자 이내로 입력해 주세요.");
        return;
      }
      if (password.length < 8) {
        setError("비밀번호는 8자 이상이어야 해요.");
        return;
      }

      const emailRedirectTo = buildAuthCallbackUrl(
        window.location.origin,
        nextPath,
        { markVerified: true },
      );

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: { display_name: trimmedName },
          emailRedirectTo,
        },
      });

      if (signUpError) {
        setError(formatAuthError(signUpError.message, "signup"));
        return;
      }

      if (data.user?.id) {
        await supabase
          .from("users")
          .update({ display_name: trimmedName })
          .eq("id", data.user.id);
      }

      if (data.session) {
        router.replace(nextPath);
        router.refresh();
        return;
      }

      setPhase("email_sent");
      setInfo(
        `${trimmedEmail}로 인증 메일을 보냈어요. 메일함(스팸함 포함)에서 링크를 눌러 인증을 완료한 뒤 로그인해 주세요.`,
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    resetMessages();
    setLoading(true);

    const supabase = createClient();

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInError) {
        setError(formatAuthError(signInError.message, "signin"));
        return;
      }

      router.replace(nextPath);
      router.refresh();
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("인증 메일을 다시 받을 이메일을 입력해 주세요.");
      return;
    }

    resetMessages();
    setResendLoading(true);

    try {
      const supabase = createClient();
      const emailRedirectTo = buildAuthCallbackUrl(
        window.location.origin,
        nextPath,
        { markVerified: true },
      );

      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email: trimmedEmail,
        options: { emailRedirectTo },
      });

      if (resendError) {
        setError(formatAuthError(resendError.message, "signup"));
        return;
      }

      setInfo("인증 메일을 다시 보냈어요. 메일함을 확인해 주세요.");
    } finally {
      setResendLoading(false);
    }
  };

  const handleSubmit = mode === "signup" ? handleEmailSignUp : handleEmailSignIn;

  return (
    <div className="mx-auto w-full max-w-md break-keep">
      <div className="mb-6 flex justify-center">
        <HiDDCoachBrand variant="light" href="/" />
      </div>

      <div
        data-mood="work"
        className="rounded-2xl border border-border-warm bg-panel p-6 sm:p-8"
      >
        <h1 className="mb-1 text-center text-[1.35rem] font-semibold tracking-[-0.02em] text-charcoal">
          {mode === "signup" ? "회원가입" : "로그인"}
        </h1>
        <p className="mb-6 text-center text-sm leading-relaxed text-muted">
          Google · 카카오 · 네이버 또는 이메일로 시작할 수 있어요.
        </p>

        <div className="mb-5 flex rounded-lg border border-border-warm bg-cream p-1">
          <button
            type="button"
            onClick={() => {
              setMode("signin");
              setPhase("form");
              resetMessages();
            }}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              mode === "signin"
                ? "bg-panel text-charcoal shadow-sm"
                : "text-muted hover:text-charcoal"
            }`}
          >
            로그인
          </button>
          <button
            type="button"
            onClick={() => {
              setMode("signup");
              setPhase("form");
              resetMessages();
            }}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors ${
              mode === "signup"
                ? "bg-panel text-charcoal shadow-sm"
                : "text-muted hover:text-charcoal"
            }`}
          >
            회원가입
          </button>
        </div>

        {phase === "email_sent" ? (
          <div className="space-y-4">
            {info ? (
              <p className="rounded-lg bg-cream px-4 py-3 text-sm leading-relaxed text-charcoal">
                {info}
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => void handleResendVerification()}
              disabled={resendLoading}
              className={`${stageBtnPrimary} w-full disabled:opacity-60`}
            >
              {resendLoading ? "보내는 중…" : "인증 메일 다시 받기"}
            </button>
            <button
              type="button"
              onClick={() => {
                setPhase("form");
                setMode("signin");
                resetMessages();
              }}
              className="w-full rounded-lg border border-border-warm px-4 py-3 text-sm font-medium text-charcoal transition-colors hover:bg-cream"
            >
              로그인으로 돌아가기
            </button>
          </div>
        ) : (
          <>
            <SocialAuthButtons
              nextPath={nextPath}
              disabled={loading}
              onError={setError}
            />

            <div className="my-5 flex items-center gap-3">
              <div className="h-px flex-1 bg-border-warm" aria-hidden />
              <span className="text-xs font-medium text-muted">이메일로 계속</span>
              <div className="h-px flex-1 bg-border-warm" aria-hidden />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" ? (
                <div>
                  <label htmlFor="displayName" className={stageLabel}>
                    이름
                  </label>
                  <input
                    id="displayName"
                    type="text"
                    autoComplete="name"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="코치가 부를 이름"
                    className={stageField}
                    required
                    maxLength={16}
                  />
                </div>
              ) : null}

              <div>
                <label htmlFor="email" className={stageLabel}>
                  이메일
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={stageField}
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className={stageLabel}>
                  비밀번호
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete={
                    mode === "signup" ? "new-password" : "current-password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === "signup" ? "8자 이상" : "비밀번호"}
                  className={stageField}
                  required
                  minLength={mode === "signup" ? 8 : undefined}
                />
              </div>

              {info ? (
                <p className="rounded-lg bg-cream px-3 py-2.5 text-sm leading-relaxed text-charcoal">
                  {info}
                </p>
              ) : null}

              {error ? (
                <div className="space-y-2">
                  <p className="text-sm text-red-600" role="alert">
                    {error}
                  </p>
                  {error.includes("이메일 인증") ? (
                    <button
                      type="button"
                      onClick={() => void handleResendVerification()}
                      disabled={resendLoading}
                      className="text-sm font-medium text-charcoal underline underline-offset-2 hover:text-gold"
                    >
                      {resendLoading ? "보내는 중…" : "인증 메일 다시 받기"}
                    </button>
                  ) : null}
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className={`${stageBtnPrimary} w-full disabled:opacity-60`}
              >
                {loading
                  ? "처리 중…"
                  : mode === "signup"
                    ? "이메일 인증 메일 받기"
                    : "이메일로 로그인"}
              </button>

              {mode === "signup" ? (
                <p className="text-center text-xs leading-relaxed text-muted">
                  가입하면 인증 메일이 발송됩니다. 인증 후 로그인할 수 있어요.
                </p>
              ) : null}
            </form>
          </>
        )}
      </div>

      <p className="mt-5 text-center text-sm text-muted">
        <Link href="/" className="transition-colors hover:text-charcoal">
          ← 랜딩으로
        </Link>
      </p>
    </div>
  );
}
