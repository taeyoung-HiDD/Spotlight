/**
 * Stage (work mood) layout & typography — shared across cuts 2–14.
 * Light theme tokens via globals.css + Tailwind semantic colors.
 */
export const stageShell = "mx-auto w-full max-w-[min(100%,1480px)] px-4 sm:px-6 xl:px-8";

/** 2열: 작업 넓게 · 코치 고정폭 우측 (작업 영역 우선 — 코치 열 슬림) */
export const stageWorkSplit =
  "grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(220px,17.5rem)] xl:grid-cols-[minmax(0,1fr)_minmax(236px,18.5rem)] lg:items-stretch lg:gap-0";

/** @deprecated Use StageTwoColumnLayout + stageWorkSplit */
export const stageWorkGrid = stageWorkSplit;

/** 대화형 단계 · 중앙 인트로 코치 */
export const stageIntroShell =
  "mx-auto w-full max-w-xl break-keep px-1 sm:max-w-2xl";
export const stageIntroEnterWork =
  "rounded-2xl bg-transparent p-5 text-charcoal sm:p-6";

export const stageWorkColumn = "min-w-0 lg:pr-5 xl:pr-6";

/** 코치 열 — 패널과 동일 1px 구분선, 여백만으로 분리 (2px·surface 이중 처리 제거) */
export const stageCoachColumn = [
  "min-w-0",
  "mt-5 border-t border-border-warm pt-5",
  "lg:mt-0 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-5",
  "xl:pl-6",
].join(" ");

export const stagePanel =
  "rounded-2xl border border-border-warm bg-panel p-5 lg:p-6";

/** Page header (shell) — 작업 무드 타이포 (기준 대비 약 +15%) */
export const stageEyebrow =
  "text-[14px] font-semibold tracking-wide text-subtle uppercase";
export const stageBadge =
  "rounded border border-border-warm bg-cream px-2 py-0.5 text-[12.5px] font-medium text-muted";
export const stagePageTitle =
  "text-[2rem] font-bold leading-[1.28] tracking-[-0.02em] text-foreground";
export const stagePageLead =
  "mt-2 text-[17.5px] font-normal leading-[1.6] text-muted";

/** Work area sections */
export const stageSectionTitle =
  "text-[23px] font-bold leading-snug tracking-[-0.01em] text-foreground";
export const stageSectionLead = "text-[16px] leading-relaxed text-muted";
export const stageLabel =
  "text-[14px] font-bold tracking-wide text-subtle uppercase";
export const stageCaption = "text-[15px] leading-relaxed text-muted";
export const stageBody = "text-[16px] leading-relaxed text-foreground";
export const stageBodyStrong =
  "text-[16px] font-semibold leading-relaxed text-foreground";

/** Form controls — cream 배경 + foreground 글자 (bg-white 사용 금지) */
export const stageField =
  "bg-cream text-foreground caret-foreground";
export const stageInput =
  "text-[17.5px] outline-none placeholder:text-subtle focus:border-spotlight/50";
export const stageTextarea =
  "text-[17.5px] leading-relaxed outline-none placeholder:text-subtle focus:border-spotlight/50";
export const stageBtn =
  "rounded-md px-3.5 py-2.5 text-[16px] font-semibold transition-colors";
export const stageBtnSecondary =
  `${stageBtn} border border-border-warm bg-panel text-foreground hover:bg-surface`;
export const stageBtnPrimary =
  `${stageBtn} bg-spotlight text-on-spotlight disabled:cursor-not-allowed disabled:opacity-40`;

/** 작업 패널 · 표·캔버스 칸 등 조밀 UI (+15% 스케일) */
export const stageWorkDense = "text-[14px] leading-relaxed";
export const stageWorkMeta = "text-[12.5px] leading-snug text-muted";
export const stageWorkMicro = "text-[11.5px]";

/** Coach panel — 대화 흐름 타이포 (작업 영역 대비 컴팩트) */
export const stageCoachAside =
  "flex h-full flex-col rounded-2xl border-0 bg-transparent p-4 lg:p-0 lg:py-1.5";
export const stageCoachName = "text-[15px] font-semibold text-foreground";
export const stageCoachStatus = "text-[13px] text-muted";
export const stageCoachBubble =
  "whitespace-pre-line break-keep text-[14px] leading-[1.6] text-foreground";
export const stageCoachBubbleSecondary =
  "whitespace-pre-line break-keep text-[14px] leading-[1.6] text-foreground";
export const stageCoachUserBubble =
  "max-w-[92%] rounded-[10px] bg-bubble-user px-3 py-2 text-[14px] leading-[1.6] text-foreground";
export const stageCoachEmphasis = "font-semibold text-foreground";
export const stageCoachEmphasisGold = "font-semibold text-gold";
export const stageCoachComposerInput =
  `min-h-[40px] max-h-24 min-w-0 flex-1 resize-none rounded-lg border border-border-warm px-2.5 py-2 text-[14px] leading-relaxed outline-none placeholder:text-subtle focus:border-spotlight/60 ${stageField}`;
export const stageCoachComposerHint =
  "mt-1 text-[11.5px] text-subtle";
export const stageCoachSendBtn =
  "flex size-9 shrink-0 items-center justify-center rounded-lg bg-spotlight text-on-spotlight transition-opacity disabled:cursor-not-allowed disabled:opacity-35";
/** 대화 흐름 게이트·인트로 CTA (작업 영역 stageCaption/stageBtn과 분리) */
export const stageCoachCaption = "text-[14px] leading-relaxed text-muted";
export const stageCoachBtn =
  "rounded-md px-3 py-2 text-[14px] font-semibold transition-colors";
export const stageCoachBtnPrimary =
  `${stageCoachBtn} bg-spotlight text-on-spotlight disabled:cursor-not-allowed disabled:opacity-40`;
export const stageCoachBtnSecondary =
  `${stageCoachBtn} border border-border-warm bg-panel text-foreground hover:bg-surface`;

/** 코치 발화 아래 구분선 — 대화 스크롤·입력/강조 블록 공통 */
export const stageCoachMessageDivider =
  "border-t border-border-warm";
/** 구분선 위 여백 (마지막 말풍선 ↔ 선) */
export const stageCoachDividerGapAbove = "mt-4";
/** 구분선 아래 여백 (선 ↔ 예시·입력·강조 본문) */
export const stageCoachDividerGapBelow = "pt-4";

export const stageCoachComposerShell = [
  "shrink-0",
  stageCoachDividerGapAbove,
  stageCoachMessageDivider,
  stageCoachDividerGapBelow,
].join(" ");

export const stageCoachHighlightBlock = [
  stageCoachDividerGapAbove,
  stageCoachMessageDivider,
  stageCoachDividerGapBelow,
  "pb-1",
].join(" ");

/** 코치 입력 예시 가이드 */
export const stageCoachGuidePanel =
  "mb-2.5 rounded-lg border border-dashed border-spotlight/40 bg-highlight/80 px-3 py-2.5";
export const stageCoachGuideTitle =
  "mb-1 text-[14px] font-semibold tracking-wide text-gold uppercase";
export const stageCoachGuideHint =
  "mb-2.5 text-[13px] leading-relaxed text-muted break-keep";
export const stageCoachGuideChip =
  "w-full rounded-md border border-border-warm bg-cream px-2.5 py-2 text-left text-[13px] leading-snug text-foreground transition-colors hover:border-spotlight/50 hover:bg-panel disabled:cursor-not-allowed disabled:opacity-50 break-keep";
export const stageCoachGuideChipSelected =
  "border-spotlight bg-spotlight text-on-spotlight hover:bg-spotlight hover:border-spotlight";
export const stageCoachHighlightLabel =
  "mb-0.5 text-[11.5px] font-semibold tracking-wide text-gold uppercase";
export const stageCoachHighlightBody =
  "whitespace-pre-line break-keep text-[14px] leading-[1.5] font-semibold text-foreground italic";
