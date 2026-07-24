"use client";

import { useState } from "react";
import { LocalizedText } from "@/components/i18n/LocalizedText";
import {
  TEAM_PERSONA_PROMPTS,
  type TeamPersonaPrompt,
} from "@/lib/stages/stage8/teamPersonaCatalog";
import { stageBtnSecondary, stageCaption, stageLabel } from "@/lib/stages/ui";

interface TeamPersonaPanelProps {
  onClose: () => void;
  onPick?: (prompt: TeamPersonaPrompt) => void;
}

export function TeamPersonaPanel({ onClose, onPick }: TeamPersonaPanelProps) {
  const [activeId, setActiveId] = useState(TEAM_PERSONA_PROMPTS[0]?.id ?? "");

  const active =
    TEAM_PERSONA_PROMPTS.find((p) => p.id === activeId) ??
    TEAM_PERSONA_PROMPTS[0];

  return (
    <div className="rounded-2xl border-[1.5px] border-spotlight bg-panel p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className={stageLabel}>팀 관점 카드</p>
          <p className={`mt-1 ${stageCaption}`}>
            민호·지원·현우가 질문만 던져요. 답은 여러분이 씁니다.
          </p>
        </div>
        <button type="button" onClick={onClose} className={stageBtnSecondary}>
          닫기
        </button>
      </div>

      <div className="mb-3 flex flex-wrap gap-1.5">
        {TEAM_PERSONA_PROMPTS.map((prompt) => (
          <button
            key={prompt.id}
            type="button"
            onClick={() => setActiveId(prompt.id)}
            className={[
              "rounded-md border px-2.5 py-1.5 text-[13px] font-semibold",
              activeId === prompt.id
                ? "border-spotlight bg-spotlight text-on-spotlight"
                : "border-border-warm bg-cream text-foreground",
            ].join(" ")}
          >
            {prompt.name} · {prompt.role}
          </button>
        ))}
      </div>

      {active ? (
        <article className="rounded-xl border border-border-warm bg-white px-4 py-3">
          <p className={`mb-1 ${stageCaption}`}>
            {active.name}({active.role})
          </p>
          <p className="text-[16px] font-semibold leading-relaxed text-foreground break-keep">
            <LocalizedText>{active.question}</LocalizedText>
          </p>
          <p className={`mt-2 ${stageCaption}`}>
            Kevin은 답을 만들지 않아요. 이 질문을 붙들고 아이디어 칸에 적어
            보세요.
          </p>
          {onPick ? (
            <button
              type="button"
              onClick={() => onPick(active)}
              className={`${stageBtnSecondary} mt-3`}
            >
              이 질문으로 칸 열기
            </button>
          ) : null}
        </article>
      ) : null}
    </div>
  );
}
