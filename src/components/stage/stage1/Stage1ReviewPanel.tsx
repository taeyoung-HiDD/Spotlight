"use client";

import { IconCheck, IconShield } from "@tabler/icons-react";
import { WorkspaceBackButton } from "@/components/navigation/WorkspaceBackButton";
import { WorkspaceForwardButton } from "@/components/navigation/WorkspaceForwardButton";
import { getStagePageName } from "@/lib/navigation/stageNavLabels";
import { StageWorkReveal } from "@/components/stage/motion/StageReveal";
import { STAGE1_PRINCIPLE } from "@/lib/stages/stage1/collectFlow";
import {
  levelCoachingPaceBadge,
  type UserCoachingLevel,
} from "@/lib/stages/stage1/levelDiagnostic";
import { MOTION } from "@/lib/motion/timings";
import {
  stageBadge,
  stageBtnSecondary,
  stageBody,
  stageBodyStrong,
  stageCaption,
  stageField,
  stageInput,
  stageLabel,
  stagePanel,
  stageSectionLead,
  stageTextarea,
} from "@/lib/stages/ui";

export interface Stage1ReviewPanelProps {
  displayName?: string;
  userLevel?: UserCoachingLevel;
  projectTitle: string;
  startingPoint: string;
  hope: string;
  fear: string;
  principleAck: boolean;
  onProjectTitleChange: (v: string) => void;
  onStartingPointChange: (v: string) => void;
  onHopeChange: (v: string) => void;
  onFearChange: (v: string) => void;
  onPrincipleAckChange: (v: boolean) => void;
  gatePassed: boolean;
  onContinue: () => void;
  onBack?: () => void;
  projectId: string;
}

/** 단계 1 · 대화 수집 후 좌측 검토·직접 편집 패널 */
export function Stage1ReviewPanel({
  displayName,
  userLevel,
  projectTitle,
  startingPoint,
  hope,
  fear,
  principleAck,
  onProjectTitleChange,
  onStartingPointChange,
  onHopeChange,
  onFearChange,
  onPrincipleAckChange,
  gatePassed,
  onContinue,
  onBack,
  projectId,
}: Stage1ReviewPanelProps) {
  return (
    <section className={stagePanel}>
      <StageWorkReveal startDelayMs={MOTION.workBlockAfterColumnMs}>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <div className={stageLabel}>정리된 문제점</div>
                  <p className={`mt-1 ${stageSectionLead}`}>
              {displayName?.trim()
                ? `${displayName.trim()}님, `
                : ""}
              Kevin과 나눈 내용을 바탕으로 정리했어요. 직접 고치거나 우측에서
              말씀해 주셔도 돼요.
            </p>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            {userLevel ? (
              <span className={`${stageBadge} border-spotlight/50 text-gold`}>
                {levelCoachingPaceBadge(userLevel)}
              </span>
            ) : null}
            <span className={stageBadge}>Hopes &amp; Fears</span>
          </div>
        </div>

        <label className="mb-4 block">
          <span className={`mb-2 block ${stageLabel}`}>프로젝트 이름</span>
          <input
            type="text"
            value={projectTitle}
            onChange={(e) => onProjectTitleChange(e.target.value)}
            className={`w-full rounded-lg border border-border-warm px-3.5 py-3 ${stageField} ${stageInput}`}
          />
        </label>

        <label className="mb-4 block">
          <span className={`mb-2 block ${stageLabel}`}>문제점 · 한 줄</span>
          <input
            type="text"
            value={startingPoint}
            onChange={(e) => onStartingPointChange(e.target.value)}
            className={`w-full rounded-lg border border-border-warm px-3.5 py-3 ${stageField} ${stageInput}`}
          />
        </label>

        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={`mb-2 block ${stageLabel}`}>Hopes · 바라는 것</span>
            <textarea
              value={hope}
              onChange={(e) => onHopeChange(e.target.value)}
              rows={3}
              className={`w-full resize-none rounded-lg border border-border-warm px-3.5 py-3 ${stageField} ${stageTextarea}`}
            />
          </label>
          <label className="block">
            <span className={`mb-2 block ${stageLabel}`}>Fears · 걱정되는 것</span>
            <textarea
              value={fear}
              onChange={(e) => onFearChange(e.target.value)}
              rows={3}
              className={`w-full resize-none rounded-lg border border-border-warm px-3.5 py-3 ${stageField} ${stageTextarea}`}
            />
          </label>
        </div>

        <div
          className={[
            "mb-5 flex gap-3 rounded-xl border p-4",
            principleAck
              ? "border-spotlight/60 bg-yellow-tint"
              : "border-border-warm bg-cream",
          ].join(" ")}
        >
          <div
            className={[
              "flex size-7 shrink-0 items-center justify-center rounded-lg",
              principleAck
                ? "bg-spotlight"
                : "border border-border-warm bg-panel",
            ].join(" ")}
          >
            {principleAck ? (
              <IconCheck className="size-3.5 text-on-spotlight" stroke={2.5} />
            ) : (
              <IconShield className="size-3.5 text-gold" stroke={2} />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className={stageBodyStrong}>
              디자인씽킹 원칙 · {STAGE1_PRINCIPLE.match}
            </div>
            <p className={`mt-1 ${stageBody}`}>
              {STAGE1_PRINCIPLE.text}
            </p>
          </div>
          {!principleAck && (
            <button
              type="button"
              onClick={() => onPrincipleAckChange(true)}
              className={`shrink-0 self-center ${stageBtnSecondary}`}
            >
              이해했어요
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-dashed border-border-warm pt-4">
          <p className={stageCaption}>
            {gatePassed
              ? "게이트 통과 · 다음 화면으로 진행할 수 있어요"
              : "문제점·희망·걱정·원칙 동의가 모두 필요해요"}
          </p>
          <div className="flex flex-wrap gap-2.5">
            <WorkspaceBackButton
              projectId={projectId}
              fallbackHref="/home"
              backPageName={
                onBack ? getStagePageName(1) : undefined
              }
              onInternalBack={
                onBack
                  ? () => {
                      onBack();
                      return true;
                    }
                  : undefined
              }
            />
            <WorkspaceForwardButton
              stageId={2}
              disabled={!gatePassed}
              onClick={onContinue}
            />
          </div>
        </div>
      </StageWorkReveal>
    </section>
  );
}
