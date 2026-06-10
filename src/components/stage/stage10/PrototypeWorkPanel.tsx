"use client";

import { IconDeviceMobile, IconSparkles, IconWorld } from "@tabler/icons-react";
import { useCallback, useState, type ReactNode } from "react";
import { requestPrototypeHtml } from "@/lib/ai/client/stageAiClient";
import type { ConceptSheetData } from "@/lib/stages/stage9/conceptSheetTypes";
import type { PrototypeData, PrototypePlatform } from "@/lib/stages/stage10/prototypeTypes";
import {
  stageBtnPrimary,
  stageBtnSecondary,
  stageCaption,
  stagePanel,
  stageSectionLead,
  stageSectionTitle,
  stageWorkMeta,
} from "@/lib/stages/ui";

interface PrototypeWorkPanelProps {
  projectId: string;
  concept: ConceptSheetData;
  data: PrototypeData;
  onChange: (next: PrototypeData) => void;
  saving: boolean;
  saveError: string | null;
  lastSavedAt: string | null;
}

function HypothesisBadge() {
  return (
    <span className="rounded bg-cream px-1.5 py-0.5 text-[11px] font-medium text-gold">
      가설
    </span>
  );
}

export function PrototypeWorkPanel({
  projectId,
  concept,
  data,
  onChange,
  saving,
  saveError,
  lastSavedAt,
}: PrototypeWorkPanelProps) {
  const [generating, setGenerating] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);

  const setPlatform = (platform: PrototypePlatform) => {
    onChange({ ...data, platform });
  };

  const handleGenerate = useCallback(async () => {
    if (!concept.conceptName.trim()) {
      setAiError("9단계 컨셉 이름을 먼저 입력해 주세요.");
      return;
    }
    setAiError(null);
    setGenerating(true);
    try {
      const result = await requestPrototypeHtml({
        projectId,
        conceptName: concept.conceptName,
        conceptDescription: concept.oneLiner,
        features: concept.features.filter((f) => f.trim()),
        storyboardCuts: concept.storyboardCuts
          .map((c) => c.caption.trim())
          .filter(Boolean),
        platform: data.platform,
        latentNeed: concept.trueNeed,
      });
      onChange({
        ...data,
        html: result.html,
        model: result.model,
        generatedAt: new Date().toISOString(),
      });
    } catch (e) {
      setAiError(
        e instanceof Error ? e.message : "시제품 생성에 실패했습니다.",
      );
    } finally {
      setGenerating(false);
    }
  }, [concept, data, onChange, projectId]);

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border-[1.5px] border-spotlight bg-panel p-5 lg:p-6">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <IconSparkles className="size-4 text-gold" stroke={2} aria-hidden />
              <h2 className={stageSectionTitle}>
                {data.platform === "mobile" ? "Mobile" : "Web"} 시제품 화면
              </h2>
              <HypothesisBadge />
            </div>
            <p className={`mt-1 ${stageSectionLead}`}>
              스토리보드 5컷과 1:1 시간순 매핑 · Groq HTML 생성
            </p>
          </div>
          <button
            type="button"
            className={`${stageBtnPrimary} inline-flex items-center gap-1.5`}
            disabled={generating}
            onClick={() => void handleGenerate()}
          >
            <IconSparkles className="size-4" stroke={2} aria-hidden />
            {generating ? "생성 중…" : "AI 시제품 생성"}
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          <PlatformChip
            active={data.platform === "mobile"}
            onClick={() => setPlatform("mobile")}
            icon={<IconDeviceMobile className="size-4" stroke={2} />}
            label="Mobile"
          />
          <PlatformChip
            active={data.platform === "web"}
            onClick={() => setPlatform("web")}
            icon={<IconWorld className="size-4" stroke={2} />}
            label="Web"
          />
        </div>

        {concept.conceptName.trim() ? (
          <p className={`mb-4 ${stageWorkMeta}`}>
            컨셉: <span className="text-foreground">{concept.conceptName}</span>
            {concept.oneLiner.trim() ? ` · ${concept.oneLiner.trim()}` : ""}
          </p>
        ) : (
          <p className={`mb-4 ${stageWorkMeta} text-gold`}>
            9단계 컨셉 시트를 채우면 생성 품질이 좋아져요.
          </p>
        )}

        <div className="overflow-hidden rounded-xl border border-border-warm bg-cream">
          {data.html.trim() ? (
            <iframe
              title="시제품 미리보기"
              srcDoc={data.html}
              sandbox=""
              className="min-h-[520px] w-full bg-white"
            />
          ) : (
            <div className="flex min-h-[320px] items-center justify-center px-6 text-center text-[15px] text-muted">
              플랫폼을 고른 뒤 「AI 시제품 생성」을 누르면 여기에 미리보기가
              나타납니다.
            </div>
          )}
        </div>

        {data.html.trim() ? (
          <button
            type="button"
            className={`${stageBtnSecondary} mt-3`}
            disabled={generating}
            onClick={() => void handleGenerate()}
          >
            다시 생성
          </button>
        ) : null}
      </section>

      <p className={stageCaption}>
        {saving
          ? "저장 중…"
          : lastSavedAt
            ? `자동 저장 · ${lastSavedAt}`
            : "변경 시 자동 저장"}
        {saveError ? ` · ${saveError}` : ""}
        {aiError ? ` · ${aiError}` : ""}
        {data.model ? ` · 모델 ${data.model}` : ""}
      </p>
    </div>
  );
}

function PlatformChip({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[14px] font-medium transition-colors",
        active
          ? "border-spotlight bg-[#FFFDF4] text-foreground"
          : "border-border-warm bg-panel text-muted hover:bg-surface",
      ].join(" ")}
    >
      {icon}
      {label}
    </button>
  );
}
