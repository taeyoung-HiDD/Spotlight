"use client";

import { IconMicrophone, IconTrash } from "@tabler/icons-react";
import { useCallback, useId, useRef, useState } from "react";
import {
  removeTeamDebriefAudio,
  summarizeTeamDebriefAudio,
  uploadTeamDebriefAudio,
} from "@/lib/stages/stage4/teamDebriefClient";
import type { ResearchMediaFile } from "@/lib/stages/stage4/researchMediaTypes";
import {
  stageBtnPrimary,
  stageBtnSecondary,
  stageCaption,
  stageField,
  stageLabel,
  stagePanel,
  stageTextarea,
} from "@/lib/stages/ui";

interface TeamDebriefSectionProps {
  projectId: string;
  note: string;
  mediaFiles: ResearchMediaFile[];
  onNoteChange: (note: string) => void;
  onMediaChange: (files: ResearchMediaFile[]) => void;
  onRequestKevinDebrief: () => void;
  kevinDebriefLoading: boolean;
  kevinDebriefDisabled: boolean;
}

function appendSummaryBlock(existing: string, summary: string, fileName: string) {
  const header = `\n\n---\n[음성 정리 · ${fileName}]\n`;
  const block = `${header}${summary}`;
  return existing.trim() ? `${existing.trim()}${block}` : summary.trim();
}

export function TeamDebriefSection({
  projectId,
  note,
  mediaFiles,
  onNoteChange,
  onMediaChange,
  onRequestKevinDebrief,
  kevinDebriefLoading,
  kevinDebriefDisabled,
}: TeamDebriefSectionProps) {
  const audioInputId = useId();
  const audioRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAudioFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return;
      setUploading(true);
      setError(null);
      const next = [...mediaFiles];

      try {
        let currentNote = note;
        for (const file of Array.from(files)) {
          const media = await uploadTeamDebriefAudio({ projectId, file });
          next.push(media);
          const summary = await summarizeTeamDebriefAudio(media, projectId);
          currentNote = appendSummaryBlock(
            currentNote,
            summary,
            media.fileName,
          );
        }
        onMediaChange(next);
        onNoteChange(currentNote);
      } catch (e) {
        setError(e instanceof Error ? e.message : "음성 처리에 실패했습니다.");
      } finally {
        setUploading(false);
      }
    },
    [mediaFiles, note, onMediaChange, onNoteChange, projectId],
  );

  const removeAudio = useCallback(
    async (media: ResearchMediaFile) => {
      const ok = window.confirm(`「${media.fileName}」을(를) 삭제할까요?`);
      if (!ok) return;
      setError(null);
      try {
        await removeTeamDebriefAudio(media);
        onMediaChange(mediaFiles.filter((m) => m.id !== media.id));
      } catch (e) {
        setError(e instanceof Error ? e.message : "삭제에 실패했습니다.");
      }
    },
    [mediaFiles, onMediaChange],
  );

  return (
    <section className={stagePanel}>
      <label className={stageLabel}>팀 디브리핑 메모</label>
      <p className={`mt-1 ${stageCaption}`}>
        세션 직후 팀이 나눈 내용을 적거나, 디브리핑 음성을 올리면 자동으로
        정리돼요. 조사자별 인사이트는 각 대상의 「발견한 것」에 직접 적어
        주세요.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <input
          ref={audioRef}
          id={audioInputId}
          type="file"
          accept="audio/*"
          multiple
          className="sr-only"
          onChange={(e) => {
            void handleAudioFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          disabled={uploading}
          onClick={() => audioRef.current?.click()}
          className={stageBtnSecondary}
        >
          <IconMicrophone className="mr-1 inline size-4" stroke={1.75} />
          디브리핑 음성
        </button>
        <button
          type="button"
          disabled={kevinDebriefLoading || kevinDebriefDisabled}
          onClick={onRequestKevinDebrief}
          className={stageBtnPrimary}
        >
          {kevinDebriefLoading
            ? "Kevin이 정리하는 중…"
            : "Kevin에게 디브리핑 요청"}
        </button>
      </div>

      {uploading ? (
        <p className={`mt-2 ${stageCaption}`}>음성을 올리고 정리하는 중…</p>
      ) : null}
      {error ? (
        <p className="mt-2 text-[14px] text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {mediaFiles.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {mediaFiles.map((media) => (
            <li
              key={media.id}
              className="flex items-center justify-between gap-2 rounded-md border border-border-warm bg-cream/50 px-3 py-2"
            >
              <span className="min-w-0 truncate text-[13px] font-medium text-foreground">
                {media.fileName || "디브리핑 음성"}
              </span>
              <button
                type="button"
                aria-label="삭제"
                onClick={() => void removeAudio(media)}
                className="shrink-0 rounded p-1 text-muted hover:bg-panel hover:text-foreground"
              >
                <IconTrash className="size-4" stroke={1.75} />
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <textarea
        rows={5}
        value={note}
        onChange={(e) => onNoteChange(e.target.value)}
        placeholder="의외였던 점 · 핵심 인용 · 다음에 확인할 것"
        className={`mt-3 w-full rounded-md border border-border-warm px-3 py-2 ${stageField} ${stageTextarea}`}
      />
      <p className={`mt-2 ${stageCaption}`}>
        Kevin에게 디브리핑 요청을 누르면 포스트잇·사진·영상·음성 자료를 종합해
        오른쪽 코치 패널에서 디브리핑을 받을 수 있어요.
      </p>
    </section>
  );
}
