"use client";

import { IconPhotoPlus, IconSparkles, IconX } from "@tabler/icons-react";
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
  const [sketchDataUrl, setSketchDataUrl] = useState(
    existing?.sketchDataUrl ?? "",
  );
  const [referenceSketchDataUrl, setReferenceSketchDataUrl] = useState(
    existing?.referenceSketchDataUrl ?? "",
  );
  const sourceHmwId = existing?.sourceHmwId || cellHmw?.id || "";
  const [sketchError, setSketchError] = useState<string | null>(null);
  const [generatingSketch, setGeneratingSketch] = useState(false);
  const { progress, remainingSec, markComplete, reset } =
    useSimulatedAsyncProgress(generatingSketch);

  const selectedHmw =
    hmwQuestions.find((q) => q.id === sourceHmwId) ?? cellHmw;

  const canRequestReference =
    Boolean(title.trim()) && Boolean(description.trim());

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

  const handleGenerateReference = async () => {
    const trimmedTitle = title.trim();
    const trimmedDescription = description.trim();
    if (!trimmedTitle || !trimmedDescription) {
      setSketchError("참고 사례를 보려면 한 줄 제목과 짧은 설명을 먼저 적어 주세요.");
      return;
    }

    setSketchError(null);
    setGeneratingSketch(true);
    try {
      const result = await requestIdeaSketchImage({
        projectId,
        title: trimmedTitle,
        description: trimmedDescription,
        hmwText: selectedHmw?.hmwText.trim() ?? "",
      });
      markComplete();
      await new Promise((resolve) => setTimeout(resolve, 400));
      setReferenceSketchDataUrl(result.imageUrl);
    } catch (error) {
      setSketchError(
        error instanceof Error
          ? error.message
          : "참고 시각 사례를 만들지 못했습니다.",
      );
    } finally {
      setGeneratingSketch(false);
      reset();
    }
  };

  const handleAdoptReference = () => {
    if (!referenceSketchDataUrl.trim()) return;
    const ok = window.confirm(
      "참고 사례를 내 스케치 자리로 복사할까요? 지금 올려 둔 스케치가 있으면 바뀝니다.",
    );
    if (!ok) return;
    setSketchDataUrl(referenceSketchDataUrl);
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
      referenceSketchDataUrl: referenceSketchDataUrl.trim() || undefined,
      sourceHmwId: selectedHmw?.id ?? sourceHmwId,
      sourceHmwText: selectedHmw?.hmwText.trim() ?? existing?.sourceHmwText ?? "",
      scamperLetter: existing?.scamperLetter,
      parentIdeaId: existing?.parentIdeaId,
      stimulusId: existing?.stimulusId,
      stimulusType: existing?.stimulusType,
    };
    onChange(upsertIdeaAtCell(data, cellIndex, idea));
  };

  const handleRemove = () => {
    const current = data.slots[cellIndex];
    const nextSlots = data.slots.map((slot, idx) =>
      idx === cellIndex ? null : slot,
    );
    const bankedIdeas =
      current?.title.trim()
        ? [...(data.bankedIdeas ?? []).filter((i) => i.id !== current.id), current]
        : (data.bankedIdeas ?? []);
    onChange({
      ...data,
      slots: nextSlots,
      bankedIdeas,
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
            <span className={`${stageCaption} text-muted`}>아이디어 그리드</span>
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

        <div className="flex min-h-0 flex-col gap-3 pt-1">
          <div className="flex min-h-0 flex-1 flex-col">
            <p className={`mb-1.5 shrink-0 ${stageCaption}`}>
              내 스케치 (업로드 · 선택)
            </p>
            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              disabled={sketchBusy}
              onChange={(e) => handleSketchFile(e.target.files?.[0] ?? null)}
            />
            {sketchDataUrl ? (
              <div className="flex min-h-0 flex-1 flex-col gap-2">
                <IdeaSketchCard
                  imageUrl={sketchDataUrl}
                  onClear={() => setSketchDataUrl("")}
                  clearDisabled={sketchBusy}
                />
                <button
                  type="button"
                  disabled={sketchBusy}
                  onClick={() => fileRef.current?.click()}
                  className={`${stageBtnSecondary} text-xs`}
                >
                  이미지 다시 올리기
                </button>
              </div>
            ) : (
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
              </button>
            )}
          </div>

          <div className="flex min-h-0 flex-col rounded-xl border border-border-warm bg-cream/40 p-2.5">
            <p className={`mb-1.5 ${stageCaption}`}>
              참고할 만한 시각 사례 (Kevin)
            </p>
            {generatingSketch ? (
              <IdeaSketchGenerateProgress
                progress={progress}
                remainingSec={remainingSec}
              />
            ) : referenceSketchDataUrl ? (
              <div className="flex flex-col gap-2">
                <IdeaSketchCard
                  imageUrl={referenceSketchDataUrl}
                  alt="Reference sketch"
                  onClear={() => setReferenceSketchDataUrl("")}
                  clearDisabled={sketchBusy}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={sketchBusy || !canRequestReference}
                    onClick={() => void handleGenerateReference()}
                    className={`${stageBtnSecondary} inline-flex items-center gap-1.5 text-xs`}
                  >
                    <IconSparkles className="size-3.5" stroke={1.75} />
                    다른 참고 보기
                  </button>
                  <button
                    type="button"
                    disabled={sketchBusy}
                    onClick={handleAdoptReference}
                    className={`${stageBtnSecondary} text-xs`}
                  >
                    참고를 내 스케치로 복사…
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  type="button"
                  disabled={sketchBusy || !canRequestReference}
                  onClick={() => void handleGenerateReference()}
                  className={`${stageBtnSecondary} inline-flex w-full items-center justify-center gap-1.5`}
                >
                  <IconSparkles className="size-4 text-gold" stroke={1.75} />
                  참고 시각 사례 보기
                </button>
                {!canRequestReference ? (
                  <p className={`mt-1.5 ${stageCaption} text-muted`}>
                    제목과 짧은 설명을 먼저 적으면, 비슷한 상황에서 이런 표현도
                    있어요 — 참고용으로 볼 수 있어요.
                  </p>
                ) : (
                  <p className={`mt-1.5 ${stageCaption} text-muted`}>
                    내 아이디어를 대체하지 않아요. 옆에 두고 참고만 하세요.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {sketchError ? (
        <p className={`mt-3 ${stageCaption} text-red-600`}>{sketchError}</p>
      ) : null}

      <div className="mt-5 flex flex-wrap justify-end gap-2">
        {existing ? (
          <button type="button" onClick={handleRemove} className={stageBtnSecondary}>
            보류함으로 · 칸 비우기
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
