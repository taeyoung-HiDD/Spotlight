"use client";

import { IconCheck, IconCopy, IconUsers } from "@tabler/icons-react";
import { useCallback, useEffect, useState } from "react";
import {
  getOrCreateProjectInvite,
  type ProjectInviteLink,
} from "@/lib/projects/invites";
import {
  stageCoachBtnPrimary,
  stageCoachBtnSecondary,
  stageCoachCaption,
  stagePanel,
} from "@/lib/stages/ui";

interface Stage1TeamInvitePanelProps {
  projectId: string;
  onContinue: () => void;
  disabled?: boolean;
}

/** 단계 1 · 팀 초대 링크 복사 + Hopes 단계로 진행 */
export function Stage1TeamInvitePanel({
  projectId,
  onContinue,
  disabled = false,
}: Stage1TeamInvitePanelProps) {
  const [invite, setInvite] = useState<ProjectInviteLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const link = await getOrCreateProjectInvite(projectId);
        if (!cancelled) setInvite(link);
      } catch (e) {
        if (!cancelled) {
          setError(
            e instanceof Error ? e.message : "초대 링크를 불러오지 못했습니다.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const handleCopy = useCallback(async () => {
    if (!invite?.inviteUrl) return;
    try {
      await navigator.clipboard.writeText(invite.inviteUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("클립보드에 복사하지 못했습니다. 링크를 직접 선택해 복사해 주세요.");
    }
  }, [invite?.inviteUrl]);

  return (
    <div className={stagePanel}>
      <div className="mb-3 flex items-center gap-2 text-foreground">
        <IconUsers className="size-5 text-gold" stroke={2} aria-hidden />
        <span className="text-[16px] font-semibold">팀원 초대</span>
      </div>
      <p className={`mb-4 ${stageCoachCaption}`}>
        링크를 받은 사람이 로그인 후 초대를 수락하면, 이 프로젝트에 합류해
        Hopes·Fears부터 함께 진행할 수 있어요.
      </p>

      {loading ? (
        <p className={stageCoachCaption}>초대 링크를 만드는 중…</p>
      ) : error ? (
        <p className="text-[16px] text-red-400/90">{error}</p>
      ) : invite ? (
        <div className="space-y-3">
          <div className="rounded-lg border border-border-warm bg-cream px-3 py-2.5">
            <p className="break-all text-[14px] leading-relaxed text-foreground">
              {invite.inviteUrl}
            </p>
          </div>
          <button
            type="button"
            disabled={disabled}
            onClick={() => void handleCopy()}
            className={`${stageCoachBtnSecondary} inline-flex w-full items-center justify-center gap-2`}
          >
            {copied ? (
              <IconCheck className="size-4" stroke={2} />
            ) : (
              <IconCopy className="size-4" stroke={2} />
            )}
            {copied ? "복사됨" : "초대 링크 복사"}
          </button>
          <p className={stageCoachCaption}>
            링크는 30일 동안 유효해요. 팀원이 먼저 참여해도 Hopes·Fears는 같이
            맞춰 가면 돼요.
          </p>
        </div>
      ) : null}

      <button
        type="button"
        disabled={disabled || loading}
        onClick={onContinue}
        className={`${stageCoachBtnPrimary} mt-5 w-full`}
      >
        다음으로 진행하기 →
      </button>
    </div>
  );
}
