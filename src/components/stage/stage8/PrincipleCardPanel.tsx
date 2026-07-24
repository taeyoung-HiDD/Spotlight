"use client";

import { useMemo, useState } from "react";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import {
  PRINCIPLE_RING_LABELS,
  PRINCIPLE_RING_ORDER,
  principleCardsForRing,
  type PrincipleCard,
  type PrincipleRing,
} from "@/lib/stages/stage8/principleCatalog";
import type { IdeaGridData } from "@/lib/stages/stage8/ideaGridTypes";
import {
  stageBtnPrimary,
  stageBtnSecondary,
  stageCaption,
  stageLabel,
} from "@/lib/stages/ui";

interface PrincipleCardPanelProps {
  data: IdeaGridData;
  onChange: (data: IdeaGridData) => void;
  onClose: () => void;
  onApplyToIdea?: (card: PrincipleCard) => void;
}

export function PrincipleCardPanel({
  data,
  onChange,
  onClose,
  onApplyToIdea,
}: PrincipleCardPanelProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [unlockedInner, setUnlockedInner] = useState(
    data.competitorRingUnlockedEarly,
  );
  const [outerWritten, setOuterWritten] = useState(false);
  const [activeRing, setActiveRing] = useState<PrincipleRing>("outer");

  const cards = useMemo(
    () =>
      principleCardsForRing(activeRing, {
        excludeIds: dismissedIds,
      }),
    [activeRing, dismissedIds],
  );

  const current = cards[0] ?? null;

  const unlockInner = () => {
    const ok = window.confirm(
      "Kevin: 경쟁사 사례를 먼저 보면 비슷한 아이디어가 나오기 쉬워요. 그래도 보시겠어요?",
    );
    if (!ok) return;
    setUnlockedInner(true);
    onChange({ ...data, competitorRingUnlockedEarly: true });
  };

  const canOpenRing = (ring: PrincipleRing) => {
    if (ring === "outer") return true;
    if (ring === "middle") return outerWritten || unlockedInner;
    return unlockedInner;
  };

  return (
    <div className="rounded-2xl border-[1.5px] border-spotlight bg-panel p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className={stageLabel}>원리 카드</p>
          <p className={`mt-1 ${stageCaption}`}>
            사례의 UI가 아니라 원리만 봐요. 바깥(이종)에서 안쪽(경쟁사) 순이에요.
          </p>
        </div>
        <button type="button" onClick={onClose} className={stageBtnSecondary}>
          닫기
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {PRINCIPLE_RING_ORDER.map((ring) => {
          const locked = !canOpenRing(ring);
          return (
            <button
              key={ring}
              type="button"
              disabled={locked && ring !== "inner"}
              onClick={() => {
                if (ring === "inner" && !unlockedInner) {
                  unlockInner();
                  return;
                }
                if (!canOpenRing(ring)) return;
                setActiveRing(ring);
              }}
              className={[
                "rounded-md border px-2.5 py-1.5 text-[13px] font-semibold",
                activeRing === ring
                  ? "border-spotlight bg-spotlight text-on-spotlight"
                  : locked
                    ? "border-border-warm bg-cream text-muted opacity-60"
                    : "border-border-warm bg-cream text-foreground",
              ].join(" ")}
            >
              {PRINCIPLE_RING_LABELS[ring]}
              {ring === "inner" && !unlockedInner ? " · 잠김" : ""}
            </button>
          );
        })}
      </div>

      {activeRing === "middle" && !outerWritten && !unlockedInner ? (
        <p className={`mb-3 ${stageCaption}`}>
          이종 산업 카드에서 「우리 문제에 옮기면」을 한 번 적어 두면 중간 링이
          열려요. 또는 경쟁사 링을 「먼저 보기」할 수 있어요.
        </p>
      ) : null}

      {activeRing === "inner" && !unlockedInner ? (
        <div className="mb-3 rounded-xl border border-border-warm bg-[#FFFDF4] px-3 py-2.5">
          <p className="text-[13px] font-semibold text-foreground break-keep">
            경쟁사 링은 기본으로 잠겨 있어요.
          </p>
          <button
            type="button"
            onClick={unlockInner}
            className={`${stageBtnSecondary} mt-2`}
          >
            먼저 보기
          </button>
        </div>
      ) : null}

      {!current ? (
        <p className={stageCaption}>이 링의 카드를 모두 살펴봤어요.</p>
      ) : (
        <article className="rounded-xl border border-border-warm bg-white p-4">
          <p className={`mb-2 ${stageCaption}`}>
            {PRINCIPLE_RING_LABELS[current.ring]}
          </p>
          <p className="text-[15px] font-semibold leading-relaxed text-foreground break-keep">
            <LocalizedText>{current.principleText}</LocalizedText>
          </p>
          <button
            type="button"
            onClick={() =>
              setExpandedId((id) => (id === current.id ? null : current.id))
            }
            className="mt-2 text-[12px] font-semibold text-gold underline-offset-2 hover:underline"
          >
            {expandedId === current.id ? "출처 접기" : "i · 출처 사례"}
          </button>
          {expandedId === current.id ? (
            <p className={`mt-1.5 ${stageCaption}`}>
              <LocalizedText>{current.sourceExample}</LocalizedText>
            </p>
          ) : null}

          <label className="mt-3 block">
            <span className={`mb-1 block ${stageCaption}`}>
              우리 문제에 옮기면? (직접 적어 주세요)
            </span>
            <textarea
              rows={3}
              placeholder="원리를 우리 맥락 문장으로 옮겨 보세요. Kevin이 대신 쓰지 않아요."
              className="w-full rounded-lg border border-border-warm bg-cream px-3 py-2 text-sm outline-none focus:border-spotlight/50"
              onChange={(e) => {
                if (e.target.value.trim().length > 8) setOuterWritten(true);
              }}
            />
          </label>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                setDismissedIds((prev) => new Set(prev).add(current.id))
              }
              className={stageBtnSecondary}
            >
              이미 알고 있어요
            </button>
            {onApplyToIdea ? (
              <button
                type="button"
                onClick={() => onApplyToIdea(current)}
                className={stageBtnPrimary}
              >
                이 원리로 아이디어 칸 열기
              </button>
            ) : null}
          </div>
        </article>
      )}
    </div>
  );
}
