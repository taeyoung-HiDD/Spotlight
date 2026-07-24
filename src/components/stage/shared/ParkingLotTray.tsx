"use client";

import { LocalizedText } from "@/components/i18n/LocalizedText";
import { stageBtnSecondary, stageCaption, stageLabel } from "@/lib/stages/ui";

export type ParkingLotItem = {
  id: string;
  text: string;
  meta?: string;
};

interface ParkingLotTrayProps {
  title?: string;
  hint?: string;
  items: ParkingLotItem[];
  emptyLabel?: string;
  unparkLabel?: string;
  onUnpark: (id: string) => void;
}

/** 니즈 보류함·아이디어 은행 공용 트레이 */
export function ParkingLotTray({
  title = "보류함",
  hint = "지금은 접어두지만, 언제든 다시 꺼낼 수 있어요.",
  items,
  emptyLabel = "보류한 항목이 없어요",
  unparkLabel = "다시 꺼내기",
  onUnpark,
}: ParkingLotTrayProps) {
  return (
    <section className="rounded-xl border border-dashed border-border-warm bg-surface p-3">
      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <p className={stageLabel}>{title}</p>
        <p className="text-[12px] text-muted break-keep">{hint}</p>
      </div>
      {items.length === 0 ? (
        <p className="rounded-md border border-dashed border-border-warm/80 px-2 py-4 text-center text-[12px] text-muted break-keep">
          {emptyLabel}
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="min-w-0 rounded-md border border-border-warm bg-panel/80 px-2.5 py-2 text-[13px] font-medium leading-snug text-muted break-keep [overflow-wrap:anywhere]"
            >
              {item.meta ? (
                <p className="mb-0.5 text-[10px] font-bold opacity-70">
                  <LocalizedText>{item.meta}</LocalizedText>
                </p>
              ) : null}
              <LocalizedText>{item.text}</LocalizedText>
              <div className="mt-1.5 flex justify-end">
                <button
                  type="button"
                  onClick={() => onUnpark(item.id)}
                  className={`${stageBtnSecondary} px-2 py-1 text-[11px]`}
                >
                  {unparkLabel}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {items.length > 0 ? (
        <p className={`mt-2 ${stageCaption}`}>{items.length}개 보관 중</p>
      ) : null}
    </section>
  );
}
