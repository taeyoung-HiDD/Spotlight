"use client";

import type { ReactNode } from "react";
import { StageWorkDiscoveryPlaceholder } from "@/components/stage/StageWorkDiscoveryPlaceholder";
import { getStagePurposeCopy } from "@/lib/stages/discovery/stagePurposeCopy";
import { isIcebergDiscoveryActive } from "@/lib/stages/iceberg/stage5IcebergDiscoveryFlow";
import type { IcebergModelData } from "@/lib/stages/iceberg/types";
import {
  stageBadge,
  stageBtnPrimary,
  stageBtnSecondary,
  stageCaption,
  stageField,
  stageInput,
  stageLabel,
  stagePanel,
  stageTextarea,
} from "@/lib/stages/ui";
import { TermChip } from "@/components/stage/TermChip";

const WATERLINE =
  "repeating-linear-gradient(to right, #A09E94 0, #A09E94 4px, transparent 4px, transparent 8px)";
const WATERLINE_GOLD =
  "repeating-linear-gradient(to right, #F4C430 0, #F4C430 4px, transparent 4px, transparent 8px)";

function itemsToText(items: string[]) {
  return items.join("\n");
}

function textToItems(text: string) {
  return text
    .split("\n")
    .map((line) => line.replace(/^[·•\-\s]+/, "").trim())
    .filter(Boolean);
}

function countItems(items: string[]) {
  return items.filter((s) => s.trim()).length;
}

interface IcebergWorkPanelProps {
  data: IcebergModelData;
  onChange: (data: IcebergModelData) => void;
  onAccept: () => void;
  onSave: () => void;
  onRefine: () => void;
  onWhyLadder: () => void;
  saving: boolean;
  saveError: string | null;
  lastSavedAt: string | null;
}

export function IcebergWorkPanel({
  data,
  onChange,
  onAccept,
  onSave,
  onRefine,
  onWhyLadder,
  saving,
  saveError,
  lastSavedAt,
}: IcebergWorkPanelProps) {
  const explicitCount = countItems(data.explicit.items);
  const tacitCount = countItems(data.tacit.items);
  const discoveryActive = isIcebergDiscoveryActive(data.prep);
  const purposeCopy = getStagePurposeCopy(5);

  if (discoveryActive) {
    return (
      <section className={stagePanel}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <span className={stageLabel}>말한 것 · 행동 · 잠재</span>
          <TermChip
            label="용어"
            definition="말한 것(Explicit) · 행동에서 본 것(Tacit) · 우리가 찾아낸 것(Latent, 가설)"
          />
        </div>
        <StageWorkDiscoveryPlaceholder caption={purposeCopy.workCaption}>
          {purposeCopy.placeholderLines[0]}
          <br />
          {purposeCopy.placeholderLines[1]}
        </StageWorkDiscoveryPlaceholder>
      </section>
    );
  }

  return (
    <section className={stagePanel}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className={stageLabel}>말한 것 · 행동 · 잠재</span>
        <TermChip
          label="용어"
          definition="말한 것(Explicit) · 행동에서 본 것(Tacit) · 우리가 찾아낸 것(Latent, 가설)"
        />
      </div>

      <div className="flex flex-col gap-2">
        <IcebergLayerCard
          layerLabel="1층 · 말한 것"
          term="Explicit"
          count={explicitCount}
          variant="surface"
        >
          <textarea
            value={itemsToText(data.explicit.items)}
            onChange={(e) =>
              onChange({
                ...data,
                explicit: { items: textToItems(e.target.value) },
              })
            }
            rows={4}
            placeholder="한 줄에 하나씩 · 사용자가 말로 표현한 니즈"
            className={`w-full resize-y rounded-lg border border-border-warm px-3.5 py-3 ${stageField} ${stageTextarea}`}
          />
        </IcebergLayerCard>

        <IcebergLayerCard
          layerLabel="2층 · 행동에서 본 것"
          term="Tacit"
          count={tacitCount}
          variant="tacit"
          waterline={WATERLINE}
        >
          <textarea
            value={itemsToText(data.tacit.items)}
            onChange={(e) =>
              onChange({
                ...data,
                tacit: { items: textToItems(e.target.value) },
              })
            }
            rows={3}
            placeholder="관찰·행동 메모에서 본 패턴"
            className={`w-full resize-y rounded-lg border border-border-warm px-3.5 py-3 ${stageField} ${stageTextarea}`}
          />
          <p className="mt-2 border-t border-dashed border-border-warm pt-2 text-[15px] italic text-muted">
            {data.tacitAutoNote}
          </p>
        </IcebergLayerCard>

        <IcebergLayerCard
          layerLabel="3층 · 우리가 찾아낸 것"
          term="Latent"
          variant="latent"
          waterline={WATERLINE_GOLD}
          badge="가설"
        >
          <div className="mb-3 border-l-[3px] border-spotlight bg-cream px-3.5 py-3">
            <label className="mb-2 block">
              <span className="sr-only">핵심 니즈 한 줄</span>
              <input
                type="text"
                value={data.latent.headline}
                onChange={(e) =>
                  onChange({
                    ...data,
                    latent: { ...data.latent, headline: e.target.value },
                  })
                }
                placeholder="핵심 니즈 (예: 매장 통제감을 잃지 않기)"
                className={`w-full border-0 bg-transparent p-0 font-bold outline-none ${stageField} ${stageInput}`}
              />
            </label>
            <label className="block">
              <span className="sr-only">인용·뉘앙스</span>
              <input
                type="text"
                value={data.latent.quote}
                onChange={(e) =>
                  onChange({
                    ...data,
                    latent: { ...data.latent, quote: e.target.value },
                  })
                }
                placeholder='"모르는 상태를 견디지 않고 싶다"'
                className={`w-full border-0 bg-transparent p-0 italic outline-none ${stageField} ${stageInput}`}
              />
            </label>
          </div>
          <label className="block">
            <span className={`mb-1.5 block ${stageLabel}`}>근거</span>
            <textarea
              value={data.latent.evidence}
              onChange={(e) =>
                onChange({
                  ...data,
                  latent: { ...data.latent, evidence: e.target.value },
                })
              }
              rows={2}
              className={`w-full resize-y rounded-lg border border-dashed border-spotlight/60 px-3.5 py-2.5 text-foreground outline-none focus:border-spotlight ${stageField} ${stageTextarea}`}
            />
          </label>
        </IcebergLayerCard>
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          disabled={saving}
          onClick={onAccept}
          className={`${stageBtnPrimary} flex-1 sm:min-w-[140px]`}
        >
          {saving ? "저장 중…" : "이대로 둡시다"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onSave}
          className={`${stageBtnSecondary} flex-1 sm:min-w-[100px]`}
        >
          저장
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onRefine}
          className={`${stageBtnSecondary} flex-1 sm:min-w-[120px]`}
        >
          함께 다듬기
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onWhyLadder}
          className={`${stageBtnSecondary} flex-1 sm:min-w-[120px]`}
        >
          Why 사다리로
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className={stageCaption}>
          {data.decision === "accept"
            ? "확정 저장됨 · 이대로 두기"
            : data.decision === "refine"
              ? "저장됨 · 함께 다듬기 선택"
              : data.decision === "why_ladder"
                ? "저장됨 · Why 사다리로 이동 예정"
                : "각 층을 채운 뒤 저장하거나 확정해 주세요"}
        </p>
        {lastSavedAt ? (
          <p className="text-[14px] text-muted">마지막 저장 {lastSavedAt}</p>
        ) : null}
      </div>
      {saveError ? (
        <p className="mt-2 text-[16px] text-red-700" role="alert">
          {saveError}
        </p>
      ) : null}
    </section>
  );
}

function IcebergLayerCard({
  layerLabel,
  term,
  count,
  variant,
  waterline,
  badge,
  children,
}: {
  layerLabel: string;
  term: string;
  count?: number;
  variant: "surface" | "tacit" | "latent";
  waterline?: string;
  badge?: string;
  children: ReactNode;
}) {
  const bg =
    variant === "latent"
      ? "border-[1.5px] border-spotlight bg-highlight"
      : variant === "tacit"
        ? "border-0 bg-cream"
        : "border border-border-warm bg-panel";

  const labelClass =
    variant === "latent"
      ? "text-[14px] font-bold tracking-wide text-gold uppercase"
      : "text-[14px] font-semibold tracking-wide text-muted uppercase";

  return (
    <div className={`relative rounded-xl px-4 py-3.5 ${bg}`}>
      {waterline ? (
        <div
          className="absolute top-0 right-0 left-0 h-px"
          style={{ background: waterline }}
          aria-hidden
        />
      ) : null}
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className={labelClass}>{layerLabel}</span>
          <span className="text-[12.5px] text-avatar-muted">{term}</span>
          {badge ? (
            <span className={`${stageBadge} !text-gold`}>{badge}</span>
          ) : null}
        </div>
        {count !== undefined ? (
          <span className={stageCaption}>{count} 항목</span>
        ) : null}
      </div>
      {children}
    </div>
  );
}
