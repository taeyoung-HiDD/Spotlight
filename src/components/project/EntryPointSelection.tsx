"use client";

import {
  IconArrowRight,
  IconBulb,
  IconInfoCircle,
  IconRocket,
  IconSeedling,
} from "@tabler/icons-react";
import type { ReactNode } from "react";
import { StartProjectButton } from "@/components/project/StartProjectButton";
import { ENTRY_POINTS, type EntryPointId } from "@/lib/projects/constants";

const ICONS: Record<EntryPointId, ReactNode> = {
  A: <IconSeedling className="size-[22px] text-on-spotlight" stroke={1.5} />,
  B: <IconBulb className="size-[22px] text-muted" stroke={1.5} />,
  C: <IconRocket className="size-[22px] text-muted" stroke={1.5} />,
};

function EntryPointCard({
  entryId,
  featured,
}: {
  entryId: EntryPointId;
  featured?: boolean;
}) {
  const entry = ENTRY_POINTS.find((item) => item.id === entryId)!;

  const content = (
    <div className="flex items-start gap-3.5">
      <div
        className={[
          "flex size-11 shrink-0 items-center justify-center rounded-[11px]",
          featured ? "bg-spotlight" : "bg-cream",
        ].join(" ")}
      >
        {ICONS[entryId]}
      </div>
      <div className="flex-1">
        <div className="mb-1 flex items-center gap-1.5">
          <span
            className={[
              "rounded px-[7px] py-0.5 text-[9.5px] tracking-[0.3px]",
              featured
                ? "bg-panel font-medium text-gold"
                : "bg-surface text-muted",
            ].join(" ")}
          >
            {entry.tag}
          </span>
        </div>
        <h2 className="mb-1 text-[15px] font-semibold leading-snug text-foreground">
          {entry.title}
        </h2>
        <p className="mb-2.5 text-[11.5px] leading-[1.6] text-muted">
          {entry.description}
        </p>
        <div className="flex items-center gap-1.5">
          <span
            className={[
              "text-[10px] font-medium",
              featured ? "text-gold" : "text-muted",
            ].join(" ")}
          >
            {entry.footer}
          </span>
          <IconArrowRight
            className={[
              "ml-auto size-3",
              featured ? "text-gold" : "text-muted",
            ].join(" ")}
            stroke={2}
          />
        </div>
      </div>
    </div>
  );

  if (entryId === "A") {
    return (
      <StartProjectButton
        entryPoint="A"
        className={[
          "w-full rounded-xl border-[1.5px] border-spotlight bg-highlight p-5 text-left transition-opacity hover:opacity-95 disabled:opacity-60",
        ].join(" ")}
      >
        {content}
      </StartProjectButton>
    );
  }

  return (
    <button
      type="button"
      disabled
      className="w-full cursor-not-allowed rounded-xl border border-border-warm bg-panel p-5 text-left opacity-70"
      title="곧 지원 예정입니다"
    >
      {content}
    </button>
  );
}

export function EntryPointSelection() {
  return (
    <div className="mx-auto max-w-[620px]">
      <header className="mb-7 text-center">
        <p className="mb-2 text-[10.5px] font-medium tracking-[1.2px] text-gold uppercase">
          새 프로젝트
        </p>
        <h1 className="mb-2 text-[26px] font-bold leading-[1.3] tracking-[-0.5px] text-foreground">
          어디서 출발하세요?
        </h1>
        <p className="text-[12.5px] leading-[1.6] text-muted">
          사용자 상태에 따라 진입점을 선택하면 코치가 함께 갑니다
        </p>
      </header>

      <div className="flex flex-col gap-[11px]">
        <EntryPointCard entryId="A" featured />
        <EntryPointCard entryId="B" />
        <EntryPointCard entryId="C" />
      </div>

      <div className="mt-5 flex items-center gap-2 rounded-lg border border-border-warm bg-surface px-3.5 py-[11px]">
        <IconInfoCircle className="size-[13px] shrink-0 text-muted" stroke={1.75} />
        <p className="text-[11px] leading-[1.55] text-muted">
          진입 후{" "}
          <span className="font-medium text-foreground">짧은 설문</span>
          으로 코치 맞춤 방식을 정해요 — 차근차근 함께 만들지, 핵심을
          짚어 갈지에 맞춰 안내해 드려요
        </p>
      </div>
    </div>
  );
}
