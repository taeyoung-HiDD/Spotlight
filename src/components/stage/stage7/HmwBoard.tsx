"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { NeedHmwPairCard } from "@/components/stage/stage7/NeedHmwPairCard";
import { SubjectInitialBadge } from "@/components/stage/stage5/SubjectInitialBadge";
import { subjectDisplayLabel } from "@/lib/stages/stage5/subjectInitials";
import {
  addManualHmwQuestion,
  isManualHmwQuestion,
  placedHmwNeedIds,
  sortedHmwNeedGroups,
  updateHmwLatentNeed,
  updateHmwQuestion,
  type HmwQuestion,
  type Stage7HmwData,
} from "@/lib/stages/stage7/hmwTypes";
import {
  stageBtnPrimary,
  stageBtnSecondary,
  stageCaption,
  stageLabel,
} from "@/lib/stages/ui";

type IdFilter = "all" | string;

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

function chipClass(active: boolean): string {
  return [
    "inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-[15px] font-semibold transition-colors break-keep",
    active
      ? "border-spotlight bg-spotlight text-on-spotlight"
      : "border-border-warm bg-cream text-foreground hover:bg-surface",
  ].join(" ");
}

export function HmwBoard({
  projectId,
  data,
  onChange,
  generating,
  onGenerate,
}: HmwBoardProps) {
  const [subjectFilter, setSubjectFilter] = useState<IdFilter>("all");
  const [groupFilter, setGroupFilter] = useState<IdFilter>("all");
  const indexBySubject = subjectIndexMap(data.subjects);
  const needGroups = useMemo(() => sortedHmwNeedGroups(data), [data]);
  const hasGroups = needGroups.length > 0;
  const placedNeedIds = useMemo(() => placedHmwNeedIds(data), [data]);

  const subjectFiltered = useMemo(() => {
    if (subjectFilter === "all") return data.questions;
    return data.questions.filter((q) => q.subjectId === subjectFilter);
  }, [data.questions, subjectFilter]);

  const filteredQuestions = useMemo(() => {
    if (!hasGroups || groupFilter === "all") return subjectFiltered;
    if (groupFilter === "__ungrouped__") {
      return subjectFiltered.filter(
        (q) => !placedNeedIds.has(q.latentNeedId),
      );
    }
    const memberIds = new Set(data.needGroupMemberIds?.[groupFilter] ?? []);
    return subjectFiltered.filter((q) => memberIds.has(q.latentNeedId));
  }, [
    data.needGroupMemberIds,
    groupFilter,
    hasGroups,
    placedNeedIds,
    subjectFiltered,
  ]);

  const groupedSections = useMemo(() => {
    if (!hasGroups || groupFilter !== "all") return null;

    const byId = new Map(
      filteredQuestions.map((q) => [q.latentNeedId, q] as const),
    );
    const sections: Array<{
      key: string;
      title: string;
      questions: HmwQuestion[];
    }> = [];

    for (const group of needGroups) {
      const questions = (data.needGroupMemberIds?.[group.id] ?? [])
        .map((id) => byId.get(id))
        .filter((q): q is HmwQuestion => Boolean(q));
      if (questions.length === 0) continue;
      sections.push({
        key: group.id,
        title: group.name,
        questions,
      });
    }

    const ungrouped = filteredQuestions.filter(
      (q) => !placedNeedIds.has(q.latentNeedId),
    );
    if (ungrouped.length > 0) {
      sections.push({
        key: "__ungrouped__",
        title: "미분류",
        questions: ungrouped,
      });
    }

    return sections;
  }, [
    data.needGroupMemberIds,
    filteredQuestions,
    groupFilter,
    hasGroups,
    needGroups,
    placedNeedIds,
  ]);

  const pairIndexById = useMemo(() => {
    const map = new Map<string, number>();
    data.questions.forEach((q, i) => map.set(q.id, i + 1));
    return map;
  }, [data.questions]);

  const emptyCount = data.questions.filter((q) => !q.hmwText.trim()).length;
  const ungroupedCount = data.questions.filter(
    (q) => !placedNeedIds.has(q.latentNeedId),
  ).length;

  useEffect(() => {
    if (
      subjectFilter !== "all" &&
      !data.subjects.some((subject) => subject.id === subjectFilter)
    ) {
      setSubjectFilter("all");
    }
  }, [data.subjects, subjectFilter]);

  useEffect(() => {
    if (groupFilter === "all" || groupFilter === "__ungrouped__") return;
    if (!needGroups.some((group) => group.id === groupFilter)) {
      setGroupFilter("all");
    }
  }, [groupFilter, needGroups]);

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

  const renderCard = (question: HmwQuestion) => {
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
        pairIndex={pairIndexById.get(question.id) ?? 1}
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
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-3">
          <div>
            <p className={`mb-1.5 ${stageLabel}`}>조사 대상</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setSubjectFilter("all")}
                className={chipClass(subjectFilter === "all")}
              >
                전체 ({data.questions.length})
              </button>
              {data.subjects.map((subject, idx) => {
                const count = data.questions.filter(
                  (q) => q.subjectId === subject.id,
                ).length;
                if (count === 0) return null;
                return (
                  <button
                    key={subject.id}
                    type="button"
                    onClick={() => setSubjectFilter(subject.id)}
                    className={chipClass(subjectFilter === subject.id)}
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
          </div>

          {hasGroups ? (
            <div>
              <p className={`mb-1.5 ${stageLabel}`}>니즈 그룹</p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setGroupFilter("all")}
                  className={chipClass(groupFilter === "all")}
                >
                  전체 ({data.questions.length})
                </button>
                {needGroups.map((group) => {
                  const count = (
                    data.needGroupMemberIds?.[group.id] ?? []
                  ).filter((id) =>
                    data.questions.some((q) => q.latentNeedId === id),
                  ).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => setGroupFilter(group.id)}
                      className={chipClass(groupFilter === group.id)}
                    >
                      {group.name} ({count})
                    </button>
                  );
                })}
                {ungroupedCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => setGroupFilter("__ungrouped__")}
                    className={chipClass(groupFilter === "__ungrouped__")}
                  >
                    미분류 ({ungroupedCount})
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}
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

      {groupedSections ? (
        groupedSections.length === 0 ? (
          <p
            className={`rounded-xl border border-dashed border-border-warm bg-cream/40 px-4 py-8 text-center ${stageCaption}`}
          >
            선택한 조사 대상·그룹에 해당하는 항목이 없어요.
          </p>
        ) : (
          <div className="space-y-6">
            {groupedSections.map((section) => (
              <section key={section.key} className="space-y-3">
                <div className="flex items-baseline gap-2 border-b border-border-warm/70 pb-1.5">
                  <h3 className="text-[15px] font-semibold text-foreground break-keep">
                    {section.title}
                  </h3>
                  <span className={stageCaption}>
                    {section.questions.length}개
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {section.questions.map(renderCard)}
                </div>
              </section>
            ))}
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {filteredQuestions.length === 0 ? (
            <p
              className={`rounded-xl border border-dashed border-border-warm bg-cream/40 px-4 py-8 text-center lg:col-span-2 ${stageCaption}`}
            >
              선택한 조사 대상·그룹에 해당하는 항목이 없어요.
            </p>
          ) : (
            filteredQuestions.map(renderCard)
          )}
        </div>
      )}
    </div>
  );
}
