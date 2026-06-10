"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  acceptProjectInvite,
  fetchInvitePreview,
  type InvitePreview,
} from "@/lib/projects/invites";
import {
  stageBtnPrimary,
  stageBtnSecondary,
  stageCaption,
  stagePanel,
  stageSectionTitle,
} from "@/lib/stages/ui";

interface InviteAcceptClientProps {
  token: string;
}

export function InviteAcceptClient({ token }: InviteAcceptClientProps) {
  const router = useRouter();
  const [preview, setPreview] = useState<InvitePreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = await fetchInvitePreview(token);
        if (!cancelled) setPreview(p);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "초대 정보를 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleAccept = useCallback(async () => {
    setAccepting(true);
    setError(null);
    try {
      const projectId = await acceptProjectInvite(token);
      router.replace(`/project/${projectId}/stage/1?joined=1`);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "초대 수락에 실패했습니다.",
      );
      setAccepting(false);
    }
  }, [token, router]);

  return (
    <main className="mx-auto flex min-h-[70vh] max-w-lg flex-col justify-center px-4 py-12">
      <div className={stagePanel}>
        <p className="mb-2 text-xs font-semibold tracking-wide text-gold uppercase">
          팀 초대
        </p>
        <h1 className={stageSectionTitle}>프로젝트에 참여하기</h1>

        {loading ? (
          <p className={`mt-4 ${stageCaption}`}>초대 정보를 확인하는 중…</p>
        ) : error && !preview ? (
          <p className="mt-4 text-sm text-red-400/90">{error}</p>
        ) : preview ? (
          <div className="mt-4 space-y-3">
            <p className={stageCaption}>
              <span className="font-semibold text-foreground">
                {preview.inviterName}
              </span>
              님이 「{preview.projectTitle}」 프로젝트에 초대했어요.
            </p>
            <div className="rounded-lg border border-border-warm bg-cream px-3 py-2.5">
              <p className="text-[11px] font-semibold tracking-wide text-subtle uppercase">
                출발 문제점
              </p>
              <p className="mt-1 text-sm leading-relaxed text-foreground break-keep">
                {preview.startingPoint}
              </p>
            </div>
            <p className={stageCaption}>
              수락하면 Hopes·Fears 단계부터 함께 진행할 수 있어요.
            </p>
          </div>
        ) : (
          <p className="mt-4 text-sm text-red-400/90">
            만료되었거나 유효하지 않은 초대 링크예요.
          </p>
        )}

        {error && preview ? (
          <p className="mt-3 text-sm text-red-400/90">{error}</p>
        ) : null}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          {preview ? (
            <button
              type="button"
              disabled={accepting}
              onClick={() => void handleAccept()}
              className={`${stageBtnPrimary} w-full sm:flex-1`}
            >
              {accepting ? "참여 중…" : "초대 수락하고 시작"}
            </button>
          ) : null}
          <Link
            href="/home"
            className={`${stageBtnSecondary} w-full text-center sm:flex-1`}
          >
            홈으로
          </Link>
        </div>
      </div>
    </main>
  );
}
