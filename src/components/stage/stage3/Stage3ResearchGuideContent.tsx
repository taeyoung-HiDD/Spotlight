"use client";

import {
  STAGE3_RESEARCH_GUIDE_INTERVIEW,
  STAGE3_RESEARCH_GUIDE_INTRO,
  STAGE3_RESEARCH_GUIDE_SHADOWING,
  type Stage3GuideMethodTab,
} from "@/lib/stages/fieldResearch/stage3ResearchPrep";

interface Stage3ResearchGuideContentProps {
  activeMethod: Stage3GuideMethodTab;
  onMethodChange: (method: Stage3GuideMethodTab) => void;
}

const TAB_BASE =
  "rounded-md px-3 py-2 text-[14px] font-semibold transition-colors";

/** 리서치 진행 가이드 본문 — 동행 관찰 / 1:1 인터뷰 탭 */
export function Stage3ResearchGuideContent({
  activeMethod,
  onMethodChange,
}: Stage3ResearchGuideContentProps) {
  return (
    <div className="space-y-4">
      <p className="text-[14px] leading-relaxed text-muted break-keep">
        {STAGE3_RESEARCH_GUIDE_INTRO}
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onMethodChange("shadowing")}
          className={[
            TAB_BASE,
            activeMethod === "shadowing"
              ? "bg-spotlight text-on-spotlight"
              : "border border-border-warm bg-cream text-foreground hover:bg-surface",
          ].join(" ")}
        >
          동행 관찰 (Shadowing)
        </button>
        <button
          type="button"
          onClick={() => onMethodChange("home_visit_in_depth")}
          className={[
            TAB_BASE,
            activeMethod === "home_visit_in_depth"
              ? "bg-spotlight text-on-spotlight"
              : "border border-border-warm bg-cream text-foreground hover:bg-surface",
          ].join(" ")}
        >
          1:1 인터뷰
        </button>
      </div>

      {activeMethod === "shadowing" ? (
        <div className="space-y-3">
          <div>
            <p className="text-[15px] font-bold text-foreground break-keep">
              {STAGE3_RESEARCH_GUIDE_SHADOWING.title}
            </p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-muted break-keep">
              {STAGE3_RESEARCH_GUIDE_SHADOWING.description}
            </p>
          </div>
          <ul className="space-y-2.5">
            {STAGE3_RESEARCH_GUIDE_SHADOWING.principles.map((item) => (
              <li
                key={item.title}
                className="rounded-lg border border-border-warm bg-cream/40 px-4 py-3"
              >
                <p className="text-[14px] font-semibold text-foreground break-keep">
                  {item.title}
                </p>
                <p className="mt-1 text-[13.5px] leading-relaxed text-muted break-keep">
                  {item.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <p className="text-[15px] font-bold text-foreground break-keep">
              {STAGE3_RESEARCH_GUIDE_INTERVIEW.title}
            </p>
            <p className="mt-1 text-[13.5px] leading-relaxed text-muted break-keep">
              {STAGE3_RESEARCH_GUIDE_INTERVIEW.description}
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-[13.5px] leading-relaxed text-muted break-keep">
              {STAGE3_RESEARCH_GUIDE_INTERVIEW.tips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-[14px] font-bold text-foreground break-keep">
              1:1 인터뷰 질문 가이드
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-gold break-keep">
              {STAGE3_RESEARCH_GUIDE_INTERVIEW.flowTip}
            </p>
            <ol className="mt-3 space-y-3">
              {STAGE3_RESEARCH_GUIDE_INTERVIEW.stages.map((stage) => (
                <li
                  key={stage.title}
                  className="rounded-lg border border-border-warm bg-cream/40 px-4 py-3"
                >
                  <p className="text-[14px] font-semibold text-foreground break-keep">
                    {stage.title}
                  </p>
                  <p className="mt-1 text-[13px] text-gold break-keep">
                    목적: {stage.goal}
                  </p>
                  <ul className="mt-2 space-y-1.5">
                    {stage.scripts.map((script) => (
                      <li
                        key={script}
                        className="text-[13.5px] leading-relaxed text-muted break-keep"
                      >
                        <span className="mr-1.5 text-subtle">“</span>
                        {script}
                        <span className="ml-0.5 text-subtle">”</span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
