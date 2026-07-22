"use client";

import { IconPhotoPlus, IconSparkles, IconTrash, IconX } from "@tabler/icons-react";
import { useRef, useState } from "react";
import {
  LocalizedEditableInput,
  LocalizedEditableTextarea,
} from "@/components/i18n/LocalizedEditableField";
import { IdeaSketchCard } from "@/components/stage/stage8/IdeaSketchCard";
import { IdeaSketchGenerateProgress } from "@/components/stage/stage8/IdeaSketchGenerateProgress";
import { requestIdeaSketchImage } from "@/lib/ai/client/stageAiClient";
import { useSimulatedAsyncProgress } from "@/hooks/useSimulatedAsyncProgress";
import {
  createIdeaId,
  type IdeaGridData,
  type IdeaSketch,
  upsertIdeaAtCell,
} from "@/lib/stages/stage8/ideaGridTypes";
import { hmwForCell } from "@/lib/stages/stage8/bootstrapIdeaGridFromHmw";
import type { HmwQuestion } from "@/lib/stages/stage7/hmwTypes";
import {
  stageBtnPrimary,
  stageBtnSecondary,
  stageCaption,
  stageField,
} from "@/lib/stages/ui";

const MAX_SKETCH_BYTES = 5 * 1024 * 1024;

/** 컷 12b — 입력 영역 상·좌 여백 */
const ideaInputShell =
  "w-full rounded-lg border border-border-warm bg-cream pt-3.5 pb-3 pr-3.5 pl-4 outline-none placeholder:text-subtle focus:border-spotlight/50";

interface IdeaInputSketchPanelProps {
  projectId: string;
  data: IdeaGridData;
  cellIndex: number;
  hmwQuestions: HmwQuestion[];
  onChange: (data: IdeaGridData) => void;
  onClose: () => void;
}

export function IdeaInputSketchPanel({
  projectId,
  data,
  cellIndex,
  hmwQuestions,
  onChange,
  onClose,
}: IdeaInputSketchPanelProps) {
  const existing = data.slots[cellIndex];
  const cellHmw = hmwForCell(data, hmwQuestions, cellIndex);
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [description, setDescription] = useState(existing?.description ?? "");
  const [sketchDataUrl, setSketchDataUrl] = useState(existing?.sketchDataUrl ?? "");
  const sourceHmwId = existing?.sourceHmwId || cellHmw?.id || "";
  const [sketchError, setSketchError] = useState<string | null>(null);
  const [generatingSketch, setGeneratingSketch] = useState(false);
  const { progress, remainingSec, markComplete, reset } =
    useSimulatedAsyncProgress(generatingSketch);

  const selectedHmw =
    hmwQuestions.find((q) => q.id === sourceHmwId) ?? cellHmw;

  const handleSketchFile = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setSketchError("PNG·JPG 이미지만 올릴 수 있어요.");
      return;
    }
    if (file.size > MAX_SKETCH_BYTES) {
      setSketchError("이미지는 최대 5MB까지 올릴 수 있어요.");
      return;
    }
    setSketchError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setSketchDataUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateSketch = async () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setSketchError("한 줄 제목을 먼저 적어 주세요.");
      return;
    }

    setSketchError(null);
    setGeneratingSketch(true);
    try {
      const result = await requestIdeaSketchImage({
        projectId,
        title: trimmedTitle,
        description: description.trim(),
        hmwText: selectedHmw?.hmwText.trim() ?? "",
      });
      markComplete();
      await new Promise((resolve) => setTimeout(resolve, 400));
      setSketchDataUrl(result.imageUrl);
    } catch (error) {
      setSketchError(
        error instanceof Error
          ? error.message
          : "아이디어 스케치 생성에 실패했습니다.",
      );
    } finally {
      setGeneratingSketch(false);
      reset();
    }
  };

  const sketchBusy = generatingSketch;

  const handleSave = () => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) return;
    const idea: IdeaSketch = {
      id: existing?.id ?? createIdeaId(),
      title: trimmedTitle,
      description: description.trim(),
      tags: existing?.tags ?? [],
      sketchDataUrl,
      sourceHmwId: selectedHmw?.id ?? sourceHmwId,
      sourceHmwText: selectedHmw?.hmwText.trim() ?? existing?.sourceHmwText ?? "",
      scamperLetter: existing?.scamperLetter,
      parentIdeaId: existing?.parentIdeaId,
    };
    onChange(upsertIdeaAtCell(data, cellIndex, idea));
  };

  const handleRemove = () => {
    onChange({
      ...data,
      slots: data.slots.map((slot, idx) => (idx === cellIndex ? null : slot)),
      selectedCellIndex: null,
      activeView: "grid",
    });
  };

  return (
    <div className="rounded-2xl border-[1.5px] border-spotlight bg-panel p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-highlight px-2 py-0.5 text-[11px] font-medium text-gold">
              {cellIndex + 1}번 칸
            </span>
            <span className={`${stageCaption} text-muted`}>9 그리드 안</span>
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            {existing ? "아이디어 수정" : "새 아이디어 추가"}
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

      {selectedHmw?.hmwText.trim() ? (
        <div className="mb-4 rounded-xl border border-gold/35 bg-highlight px-3.5 py-3">
          <p className={`mb-1.5 ${stageCaption} text-gold`}>이 칸의 HMW 질문</p>
          <p className="text-sm leading-relaxed text-foreground break-keep">
            {selectedHmw.hmwText.trim()}
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 md:items-stretch">
        <div className="space-y-4 pt-1">
          <div>
            <p className={`mb-2 ${stageCaption}`}>한 줄 제목</p>
            <LocalizedEditableInput
              type="text"
              value={title}
              onValueChange={setTitle}
              placeholder="예 · 침묵 모드 자동 입력"
              className={`${ideaInputShell} ${stageField} text-sm font-medium`}
            />
          </div>
          <div>
            <p className={`mb-2 ${stageCaption}`}>짧은 설명</p>
            <LocalizedEditableTextarea
              value={description}
              onValueChange={setDescription}
              placeholder="어떤 경험·기능인지 짧게 적어 보세요."
              rows={4}
              className={`${ideaInputShell} ${stageField} min-h-[5.5rem] resize-none text-sm leading-relaxed`}
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-col pt-1">
          <p className={`mb-1.5 shrink-0 ${stageCaption}`}>스케치 업로드 · AI 생성 · 선택</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            disabled={sketchBusy}
            onChange={(e) => handleSketchFile(e.target.files?.[0] ?? null)}
          />
          <div className="flex min-h-0 flex-1 flex-col gap-2">
          {generatingSketch ? (
            <IdeaSketchGenerateProgress
              progress={progress}
              remainingSec={remainingSec}
            />
          ) : sketchDataUrl ? (
            <div className="flex min-h-0 flex-1 flex-col gap-2">
              <IdeaSketchCard
                imageUrl={sketchDataUrl}
                onClear={() => setSketchDataUrl("")}
                clearDisabled={sketchBusy}
              />
              <div className="flex shrink-0 flex-wrap gap-2">
                <button
                  type="button"
                  disabled={sketchBusy}
                  onClick={() => fileRef.current?.click()}
                  className={`${stageBtnSecondary} text-xs`}
                >
                  이미지 다시 올리기
                </button>
                <button
                  type="button"
                  disabled={sketchBusy || !title.trim()}
                  onClick={() => void handleGenerateSketch()}
                  className={`${stageBtnSecondary} inline-flex items-center gap-1.5 text-xs`}
                >
                  <IconSparkles className="size-3.5" stroke={1.75} aria-hidden />
                  AI로 다시 그리기
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                type="button"
                disabled={sketchBusy}
                onClick={() => fileRef.current?.click()}
                className="flex min-h-[7rem] flex-1 flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-muted bg-cream px-4 py-4 text-center hover:border-spotlight/50 hover:bg-highlight/40 disabled:opacity-60"
              >
                <IconPhotoPlus className="size-7 text-muted" stroke={1.5} />
                <p className="text-sm font-medium text-foreground">
                  손그림 · 앱 캡처 · 웹 이미지
                </p>
                <p className={`${stageCaption} text-muted`}>
                  클릭해서 올려 주세요
                </p>
                <p className="text-[10px] text-muted">PNG · JPG · 최대 5MB</p>
              </button>
              <button
                type="button"
                disabled={sketchBusy || !title.trim()}
                onClick={() => void handleGenerateSketch()}
                className={`${stageBtnSecondary} inline-flex w-full shrink-0 items-center justify-center gap-1.5`}
              >
                <IconSparkles className="size-4 text-gold" stroke={1.75} aria-hidden />
                AI로 스케치 그리기
              </button>
              {!title.trim() ? (
                <p className={`shrink-0 ${stageCaption} text-muted`}>
                  AI 생성은 한 줄 제목을 먼저 적어 주세요. HMW·짧은 설명도 반영돼요.
                </p>
              ) : null}
            </>
          )}
          </div>
          {sketchError ? (
            <p className={`mt-2 shrink-0 ${stageCaption} text-red-600`}>{sketchError}</p>
          ) : null}
          <p className={`mt-2 shrink-0 ${stageCaption}`}>
            스케치는 이후 컨셉 시트 단계로 이어갈 수 있어요. AI 결과는 가설
            스케치예요.
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        {existing ? (
          <button type="button" onClick={handleRemove} className={stageBtnSecondary}>
            칸 비우기
          </button>
        ) : null}
        <button type="button" onClick={onClose} className={stageBtnSecondary}>
          취소
        </button>
        <button
          type="button"
          onClick={handleSave}
          disabled={!title.trim()}
          className={stageBtnPrimary}
        >
          저장 · {cellIndex + 1}번 칸에
        </button>
      </div>
    </div>
  );
}
