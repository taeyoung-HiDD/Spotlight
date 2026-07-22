"use client";

import { IconArrowRight, IconBook2, IconBulb, IconCheck } from "@tabler/icons-react";
import type { GuidanceStyle } from "@/lib/stages/stage1/guidanceStyle";

interface GuidanceStyleThumbnailProps {
  style: GuidanceStyle;
}

const THUMBNAIL_SHELL =
  "pointer-events-none flex h-[17.5rem] select-none flex-col overflow-hidden rounded-xl border p-3";

/** 할 일 중심 — 작업 화면 그대로, 가이드 요소 최소 */
function TaskFocusedThumbnail() {
  return (
    <div
      className={`${THUMBNAIL_SHELL} border-border-warm bg-white`}
      aria-hidden
    >
      <div className="mb-2 flex shrink-0 items-center gap-2">
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className={[
                "size-2 rounded-full",
                i < 3 ? "bg-muted/40" : i === 3 ? "bg-foreground/80" : "bg-muted/25",
              ].join(" ")}
            />
          ))}
        </div>
        <span className="text-[10px] text-muted">단계 3</span>
        <span className="ml-auto rounded-md border border-border-warm bg-cream px-2 py-0.5 text-[9px] font-semibold text-muted">
          할 일 중심
        </span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_0.62fr] gap-2">
        {/* 작업 패널 — 표·체크리스트가 주인공 */}
        <div className="flex flex-col overflow-hidden rounded-lg border border-border-warm bg-panel">
          <div className="border-b border-border-warm px-2.5 py-2">
            <div className="text-[11px] font-bold text-foreground">To-know list</div>
            <div className="text-[8px] text-muted">가이드 없이 바로 작업</div>
          </div>

          <div className="flex flex-wrap gap-1 border-b border-border-warm bg-cream/30 px-2 py-1.5">
            {[
              { label: "① 질문 5개", on: true },
              { label: "② 방법 열", on: true },
              { label: "③ 검토", on: false },
            ].map((chip) => (
              <span
                key={chip.label}
                className={[
                  "rounded px-1.5 py-0.5 text-[7.5px] font-medium",
                  chip.on
                    ? "bg-spotlight text-on-spotlight"
                    : "border border-border-warm bg-panel text-muted",
                ].join(" ")}
              >
                {chip.label}
              </span>
            ))}
          </div>

          <div className="min-h-0 flex-1 overflow-hidden p-2">
            <div className="h-full overflow-hidden rounded border border-border-warm">
              <div className="grid grid-cols-[1.15fr_0.75fr] bg-cream text-[7px] font-semibold text-muted">
                <div className="border-b border-r border-border-warm px-1.5 py-1">
                  To-know 질문
                </div>
                <div className="border-b border-border-warm px-1.5 py-1">방법</div>
                {[
                  ["왜 이 문제를 겪나요?", "인터뷰"],
                  ["평소 어떻게 해결하나요?", "관찰"],
                  ["가장 답답한 순간은?", "—"],
                  ["대안을 쓰는 이유는?", "—"],
                ].map(([q, m]) => (
                  <div key={q} className="contents">
                    <div className="border-b border-r border-border-warm bg-panel px-1.5 py-1 text-foreground">
                      {q}
                    </div>
                    <div className="border-b border-border-warm bg-panel px-1.5 py-1 text-muted">
                      {m}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 코치 — 작고 절제된 */}
        <div className="flex flex-col rounded-lg border border-border-warm/80 bg-surface/60 p-2 opacity-80">
          <div className="mb-1.5 flex items-center gap-1">
            <span className="flex size-4 items-center justify-center rounded-full bg-muted/30">
              <IconBulb className="size-2.5 text-muted" stroke={2} aria-hidden />
            </span>
            <span className="text-[8px] font-medium text-muted">Kevin · 짧게</span>
          </div>
          <div className="rounded bg-panel px-1.5 py-1 text-[7.5px] leading-snug text-muted break-keep">
            할 일만 보고 진행해요.
          </div>
          <div className="mt-1 h-3 rounded border border-dashed border-border-warm/60 bg-cream/20" />
        </div>
      </div>
    </div>
  );
}

/** 단계별 안내 — 가이드·예시·시작 버튼이 주인공, 표는 숨김 */
function FullGuidanceThumbnail() {
  return (
    <div
      className={`${THUMBNAIL_SHELL} border-spotlight/50 bg-highlight/40`}
      aria-hidden
    >
      <div className="mb-2 flex shrink-0 items-center gap-2">
        <div className="flex gap-0.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <span
              key={i}
              className={[
                "size-2 rounded-full",
                i < 3 ? "bg-gold/50" : i === 3 ? "bg-spotlight" : "bg-muted/25",
              ].join(" ")}
            />
          ))}
        </div>
        <span className="text-[10px] font-medium text-gold">단계 3 · 가이드</span>
        <span className="ml-auto rounded-md border border-spotlight bg-spotlight px-2 py-0.5 text-[9px] font-bold text-on-spotlight">
          단계별 안내
        </span>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-[1.05fr_0.88fr] gap-2">
        {/* 가이드 패널 — 한 단계만, 예시·CTA 강조 */}
        <div className="relative flex flex-col overflow-hidden rounded-lg border-2 border-spotlight/60 bg-panel p-2.5 shadow-[inset_0_0_0_1px_rgba(244,196,48,0.15)]">
          <div className="mb-2 inline-flex w-fit items-center gap-1 rounded-full border border-spotlight/40 bg-highlight px-2 py-0.5">
            <IconBook2 className="size-3 text-gold" stroke={2} aria-hidden />
            <span className="text-[8px] font-bold text-gold">단계 가이드</span>
          </div>

          <div className="text-[11px] font-bold leading-snug text-foreground break-keep">
            To-know list 작성하기
          </div>
          <p className="mt-1 text-[8px] leading-relaxed text-muted break-keep">
            현장에 나가기 전, 무엇을 알아야 할지 질문 목록을 만드는 단계예요.
          </p>

          <div className="mt-2.5 rounded-lg border border-border-warm bg-cream/50 p-2">
            <p className="text-[7.5px] font-bold uppercase tracking-wide text-gold">
              이 단계에서 할 일
            </p>
            <div className="mt-1.5 flex items-start gap-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-spotlight text-[9px] font-bold text-on-spotlight">
                1
              </span>
              <div>
                <p className="text-[9px] font-semibold text-foreground break-keep">
                  조사 목적 정하기
                </p>
                <p className="text-[7.5px] text-muted break-keep">
                  무엇을 알아야 할지 한 문장으로
                </p>
              </div>
            </div>
            <p className="mt-2 text-[7px] text-muted/70 line-through decoration-muted/50">
              ② To-know 질문 · ③ 조사 방법 — 가이드 끝난 뒤
            </p>
          </div>

          <div className="mt-2 rounded-lg border border-gold/40 bg-yellow-tint px-2 py-1.5">
            <p className="text-[7.5px] font-bold text-gold">진행 예시</p>
            <p className="mt-0.5 text-[8px] leading-snug text-foreground break-keep">
              「왜 이 문제를 겪나요?」처럼 감정이 드러나는 질문부터
            </p>
          </div>

          <div className="mt-auto flex justify-end pt-2">
            <span className="inline-flex items-center gap-0.5 rounded-md bg-spotlight px-3 py-1.5 text-[9px] font-bold text-on-spotlight shadow-sm">
              시작하기
              <IconArrowRight className="size-3" stroke={2.5} aria-hidden />
            </span>
          </div>

          {/* 작업 표는 흐릿하게 배경만 — 가이드 모드 느낌 */}
          <div
            className="pointer-events-none absolute inset-x-3 bottom-12 h-8 rounded border border-dashed border-border-warm/40 bg-cream/20 opacity-40"
            aria-hidden
          />
        </div>

        {/* 코치 — 설명이 풍부 */}
        <div className="flex flex-col rounded-lg border border-spotlight/30 bg-surface p-2">
          <div className="mb-2 flex items-center gap-1.5 border-b border-spotlight/20 pb-2">
            <span className="flex size-5 items-center justify-center rounded-full bg-spotlight">
              <IconBulb className="size-3 text-on-spotlight" stroke={2} aria-hidden />
            </span>
            <div>
              <div className="text-[9px] font-bold text-foreground">Kevin</div>
              <div className="text-[7.5px] text-gold">의미·방법 · 차근차근</div>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col gap-1.5">
            {[
              "이 단계는 ‘무엇을 알아야 할지’ 정리하는 자리예요.",
              "인터뷰 질문은 감정이 드러나게 쓰는 게 좋아요.",
              "예: 「평소 어떻게 해결하나요?」",
            ].map((line) => (
              <div
                key={line}
                className="rounded-md border border-border-warm/80 bg-panel px-2 py-1.5 text-[8px] leading-snug text-foreground break-keep"
              >
                {line}
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center gap-1 rounded border border-spotlight/25 bg-highlight/60 px-2 py-1">
            <IconCheck className="size-3 text-gold" stroke={2} aria-hidden />
            <span className="text-[7px] font-medium text-gold">가이드 먼저 → 작업</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** 가이드 방식 선택 카드용 화면 미리보기 */
export function GuidanceStyleThumbnail({ style }: GuidanceStyleThumbnailProps) {
  if (style === "task_focused") {
    return <TaskFocusedThumbnail />;
  }
  return <FullGuidanceThumbnail />;
}
