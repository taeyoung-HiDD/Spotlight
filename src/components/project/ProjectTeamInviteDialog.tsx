"use client";

import { IconCheck, IconCopy, IconUsers, IconX } from "@tabler/icons-react";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import {
  buildInviteMailtoUrl,
  parseInviteEmailList,
} from "@/lib/projects/inviteEmail";
import {
  getOrCreateProjectInvite,
  type ProjectInviteLink,
} from "@/lib/projects/invites";
import {
  stageBtnPrimary,
  stageBtnSecondary,
  stageCaption,
  stageField,
  stageInput,
  stageLabel,
} from "@/lib/stages/ui";

interface ProjectTeamInviteDialogProps {
  open: boolean;
  projectId: string;
  projectTitle: string;
  onClose: () => void;
}

/** 프로젝트 허브 · 팀원 이메일 초대 + 링크 복사 */
export function ProjectTeamInviteDialog({
  open,
  projectId,
  projectTitle,
  onClose,
}: ProjectTeamInviteDialogProps) {
  const titleId = useId();
  const descId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [emailsRaw, setEmailsRaw] = useState("");
  const [invite, setInvite] = useState<ProjectInviteLink | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sentNotice, setSentNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEmailsRaw("");
    setInvite(null);
    setError(null);
    setCopied(false);
    setSentNotice(null);
    setLoading(true);
    let cancelled = false;
    void (async () => {
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
  }, [open, projectId]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !sending) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, sending, onClose]);

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

  const handleSend = useCallback(() => {
    if (!invite?.inviteUrl) return;
    const emails = parseInviteEmailList(emailsRaw);
    if (!emails.length) {
      setError("올바른 이메일 주소를 한 개 이상 입력해 주세요.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const mailto = buildInviteMailtoUrl(
        emails,
        invite.inviteUrl,
        projectTitle,
      );
      window.location.href = mailto;
      setSentNotice(
        `${emails.length}명에게 메일 앱으로 초대 링크를 열었어요. 보내기를 눌러 전달해 주세요.`,
      );
    } catch {
      setError("메일 앱을 열지 못했습니다. 아래 링크를 복사해 직접 보내 주세요.");
    } finally {
      setSending(false);
    }
  }, [emailsRaw, invite?.inviteUrl, projectTitle]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !sending) onClose();
      }}
    >
      <div className="absolute inset-0 bg-zone-cell-bg/55" aria-hidden />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="relative w-full max-w-[440px] rounded-xl border border-border-warm bg-panel p-6 shadow-[0_12px_40px_rgba(45,45,42,0.18)]"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <IconUsers className="size-5 shrink-0 text-gold" stroke={2} aria-hidden />
            <h2 id={titleId} className="text-[17px] font-semibold text-foreground">
              팀원 초대
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            disabled={sending}
            className="rounded-md p-1 text-muted transition-colors hover:bg-cream hover:text-foreground"
            aria-label="닫기"
          >
            <IconX className="size-4" stroke={2} />
          </button>
        </div>

        <p id={descId} className={`mb-4 ${stageCaption} break-keep`}>
          「{projectTitle}」에 함께할 팀원 이메일을 입력하세요. 초대 링크가
          포함된 메일을 보내거나, 링크를 복사해 전달할 수 있어요.
        </p>

        <label className="mb-4 block">
          <span className={`mb-2 block ${stageLabel}`}>팀원 이메일</span>
          <textarea
            value={emailsRaw}
            onChange={(e) => setEmailsRaw(e.target.value)}
            placeholder="example@email.com&#10;또는 쉼표로 여러 명 입력"
            rows={3}
            className={`w-full resize-y rounded-lg border border-border-warm px-3.5 py-3 ${stageField} ${stageInput} text-[15px]`}
          />
        </label>

        {loading ? (
          <p className={stageCaption}>초대 링크를 만드는 중…</p>
        ) : invite ? (
          <div className="mb-4 rounded-lg border border-border-warm bg-cream px-3 py-2.5">
            <p className="break-all text-[13px] leading-relaxed text-muted">
              {invite.inviteUrl}
            </p>
          </div>
        ) : null}

        {error ? (
          <p className="mb-3 text-[14px] text-red-500/90 break-keep">{error}</p>
        ) : null}
        {sentNotice ? (
          <p className="mb-3 flex items-start gap-1.5 text-[14px] text-gold break-keep">
            <IconCheck className="mt-0.5 size-4 shrink-0" stroke={2} aria-hidden />
            {sentNotice}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={loading || !invite || sending}
            onClick={() => void handleCopy()}
            className={`${stageBtnSecondary} inline-flex items-center justify-center gap-1.5 sm:order-1`}
          >
            {copied ? (
              <IconCheck className="size-4" stroke={2} aria-hidden />
            ) : (
              <IconCopy className="size-4" stroke={2} aria-hidden />
            )}
            {copied ? "복사됨" : "링크 복사"}
          </button>
          <button
            type="button"
            disabled={loading || !invite || sending}
            onClick={handleSend}
            className={`${stageBtnPrimary} inline-flex items-center justify-center gap-1.5`}
          >
            초대 보내기
          </button>
        </div>

        <p className={`mt-4 ${stageCaption}`}>
          링크는 30일 동안 유효해요. 팀원이 로그인 후 초대를 수락하면 같은
          프로젝트에서 함께 진행할 수 있어요.
        </p>
      </div>
    </div>
  );
}
