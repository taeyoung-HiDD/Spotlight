export type StageDotTone =
  | "spotlight"
  | "spotlight-dim"
  | "workbook"
  | "workbook-dim"
  | "empty";

const TONE_CLASS: Record<StageDotTone, string> = {
  spotlight: "bg-spotlight",
  "spotlight-dim": "bg-spotlight/40",
  workbook: "bg-muted",
  "workbook-dim": "bg-muted/50",
  empty: "bg-border-warm",
};

interface StageProgressBarProps {
  /** 14단계 진행 점 (워크북 1–8 + 서비스 확장 9–14) */
  tones: StageDotTone[];
}

export function StageProgressBar({ tones }: StageProgressBarProps) {
  return (
    <div className="mb-2.5 flex gap-[3px]" role="img" aria-label="14단계 진행">
      {tones.map((tone, index) => (
        <div
          key={index}
          className={`h-[3px] flex-1 rounded-sm ${TONE_CLASS[tone]}`}
        />
      ))}
    </div>
  );
}
