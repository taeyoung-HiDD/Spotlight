"use client";

import { useState } from "react";
import { buildAuthCallbackUrl } from "@/lib/auth/authCallbackUrl";
import { formatAuthError } from "@/lib/auth/authErrors";
import {
  getSocialAuthProvider,
  type SocialAuthProviderId,
} from "@/lib/auth/oauthProviders";
import { createClient } from "@/lib/supabase/client";

interface SocialAuthButtonsProps {
  nextPath: string;
  disabled?: boolean;
  onError?: (message: string) => void;
}

const BUTTON_STYLES: Record<
  SocialAuthProviderId,
  { className: string; icon: React.ReactNode }
> = {
  google: {
    className:
      "border border-border-warm bg-panel text-charcoal hover:bg-cream",
    icon: (
      <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="none">
        <path
          d="M21.6 12.227c0-.709-.064-1.39-.182-2.045H12v3.868h5.382a4.64 4.64 0 0 1-2.017 3.045v2.52h3.267c1.91-1.76 3.01-4.35 3.01-7.388Z"
          fill="#4285F4"
        />
        <path
          d="M12 22c2.7 0 4.964-.895 6.618-2.423l-3.267-2.52c-.895.6-2.04.955-3.351.955-2.573 0-4.755-1.736-5.536-4.073H2.49v2.6A9.996 9.996 0 0 0 12 22Z"
          fill="#34A853"
        />
        <path
          d="M6.464 13.936A5.99 5.99 0 0 1 6.05 12c0-.664.114-1.309.314-1.936V7.464H2.49A9.996 9.996 0 0 0 2 12c0 1.614.386 3.141 1.064 4.536l3.4-2.6Z"
          fill="#FBBC05"
        />
        <path
          d="M12 5.386c1.47 0 2.786.505 3.823 1.496l2.868-2.868C16.955 2.09 14.7 1 12 1 7.7 1 3.977 3.386 2.49 7.464l3.974 2.6C7.245 7.523 9.427 5.386 12 5.386Z"
          fill="#EA4335"
        />
      </svg>
    ),
  },
  kakao: {
    className: "bg-[#FEE500] text-[#191919] hover:opacity-95",
    icon: (
      <svg aria-hidden viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
        <path d="M12 3C6.48 3 2 6.58 2 11c0 2.84 1.87 5.33 4.68 6.78-.15-.55-.96-3.55.2-4.58.42-.35 1.1-.24 1.44.18.74.9 1.93 1.47 3.28 1.47 3.31 0 6-2.46 6-5.5S15.31 3 12 3Z" />
      </svg>
    ),
  },
  naver: {
    className: "bg-[#03C75A] text-white hover:opacity-95",
    icon: (
      <span
        aria-hidden
        className="flex h-5 w-5 items-center justify-center text-sm font-bold"
      >
        N
      </span>
    ),
  },
};

export function SocialAuthButtons({
  nextPath,
  disabled = false,
  onError,
}: SocialAuthButtonsProps) {
  const [loadingProvider, setLoadingProvider] =
    useState<SocialAuthProviderId | null>(null);

  const handleOAuth = async (providerId: SocialAuthProviderId) => {
    if (disabled || loadingProvider) return;
    setLoadingProvider(providerId);
    onError?.("");

    try {
      const provider = getSocialAuthProvider(providerId);
      const supabase = createClient();
      const redirectTo = buildAuthCallbackUrl(window.location.origin, nextPath);

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider.supabaseProvider,
        options: {
          redirectTo,
          ...(provider.scopes ? { scopes: provider.scopes } : {}),
        },
      });

      if (error) {
        onError?.(formatAuthError(error.message, "signin"));
        return;
      }

      if (data.url) {
        window.location.assign(data.url);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "소셜 로그인을 시작할 수 없어요.";
      onError?.(message);
    } finally {
      setLoadingProvider(null);
    }
  };

  return (
    <div className="space-y-2.5">
      {(["google", "kakao", "naver"] as const).map((id) => {
        const provider = getSocialAuthProvider(id);
        const style = BUTTON_STYLES[id];
        const isLoading = loadingProvider === id;

        return (
          <button
            key={id}
            type="button"
            disabled={disabled || Boolean(loadingProvider)}
            onClick={() => void handleOAuth(id)}
            className={`flex w-full items-center justify-center gap-2.5 rounded-lg px-4 py-3 text-sm font-semibold transition-opacity disabled:opacity-50 ${style.className}`}
          >
            {style.icon}
            <span>
              {isLoading ? "연결 중…" : `${provider.label}로 계속하기`}
            </span>
          </button>
        );
      })}
    </div>
  );
}
