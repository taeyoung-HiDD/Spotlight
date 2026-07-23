"use client";

import { IconSparkles, IconX } from "@tabler/icons-react";
import { useState } from "react";
import { HmwQuestionSquareField } from "@/components/stage/stage7/HmwQuestionSquareField";
import { SynthesisPostitTextarea } from "@/components/stage/stage4/SynthesisPostitTextarea";
import { requestHmwGeneration } from "@/lib/stages/stage7/generateHmwClient";
import type { Stage7HmwData } from "@/lib/stages/stage7/hmwTypes";
import type { Stage5LatentNeedsData } from "@/lib/stages/stage5/latentNeedsTypes";
import { hmwForCell } from "@/lib/stages/stage8/bootstrapIdeaGridFromHmw";
import { saveGridCellNeedHmw } from "@/lib/stages/stage8/gridCellHmw";
import type { IdeaGridData } from "@/lib/stages/stage8/ideaGridTypes";
import {
  stageBtnPrimary,
  stageBtnSecondary,
  stageCaption,
  stageField,
} from "@/lib/stages/ui";

interface IdeaGridHmwSetupPanelProps {
  projectId: string;
  data: IdeaGridData;
  hmwData: Stage7HmwData;
  stage5Data: Stage5LatentNeedsData;
  cellIndex: number;
  onSave: (result: {
    grid: IdeaGridData;
    hmw: Stage7HmwData;
    stage5: Stage5LatentNeedsData;
  }) => Promise<void>;
  onClose: () => void;
}

export function IdeaGridHmwSetupPanel({
  projectId,
  data,
  hmwData,
  stage5Data,
  cellIndex,
  onSave,
  onClose,
}: IdeaGridHmwSetupPanelProps) {
  const existing = hmwForCell(data, hmwData.questions, cellIndex);
  const [latentNeedText, setLatentNeedText] = useState(
    existing?.latentNeedText ?? "",
  );
  const [hmwText, setHmwText] = useState(existing?.hmwText ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleGenerateHmw = async () => {
    const trimmedNeed = latentNeedText.trim();
    if (!trimmedNeed) {
      setError("잠재 니즈를 먼저 적어 주세요.");
      return;
    }

    setError(null);
    setGenerating(true);
    try {
      const questionId = existing?.id ?? `draft-${cellIndex}`;
      const result = await requestHmwGeneration(projectId, [
        { questionId, latentNeedText: trimmedNeed },
      ]);
      const generated = result.items[0]?.hmwText.trim();
      if (generated) {
        setHmwText(generated);
      } else {
        setError("HMW 초안을 만들지 못했어요. 직접 적어 보세요.");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "HMW 생성에 실패했습니다.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    const trimmedNeed = latentNeedText.trim();
    const trimmedHmw = hmwText.trim();
    if (!trimmedNeed) {
      setError("잠재 니즈를 적어 주세요.");
      return;
    }
    if (!trimmedHmw) {
      setError("HMW 질문을 적어 주세요.");
      return;
    }

    setError(null);
    setSaving(true);
    try {
      const result = saveGridCellNeedHmw({
        grid: data,
        hmw: hmwData,
        stage5: stage5Data,
        cellIndex,
        latentNeedText: trimmedNeed,
        hmwText: trimmedHmw,
      });
      await onSave(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "저장에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const busy = saving || generating;

  return (
    <div className="rounded-2xl border-[1.5px] border-spotlight bg-panel p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-highlight px-2 py-0.5 text-[11px] font-medium text-gold">
              {cellIndex + 1}번 칸
            </span>
            <span className={`${stageCaption} text-muted`}>출발점 만들기</span>
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            {existing?.latentNeedText.trim()
              ? "HMW 질문 이어서 작성"
              : "잠재 니즈 · HMW 질문"}
          </h3>
        </div>
        <button
          type="button"
          aria-label="닫기"
          onClick={onClose}
          className="rounded-md p-1 text-muted hover:bg-cream hover:text-foreground"
        >
          <IconX className="size-5" stroke={1.75} />
        </button>
      </div>

      <p className={`mb-4 ${stageCaption}`}>
        이 칸의 출발점이 비어 있어요. 잠재 니즈를 정리한 뒤 HMW 질문으로 바꿔
        보세요.
      </p>

      <div className="grid gap-5 md:grid-cols-2 md:items-start">
        <div>
          <p className={`mb-2 ${stageCaption}`}>잠재 니즈</p>
          <div className="source-latent-pair__paper synthesis-postit-paper synthesis-postit-paper--latent_need min-h-[10rem] rounded-lg p-3">
            <SynthesisPostitTextarea
              value={latentNeedText}
              onChange={setLatentNeedText}
              placeholder="사용자가 진짜 원하는 것은 …"
              autoFit={false}
              className={stageField}
            />
          </div>
        </div>

        <div>
          <HmwQuestionSquareField
            value={hmwText}
            onChange={setHmwText}
          />
          <button
            type="button"
            disabled={busy || !latentNeedText.trim()}
            onClick={() => void handleGenerateHmw()}
            className={`${stageBtnSecondary} mt-3 inline-flex w-full items-center justify-center gap-1.5 text-xs`}
          >
            <IconSparkles className="size-3.5 text-gold" stroke={1.75} aria-hidden />
            {generating ? "HMW 초안 만드는 중…" : "Kevin으로 HMW 초안"}
          </button>
        </div>
      </div>

      {error ? (
        <p className={`mt-3 ${stageCaption} text-red-600`}>{error}</p>
      ) : null}

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <button type="button" onClick={onClose} className={stageBtnSecondary}>
          취소
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={busy}
          className={stageBtnPrimary}
        >
          {saving ? "저장 중…" : "저장 · 그리드로"}
        </button>
      </div>
    </div>
  );
}
