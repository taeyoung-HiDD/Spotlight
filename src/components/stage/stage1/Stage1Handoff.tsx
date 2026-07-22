"use client";

import { useProjectWorkspace } from "@/components/project/ProjectWorkspaceContext";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StageIntroGateProvider } from "@/components/layout/StageIntroGate";
import { AnimatedCoachPanel } from "@/components/stage/motion/AnimatedCoachPanel";
import { StageRevealGroup } from "@/components/stage/motion/StageReveal";
import { Stage1ConversationalCollect } from "@/components/stage/stage1/Stage1ConversationalCollect";
import { Stage1OnboardingCollect } from "@/components/stage/stage1/Stage1OnboardingCollect";
import { getStageConfig } from "@/config/stageConfig";
import { introMessagesToCoachDialog } from "@/lib/coach/renderIntroMessages";
import type { Stage1CollectedData } from "@/lib/stages/stage1/collectFlow";
import type { UserCoachingLevel } from "@/lib/stages/stage1/levelDiagnostic";
import { resolveCoachingLevel } from "@/lib/stages/stage1/guidanceStyle";
import type { Stage1OnboardingResult } from "@/lib/stages/stage1/onboardingFlow";
import {
  fetchStage1CollectState,
  saveStage1CollectState,
  type Stage1PersistedState,
} from "@/lib/artifacts/stage1Collect";
import { createClient } from "@/lib/supabase/client";
import { fetchUserDisplayName } from "@/lib/users/displayName";
import { updateProjectTitleAction } from "@/lib/projects/updateProjectTitle";
import { useWorkspaceScrollOnEnter } from "@/lib/motion/pageEnterScroll";
import { pushWorkspaceVisit } from "@/lib/navigation/workspaceVisitHistory";
import {
  stageCoachBtnPrimary,
  stageCoachCaption,
  stageIntroEnterWork,
  stageIntroShell,
} from "@/lib/stages/ui";

type Stage1Phase = "intro" | "onboarding" | "collect";

interface Stage1HandoffProps {
  projectId: string;
  projectTitle: string;
  /** 초대로 합류한 팀원 — 온보딩 생략 */
  isInviteMember?: boolean;
}

export function Stage1Handoff({
  projectId,
  projectTitle: serverProjectTitle,
  isInviteMember = false,
}: Stage1HandoffProps) {
  const router = useRouter();
  const { setProjectTitle: syncWorkspaceProjectTitle, setCoachingLevel, setGuidanceStyle } =
    useProjectWorkspace();
  const stageConfig = getStageConfig(1);
  const sceneKey = `stage-1-${projectId}`;
  const [phase, setPhase] = useState<Stage1Phase>(
    isInviteMember ? "collect" : "onboarding",
  );
  const [introDialogDone, setIntroDialogDone] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [userLevel, setUserLevel] = useState<UserCoachingLevel>("beginner");
  const [startingPoint, setStartingPoint] = useState("");
  const [projectTitle, setProjectTitle] = useState(
    serverProjectTitle === "새 프로젝트" ? "" : serverProjectTitle,
  );
  const teamWantsCollaborationRef = useRef<boolean | null>(null);
  const [artifactId, setArtifactId] = useState<string | null>(null);

  useWorkspaceScrollOnEnter(phase);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const supabase = createClient();
        const profileName = await fetchUserDisplayName(supabase);
        if (cancelled) return;
        if (profileName.trim()) setDisplayName(profileName);

        const { artifactId: id, state } = await fetchStage1CollectState(projectId);
        if (cancelled) return;
        setArtifactId(id);
        if (state.projectTitle.trim()) {
          setProjectTitle(state.projectTitle);
          syncWorkspaceProjectTitle(state.projectTitle);
        }
        if (state.startingPoint.trim()) setStartingPoint(state.startingPoint);
        if (profileName.trim()) {
          setDisplayName(profileName);
        } else if (state.displayName?.trim()) {
          setDisplayName(state.displayName);
        }
        const resolvedLevel = resolveCoachingLevel(state);
        if (state.guidanceStyle) {
          setGuidanceStyle(state.guidanceStyle);
        }
        if (resolvedLevel) {
          setUserLevel(resolvedLevel);
          setCoachingLevel(resolvedLevel);
        }
        teamWantsCollaborationRef.current = state.teamWantsCollaboration;
        if (!isInviteMember) {
          const hasGuidanceStyle = Boolean(
            state.guidanceStyle || resolvedLevel,
          );
          const resumeCollect =
            state.principleAck ||
            state.collectStep === "team_collaboration" ||
            state.collectStep === "team_invite";
          if (resumeCollect) {
            setPhase("collect");
          } else if (!hasGuidanceStyle) {
            setPhase("onboarding");
          } else if (!state.projectTitle.trim()) {
            setPhase("collect");
          } else if (!state.startingPoint.trim()) {
            setPhase("collect");
          } else {
            setPhase("collect");
          }
        }
      } catch {
        /* 로컬 진행 */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- projectId 진입 시 1회
  }, [projectId]);

  const persistCollectComplete = useCallback(
    (data: Stage1CollectedData) => {
      const state: Stage1PersistedState = {
        startingPoint: data.startingPoint,
        projectTitle: data.projectTitle,
        teamWantsCollaboration: data.teamWantsCollaboration,
        collectStep: "team_collaboration",
        displayName: data.displayName ?? displayName,
        userLevel: data.userLevel ?? userLevel,
        hope: "",
        fear: "",
        principleAck: true,
      };
      void (async () => {
        try {
          const id = await saveStage1CollectState(projectId, state, artifactId);
          setArtifactId(id);
          const trimmed = data.projectTitle.trim();
          if (trimmed) {
            await updateProjectTitleAction(projectId, trimmed);
          }
        } catch {
          /* 다음 저장 시 재시도 */
        }
      })();
    },
    [artifactId, displayName, projectId, userLevel],
  );

  const transitionToPhase = useCallback(
    (next: Stage1Phase, applyState?: () => void) => {
      if (phase === next) return;
      applyState?.();
      setPhase(next);
      pushWorkspaceVisit(
        projectId,
        `/project/${projectId}/stage/1#${next}`,
      );
    },
    [phase, projectId],
  );

  const introMessages = useMemo(
    () => introMessagesToCoachDialog(stageConfig.introMessages),
    [stageConfig.introMessages],
  );

  const handleOnboardingComplete = useCallback(
    (result: Stage1OnboardingResult) => {
      transitionToPhase("collect", () => {
        setDisplayName(result.displayName);
        setUserLevel(result.userLevel);
        setCoachingLevel(result.userLevel);
        setGuidanceStyle(result.guidanceStyle);
      });
    },
    [setCoachingLevel, setGuidanceStyle, transitionToPhase],
  );

  const handleCollectComplete = useCallback(
    (data: Stage1CollectedData) => {
      const payload: Stage1CollectedData = {
        ...data,
        displayName: data.displayName ?? displayName,
        userLevel: data.userLevel ?? userLevel,
        startingPoint: data.startingPoint.trim() || startingPoint,
        principleAck: true,
      };
      setStartingPoint(payload.startingPoint);
      setProjectTitle(payload.projectTitle);
      if (payload.projectTitle.trim()) {
        syncWorkspaceProjectTitle(payload.projectTitle);
      }
      if (payload.displayName) setDisplayName(payload.displayName);
      if (payload.userLevel) setUserLevel(payload.userLevel);
      teamWantsCollaborationRef.current = payload.teamWantsCollaboration;
      persistCollectComplete(payload);
      router.push(`/project/${projectId}/stage/2`);
    },
    [
      displayName,
      persistCollectComplete,
      projectId,
      router,
      startingPoint,
      syncWorkspaceProjectTitle,
      userLevel,
    ],
  );

  const handleProjectTitleChange = useCallback(
    (title: string) => {
      setProjectTitle(title);
      syncWorkspaceProjectTitle(title);
    },
    [syncWorkspaceProjectTitle],
  );

  if (phase === "onboarding") {
    return (
      <div key="onboarding" className="coach-page-enter">
        <Stage1OnboardingCollect
          projectId={projectId}
          displayName={displayName}
          onComplete={handleOnboardingComplete}
        />
      </div>
    );
  }

  if (phase === "intro") {
    return (
      <StageRevealGroup>
        <div key="intro" className="coach-page-enter">
        <StageIntroGateProvider onIntroComplete={() => setIntroDialogDone(true)}>
          <div className={stageIntroShell} data-stage-intro="1">
            <div className={stageIntroEnterWork}>
              <AnimatedCoachPanel
                sceneKey={`${sceneKey}-intro`}
                statusLabel={stageConfig.introStatusLabel ?? "환영"}
                statusSub={stageConfig.introStatusSub}
                messages={introMessages}
                showComposer={false}
              />
            </div>
            {introDialogDone ? (
              <div className="mt-5 flex flex-col items-center gap-2 border-t border-border-warm pt-5">
                <p className={`text-center break-keep ${stageCoachCaption}`}>
                  사업 계획보다 고객의 문제에서 출발해, 아이디어와 컨셉을
                  순서대로 만들어 갈게요. 문제 정의 → 프로젝트 이름 순으로
                  진행해요. 팀원은 내 프로젝트에서 초대할 수 있어요.
                </p>
                <button
                  type="button"
                  onClick={() => transitionToPhase("collect")}
                  className={`${stageCoachBtnPrimary} w-full max-w-sm sm:w-auto`}
                >
                  시작하기 →
                </button>
              </div>
            ) : null}
          </div>
        </StageIntroGateProvider>
        </div>
      </StageRevealGroup>
    );
  }

  return (
    <div key="collect" className="coach-page-enter">
      <Stage1ConversationalCollect
        projectId={projectId}
        startingPoint={startingPoint}
        initialProjectTitle={projectTitle}
        displayName={displayName}
        userLevel={userLevel}
        isInviteMember={isInviteMember}
        onProjectTitleChange={handleProjectTitleChange}
        onComplete={handleCollectComplete}
      />
    </div>
  );
}
