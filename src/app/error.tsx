"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-full flex-col items-center justify-center gap-4 bg-cream px-6 py-16 text-center">
      <h1 className="text-lg font-semibold text-foreground">
        화면을 불러오지 못했어요
      </h1>
      <p className="max-w-md text-sm text-muted break-keep">
        {error.message?.trim() || "잠시 후 다시 시도해 주세요."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-spotlight px-4 py-2 text-sm font-semibold text-on-spotlight"
      >
        다시 시도
      </button>
    </div>
  );
}
