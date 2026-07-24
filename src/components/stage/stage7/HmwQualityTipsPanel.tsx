"use client";

import {
  HMW_QUALITY_TIP_LABELS,
  HMW_VARIATION_KIND_LABELS,
  type HmwQualityTip,
  type HmwVariationKind,
} from "@/lib/stages/stage7/hmwTypes";
import { stageCaption } from "@/lib/stages/ui";

interface HmwQualityTipsPanelProps {
  tips?: HmwQualityTip[];
  variationKind?: HmwVariationKind;
}

export function HmwQualityTipsPanel({
  tips,
  variationKind,
}: HmwQualityTipsPanelProps) {
  if (!tips?.length) return null;

  const ordered = [1, 2, 3, 4, 5].map((id) => {
    const tip = tips.find((t) => t.id === id);
    return (
      tip ?? {
        id: id as 1 | 2 | 3 | 4 | 5,
        status: "pass" as const,
      }
    );
  });

  return (
    <div className="mt-3 rounded-xl border border-border-warm/70 bg-panel/80 px-3 py-2.5">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
        <p className={stageCaption}>HMW 품질 체크 (NN/g)</p>
        {variationKind ? (
          <span className="text-[11px] font-medium text-muted break-keep">
            변주 · {HMW_VARIATION_KIND_LABELS[variationKind]}
          </span>
        ) : null}
      </div>
      <ul className="space-y-1.5">
        {ordered.map((tip) => {
          const pass = tip.status === "pass";
          return (
            <li key={tip.id} className="break-keep">
              <div className="flex items-start gap-1.5 text-[12px] leading-snug">
                <span
                  className={
                    pass
                      ? "shrink-0 font-semibold text-[#2E7D32]"
                      : "shrink-0 font-semibold text-[#E65100]"
                  }
                  aria-hidden
                >
                  {pass ? "✅" : "⚠️"}
                </span>
                <div className="min-w-0">
                  <p
                    className={
                      pass
                        ? "font-medium text-foreground/85"
                        : "font-medium text-foreground"
                    }
                  >
                    {HMW_QUALITY_TIP_LABELS[tip.id]}
                  </p>
                  {!pass && tip.note ? (
                    <p className="mt-0.5 text-[11px] text-muted">{tip.note}</p>
                  ) : null}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
