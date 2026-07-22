"use client";

import { IconArrowRight } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { LocalizedEditableTextarea } from "@/components/i18n/LocalizedEditableField";
import { StageRevealGroup } from "@/components/stage/motion/StageReveal";
import type { CoachInputGuide } from "@/lib/coach/inputGuidance";
import {
  fetchStage1CollectState,
  saveStage1CollectState,
  type Stage1PersistedState,
} from "@/lib/artifacts/stage1Collect";
import {
  advanceStage1Collect,
  getCollectInputGuideForStep,
  normalizeLegacyCollectStep,
  type Stage1CollectedData,
  type Stage1CollectStep,
} from "@/lib/stages/stage1/collectFlow";
import { STAGE1_CUSTOMER_PROBLEM_RATIONALE_BRIEF } from "@/lib/stages/stage1/customerProblemRationale";
import type { UserCoachingLevel } from "@/lib/stages/stage1/levelDiagnostic";
import {
  stageBtnPrimary,
  stageCaption,
  stageField,
  stageInput,
  stageLabel,
  stagePanel,
  stageSectionLead,
  stageSectionTitle,
  stageTextarea,
} from "@/lib/stages/ui";

interface Stage1ConversationalCollectProps {
  projectId: string;
  startingPoint: string;
  initialProjectTitle?: string;
  displayName?: string;
  userLevel?: "beginner" | "expert";
  /** 팀원 — 프로젝트 합류 후 사전 조사로 이어짐 */
  isInviteMember?: boolean;
  persistedState?: Stage1PersistedState | null;
  onComplete: (data: Stage1CollectedData) => void;
  /** 프로젝트 이름 단계 저장 시 GNB 제목 동기화 */
  onProjectTitleChange?: (title: string) => void;
}

function toCollected(
  state: Stage1PersistedState,
  displayName?: string,
  userLevel?: UserCoachingLevel,
): Stage1CollectedData {
  return {
    displayName: displayName ?? state.displayName,
    userLevel: userLevel ?? state.userLevel,
    startingPoint: state.startingPoint,
    projectTitle: state.projectTitle,
    teamWantsCollaboration: state.teamWantsCollaboration,
    hope: "",
    fear: "",
    principleAck: state.principleAck,
  };
}

/** 단계 1 · 프로젝트 이름 · 고객 문제/아이디어 (작업 패널) */
export function Stage1ConversationalCollect({
  projectId,
  startingPoint: startingPointProp,
  initialProjectTitle = "",
  displayName,
  userLevel,
  isInviteMember = false,
  persistedState,
  onComplete,
  onProjectTitleChange,
}: Stage1ConversationalCollectProps) {
  const initialStep: Stage1CollectStep = isInviteMember
    ? "project_name"
    : (persistedState?.collectStep ?? "project_name");

  const [step, setStep] = useState<Stage1CollectStep>(initialStep);
  const [inputGuide, setInputGuide] = useState<CoachInputGuide | undefined>(() =>
    getCollectInputGuideForStep(initialStep),
  );
  const [data, setData] = useState<Stage1CollectedData>(() => ({
    startingPoint:
      persistedState?.startingPoint?.trim() || startingPointProp.trim(),
    projectTitle:
      persistedState?.projectTitle?.trim() || initialProjectTitle.trim(),
    teamWantsCollaboration: persistedState?.teamWantsCollaboration ?? null,
    hope: "",
    fear: "",
    principleAck: persistedState?.principleAck ?? false,
    displayName,
    userLevel,
  }));
  const [draft, setDraft] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [artifactId, setArtifactId] = useState<string | null>(null);
  const [seeded, setSeeded] = useState(false);
  const completingRef = useRef(false);
  const [pendingComplete, setPendingComplete] =
    useState<Stage1CollectedData | null>(null);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    if (!pendingComplete) return;
    onCompleteRef.current(pendingComplete);
  }, [pendingComplete]);

  const persist = useCallback(
    async (next: Stage1CollectedData, nextStep: Stage1CollectStep | "done") => {
      const state: Stage1PersistedState = {
        startingPoint: next.startingPoint,
        projectTitle: next.projectTitle,
        teamWantsCollaboration: next.teamWantsCollaboration,
        collectStep:
          nextStep === "done" ? "team_collaboration" : nextStep,
        displayName: next.displayName,
        userLevel: next.userLevel,
        hope: "",
        fear: "",
        principleAck: next.principleAck,
      };
      const id = await saveStage1CollectState(projectId, state, artifactId);
      setArtifactId(id);
    },
    [artifactId, projectId],
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { artifactId: aid, state } = await fetchStage1CollectState(projectId);
        if (cancelled) return;
        setArtifactId(aid);
        if (
          state.startingPoint ||
          state.projectTitle ||
          state.collectStep !== "starting_point"
        ) {
          const collected = toCollected(state, displayName, userLevel);
          setData((prev) => ({ ...prev, ...collected }));
          const restoredStep = normalizeLegacyCollectStep(
            state.collectStep,
            collected,
          );
          const isComplete =
            state.principleAck ||
            (collected.startingPoint.trim() && collected.projectTitle.trim());
          if (isComplete && !completingRef.current) {
            completingRef.current = true;
            setPendingComplete({
              ...collected,
              principleAck: true,
              displayName,
              userLevel,
            });
          } else if (!isComplete) {
            setStep(restoredStep);
            setInputGuide(getCollectInputGuideForStep(restoredStep));
            setDraft(
              restoredStep === "project_name"
                ? collected.projectTitle
                : collected.startingPoint,
            );
          }
        }
      } catch {
        /* 로컬 상태로 진행 */
      } finally {
        if (!cancelled) setSeeded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, displayName, userLevel]);

  const applyAdvance = useCallback(
    (
      patch: Partial<Stage1CollectedData>,
      nextStep: Stage1CollectStep | "done",
    ) => {
      if (nextStep === "done") {
        if (completingRef.current) return;
        completingRef.current = true;
        setData((prev) => {
          const merged: Stage1CollectedData = {
            ...prev,
            ...patch,
            hope: "",
            fear: "",
            principleAck: true,
            displayName,
            userLevel,
          };
          void persist(merged, "done");
          queueMicrotask(() => setPendingComplete(merged));
          return merged;
        });
        return;
      }

      const titleToSync = patch.projectTitle?.trim();
      if (titleToSync) {
        onProjectTitleChange?.(titleToSync);
      }

      setData((prev) => {
        const merged = { ...prev, ...patch, displayName, userLevel };
        void persist(merged, nextStep);
        return merged;
      });
      setStep(nextStep);
      setInputGuide(getCollectInputGuideForStep(nextStep));
      setDraft("");
      setFormError(null);
    },
    [displayName, userLevel, onProjectTitleChange, persist],
  );

  const handleSubmit = useCallback(
    (event: React.FormEvent) => {
      event.preventDefault();

      const { patch, nextStep, coachReply } = advanceStage1Collect(
        step,
        draft.trim(),
        {
          startingPoint: data.startingPoint || startingPointProp,
          projectTitle: data.projectTitle || initialProjectTitle,
          displayName,
        },
      );

      if (nextStep === step && Object.keys(patch).length === 0) {
        setFormError(coachReply);
        return;
      }

      applyAdvance(patch, nextStep);
    },
    [
      applyAdvance,
      data.projectTitle,
      data.startingPoint,
      displayName,
      draft,
      initialProjectTitle,
      startingPointProp,
      step,
    ],
  );

  if (!seeded) return null;

  const isProjectNameStep = step === "project_name";

  return (
    <StageRevealGroup>
      <section className={stagePanel}>
        <p className={stageLabel}>
          {isProjectNameStep ? "프로젝트 이름" : "고객 문제·아이디어"}
        </p>
        <h2 className={`mt-1 ${stageSectionTitle}`}>
          {isProjectNameStep
            ? "목록에 쓸 프로젝트 이름을 정해 주세요"
            : "생각하신 고객 문제와 아이디어를 적어 주세요"}
        </h2>
        <p className={`mt-2 ${stageSectionLead}`}>
          {isProjectNameStep
            ? "팀 초대·프로젝트 목록에서 구분할 짧은 이름이면 충분해요."
            : data.projectTitle.trim()
              ? `프로젝트 「${data.projectTitle.trim()}」의 출발점이 될 내용이에요. ${STAGE1_CUSTOMER_PROBLEM_RATIONALE_BRIEF}`
              : STAGE1_CUSTOMER_PROBLEM_RATIONALE_BRIEF}
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          {isProjectNameStep ? (
            <label className="block">
              <span className={`block ${stageLabel}`}>프로젝트 이름</span>
              <input
                type="text"
                value={draft}
                onChange={(e) => {
                  setDraft(e.target.value);
                  setFormError(null);
                }}
                placeholder={inputGuide?.placeholder ?? "프로젝트 이름을 입력하세요"}
                className={`mt-4 block w-full rounded-lg border border-border-warm px-3.5 py-2.5 ${stageField} ${stageInput}`}
                autoFocus
              />
            </label>
          ) : (
            <label className="block">
              <span className={`block ${stageLabel}`}>고객 문제 · 아이디어</span>
              <LocalizedEditableTextarea
                value={draft}
                onValueChange={(next) => {
                  setDraft(next);
                  setFormError(null);
                }}
                placeholder={
                  inputGuide?.placeholder ??
                  "사용자 문제, 떠오른 아이디어를 모두 적어 주세요…"
                }
                rows={6}
                className={`mt-4 block w-full rounded-lg border border-border-warm px-3.5 py-2.5 ${stageField} ${stageTextarea}`}
                autoFocus
              />
            </label>
          )}

          {inputGuide?.hint ? (
            <p className={stageCaption}>{inputGuide.hint}</p>
          ) : null}

          {inputGuide?.examples?.length ? (
            <div className="rounded-lg border border-border-warm bg-cream/40 px-3 py-2.5">
              <p className={`mb-1.5 ${stageCaption}`}>
                {inputGuide.title ?? "예시"}
              </p>
              <ul className={`space-y-1 ${stageCaption}`}>
                {inputGuide.examples.slice(0, 3).map((example) => (
                  <li key={example} className="break-keep">
                    · {example}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {formError ? (
            <p className="text-[14px] text-destructive break-keep">{formError}</p>
          ) : null}

          <button
            type="submit"
            className={`${stageBtnPrimary} inline-flex items-center justify-center gap-1.5`}
          >
            {isProjectNameStep ? "다음 · 문제·아이디어" : "다음"}
            <IconArrowRight className="size-4" stroke={2} aria-hidden />
          </button>
        </form>
      </section>
    </StageRevealGroup>
  );
}
