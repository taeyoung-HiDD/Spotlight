"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { NeedHmwPairCard } from "@/components/stage/stage7/NeedHmwPairCard";
import { SubjectInitialBadge } from "@/components/stage/stage5/SubjectInitialBadge";
import { subjectDisplayLabel } from "@/lib/stages/stage5/subjectInitials";
import {
  addManualHmwQuestion,
  isManualHmwQuestion,
  updateHmwLatentNeed,
  updateHmwQuestion,
  type Stage7HmwData,
} from "@/lib/stages/stage7/hmwTypes";
import {
  stageBtnPrimary,
  stageBtnSecondary,
  stageCaption,
  stageLabel,
} from "@/lib/stages/ui";

type SubjectFilter = "all" | string;

interface HmwBoardProps {
  projectId: string;
  data: Stage7HmwData;
  onChange: (data: Stage7HmwData) => void;
  generating: boolean;
  onGenerate: () => void;
}

function subjectIndexMap(subjects: Stage7HmwData["subjects"]) {
  return new Map(subjects.map((s, i) => [s.id, i]));
}

export function HmwBoard({
  projectId,
  data,
  onChange,
  generating,
  onGenerate,
}: HmwBoardProps) {
  const [subjectFilter, setSubjectFilter] = useState<SubjectFilter>("all");
  const indexBySubject = subjectIndexMap(data.subjects);

  const filteredQuestions = useMemo(() => {
    if (subjectFilter === "all") return data.questions;
    return data.questions.filter((q) => q.subjectId === subjectFilter);
  }, [data.questions, subjectFilter]);

  const emptyCount = data.questions.filter((q) => !q.hmwText.trim()).length;

  useEffect(() => {
    if (
      subjectFilter !== "all" &&
      !data.subjects.some((subject) => subject.id === subjectFilter)
    ) {
      setSubjectFilter("all");
    }
  }, [data.subjects, subjectFilter]);

  if (!data.questions.length) {
    return (
      <div className="rounded-2xl border border-dashed border-border-warm bg-cream/50 px-5 py-8 text-center">
        <p className={`mb-2 ${stageLabel}`}>HMW 질문이 아직 없어요</p>
        <p className={`mb-5 ${stageCaption}`}>
          6단계에서 잠재 니즈를 가져올 수도 있고, 여기서 직접 니즈와 HMW를
          적어 시작할 수도 있어요.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => onChange(addManualHmwQuestion(data))}
            className={stageBtnPrimary}
          >
            HMW 질문 직접 추가
          </button>
          <Link
            href={`/project/${projectId}/stage/6`}
            className={stageBtnSecondary}
          >
            니즈 분석하기에서 가져오기
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setSubjectFilter("all")}
            className={[
              "inline-flex items-center rounded-md border px-3 py-1.5 text-[15px] font-semibold transition-colors break-keep",
              subjectFilter === "all"
                ? "border-spotlight bg-spotlight text-on-spotlight"
                : "border-border-warm bg-cream text-foreground hover:bg-surface",
            ].join(" ")}
          >
            전체 ({data.questions.length})
          </button>
          {data.subjects.map((subject, idx) => {
            const count = data.questions.filter(
              (q) => q.subjectId === subject.id,
            ).length;
            if (count === 0) return null;
            const active = subjectFilter === subject.id;
            return (
              <button
                key={subject.id}
                type="button"
                onClick={() => setSubjectFilter(subject.id)}
                className={[
                  "inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[15px] font-semibold transition-colors break-keep",
                  active
                    ? "border-spotlight bg-spotlight text-on-spotlight"
                    : "border-border-warm bg-cream text-foreground hover:bg-surface",
                ].join(" ")}
              >
                <SubjectInitialBadge
                  subject={subject}
                  subjectIndex={idx}
                  showTooltip={false}
                />
                {subjectDisplayLabel(subject.name, idx)} ({count})
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => onChange(addManualHmwQuestion(data))}
            className={stageBtnSecondary}
          >
            HMW 추가
          </button>
          <button
            type="button"
            onClick={onGenerate}
            disabled={generating || emptyCount === 0}
            className={stageBtnSecondary}
          >
            {generating
              ? "Kevin이 초안 만드는 중…"
              : emptyCount > 0
                ? `비어 있는 ${emptyCount}개 HMW 초안 만들기`
                : "모든 HMW가 채워졌어요"}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {filteredQuestions.map((question) => {
          const subjectIndex = indexBySubject.get(question.subjectId) ?? 0;
          const subject =
            data.subjects.find((s) => s.id === question.subjectId) ??
            data.subjects[subjectIndex] ?? {
              id: question.subjectId,
              name: "직접 입력",
              context: "",
              thumbnailUrl: "",
              researchMethodId: "",
            };
          const manual = isManualHmwQuestion(question);
          return (
            <NeedHmwPairCard
              key={question.id}
              question={question}
              subject={subject}
              subjectIndex={subjectIndex}
              onUpdateHmw={(text) =>
                onChange(updateHmwQuestion(data, question.id, text))
              }
              onUpdateLatentNeed={
                manual
                  ? (text) =>
                      onChange(updateHmwLatentNeed(data, question.id, text))
                  : undefined
              }
            />
          );
        })}
      </div>
    </div>
  );
}
