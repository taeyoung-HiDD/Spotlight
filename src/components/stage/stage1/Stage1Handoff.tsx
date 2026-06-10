"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StageIntroGateProvider } from "@/components/layout/StageIntroGate";
import { AnimatedCoachPanel } from "@/components/stage/motion/AnimatedCoachPanel";
import { StageRevealGroup } from "@/components/stage/motion/StageReveal";
import { StageTwoColumnLayout } from "@/components/stage/StageTwoColumnLayout";
import { Stage1ConversationalCollect } from "@/components/stage/stage1/Stage1ConversationalCollect";
import { Stage1OnboardingCollect } from "@/components/stage/stage1/Stage1OnboardingCollect";
import { useProjectWorkspace } from "@/components/project/ProjectWorkspaceContext";
import { Stage1ProblemCollect } from "@/components/stage/stage1/Stage1ProblemCollect";
import { Stage1ReviewPanel } from "@/components/stage/stage1/Stage1ReviewPanel";
import { getStageConfig } from "@/config/stageConfig";
import { summarizeStage1Artifact } from "@/lib/coach/artifactSummary";
import {
  formatInputGuideForContext,
  getStageWorkInputGuide,
} from "@/lib/coach/inputGuidance";
import { stageChatTitle } from "@/lib/coach/chatClient";
import { introMessagesToCoachDialog } from "@/lib/coach/renderIntroMessages";
import type { Stage1CollectedData } from "@/lib/stages/stage1/collectFlow";
import {
  levelCoachToneHint,
  type UserCoachingLevel,
} from "@/lib/stages/stage1/levelDiagnostic";
import type { Stage1OnboardingResult } from "@/lib/stages/stage1/onboardingFlow";
import {
  fetchStage1CollectState,
  saveStage1CollectState,
  type Stage1PersistedState,
} from "@/lib/artifacts/stage1Collect";
import { createClient } from "@/lib/supabase/client";
import { fetchUserDisplayName } from "@/lib/users/displayName";
import { updateProjectTitleAction } from "@/lib/projects/updateProjectTitle";
import {
  parseCoachEdit,
  STAGE1_REVIEW_CHAT_HINT,
  stripEditMetaLine,
} from "@/lib/stages/stage1/parseCoachEdit";
import { useWorkspaceScrollOnEnter } from "@/lib/motion/pageEnterScroll";
import { pushWorkspaceVisit } from "@/lib/navigation/workspaceVisitHistory";
import {
  stageCoachBtnPrimary,
  stageCoachCaption,
  stageIntroEnterWork,
  stageIntroShell,
} from "@/lib/stages/ui";

type Stage1Phase = "intro" | "problem" | "onboarding" | "collect" | "review";

interface Stage1HandoffProps {
  projectId: string;
  projectTitle: string;
  /** 초대로 합류한 팀원 — 온보딩 생략, Hopes부터 */
  isInviteMember?: boolean;
}

export function Stage1Handoff({
  projectId,
  projectTitle: serverProjectTitle,
  isInviteMember = false,
}: Stage1HandoffProps) {
  const router = useRouter();
  const { setProjectTitle: syncWorkspaceProjectTitle } = useProjectWorkspace();
  const stageConfig = getStageConfig(1);
  const sceneKey = `stage-1-${projectId}`;
  const [phase, setPhase] = useState<Stage1Phase>(
    isInviteMember ? "collect" : "intro",
  );
  const [introDialogDone, setIntroDialogDone] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [userLevel, setUserLevel] = useState<UserCoachingLevel>("beginner");
  const [startingPoint, setStartingPoint] = useState("");
  const [projectTitle, setProjectTitle] = useState(
    serverProjectTitle === "새 프로젝트" ? "" : serverProjectTitle,
  );
  const [hope, setHope] = useState("");
  const [fear, setFear] = useState("");
  const [principleAck, setPrincipleAck] = useState(false);
  const lastUserMessageRef = useRef("");
  const reviewSaveTimerRef = useRef<number | null>(null);
  const teamWantsCollaborationRef = useRef<boolean | null>(null);
  const [artifactId, setArtifactId] = useState<string | null>(null);

  useWorkspaceScrollOnEnter(phase);

  useEffect(() => {
    return () => {
      if (reviewSaveTimerRef.current) {
        window.clearTimeout(reviewSaveTimerRef.current);
      }
    };
  }, []);

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
        if (state.hope.trim()) setHope(state.hope);
        if (state.fear.trim()) setFear(state.fear);
        if (state.principleAck) setPrincipleAck(true);
        if (profileName.trim()) {
          setDisplayName(profileName);
        } else if (state.displayName?.trim()) {
          setDisplayName(state.displayName);
        }
        if (state.userLevel) setUserLevel(state.userLevel);
        teamWantsCollaborationRef.current = state.teamWantsCollaboration;
        if (
          state.principleAck &&
          state.startingPoint.trim() &&
          state.projectTitle.trim() &&
          state.hope.trim() &&
          state.fear.trim() &&
          phase !== "review"
        ) {
          setPhase("review");
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

  const persistReviewState = useCallback(
    (next: {
      projectTitle: string;
      startingPoint: string;
      hope: string;
      fear: string;
      principleAck: boolean;
    }) => {
      const state: Stage1PersistedState = {
        startingPoint: next.startingPoint,
        projectTitle: next.projectTitle,
        teamWantsCollaboration: teamWantsCollaborationRef.current,
        collectStep: "principle",
        displayName,
        userLevel,
        hope: next.hope,
        fear: next.fear,
        principleAck: next.principleAck,
      };
      void (async () => {
        try {
          const id = await saveStage1CollectState(projectId, state, artifactId);
          setArtifactId(id);
          const trimmed = next.projectTitle.trim();
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

  useEffect(() => {
    if (phase !== "review") return;
    syncWorkspaceProjectTitle(projectTitle);
    if (reviewSaveTimerRef.current) {
      window.clearTimeout(reviewSaveTimerRef.current);
    }
    reviewSaveTimerRef.current = window.setTimeout(() => {
      persistReviewState({
        projectTitle,
        startingPoint,
        hope,
        fear,
        principleAck,
      });
    }, 500);
  }, [
    phase,
    projectTitle,
    startingPoint,
    hope,
    fear,
    principleAck,
    syncWorkspaceProjectTitle,
    persistReviewState,
  ]);

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

  const gatePassed = useMemo(
    () =>
      startingPoint.trim().length > 0 &&
      projectTitle.trim().length > 0 &&
      hope.trim().length > 0 &&
      fear.trim().length > 0 &&
      principleAck,
    [startingPoint, projectTitle, hope, fear, principleAck],
  );

  const handleProblemComplete = useCallback(
    (problem: string) => {
      transitionToPhase("onboarding", () => {
        setStartingPoint(problem);
      });
    },
    [transitionToPhase],
  );

  const handleContinue = useCallback(() => {
    if (!gatePassed) return;
    router.push(`/project/${projectId}/stage/2`);
  }, [gatePassed, projectId, router]);

  const handleOnboardingComplete = useCallback(
    (result: Stage1OnboardingResult) => {
      transitionToPhase("collect", () => {
        setDisplayName(result.displayName);
        setUserLevel(result.userLevel);
      });
    },
    [transitionToPhase],
  );

  const handleCollectComplete = useCallback(
    (data: Stage1CollectedData) => {
      transitionToPhase("review", () => {
        setStartingPoint(data.startingPoint);
        setProjectTitle(data.projectTitle);
        if (data.projectTitle.trim()) {
          syncWorkspaceProjectTitle(data.projectTitle);
        }
        setHope(data.hope);
        setFear(data.fear);
        setPrincipleAck(data.principleAck);
        if (data.displayName) setDisplayName(data.displayName);
        if (data.userLevel) setUserLevel(data.userLevel);
        persistReviewState({
          projectTitle: data.projectTitle,
          startingPoint: data.startingPoint,
          hope: data.hope,
          fear: data.fear,
          principleAck: data.principleAck,
        });
      });
    },
    [persistReviewState, syncWorkspaceProjectTitle, transitionToPhase],
  );

  const handleProjectTitleChange = useCallback(
    (title: string) => {
      setProjectTitle(title);
      syncWorkspaceProjectTitle(title);
    },
    [syncWorkspaceProjectTitle],
  );

  const reviewInputGuide = useMemo(() => getStageWorkInputGuide(1), []);

  const chatContext = useMemo(
    () => ({
      projectId,
      stageId: 1,
      stageTitle: stageChatTitle(1),
      artifactSummary: [
        STAGE1_REVIEW_CHAT_HINT,
        levelCoachToneHint(userLevel),
        summarizeStage1Artifact({
          displayName,
          userLevel,
          startingPoint,
          projectTitle,
          hope,
          fear,
          principleAck,
        }),
      ].join("\n\n"),
      inputGuideContext: formatInputGuideForContext(reviewInputGuide),
    }),
    [
      projectId,
      displayName,
      userLevel,
      startingPoint,
      projectTitle,
      hope,
      fear,
      principleAck,
      reviewInputGuide,
    ],
  );

  const handleCoachReply = useCallback(
    (reply: string, userMessage: string) => {
      const patch = parseCoachEdit(userMessage, reply);
      if (patch?.startingPoint != null) setStartingPoint(patch.startingPoint);
      if (patch?.hope != null) setHope(patch.hope);
      if (patch?.fear != null) setFear(patch.fear);
    },
    [],
  );

  const reviewCoachGreeting = displayName.trim()
    ? `${displayName.trim()}님, `
    : "";

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
                  순서대로 만들어 갈게요. 출발 문제점 → 코칭 맞춤 → 프로젝트
                  이름 → 팀 여부 → Hopes·Fears 순으로 진행해요.
                </p>
                <button
                  type="button"
                  onClick={() => transitionToPhase("problem")}
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

  if (phase === "problem") {
    return (
      <div key="problem" className="coach-page-enter">
        <Stage1ProblemCollect
          projectId={projectId}
          onComplete={handleProblemComplete}
        />
      </div>
    );
  }

  if (phase === "onboarding") {
    return (
      <div key="onboarding" className="coach-page-enter">
        <Stage1OnboardingCollect
          projectId={projectId}
          displayName={displayName}
          afterProblemCapture
          onComplete={handleOnboardingComplete}
        />
      </div>
    );
  }

  if (phase === "collect") {
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

  return (
    <StageRevealGroup>
      <div key="review" className="coach-page-enter">
      <StageTwoColumnLayout
        work={
          <Stage1ReviewPanel
            displayName={displayName}
            userLevel={userLevel}
            projectTitle={projectTitle}
            startingPoint={startingPoint}
            hope={hope}
            fear={fear}
            principleAck={principleAck}
            onProjectTitleChange={handleProjectTitleChange}
            onStartingPointChange={setStartingPoint}
            onHopeChange={setHope}
            onFearChange={setFear}
            onPrincipleAckChange={setPrincipleAck}
            gatePassed={gatePassed}
            onContinue={handleContinue}
            onBack={() => transitionToPhase("collect")}
            projectId={projectId}
          />
        }
        coach={
          <AnimatedCoachPanel
            sceneKey={`${sceneKey}-review`}
            statusLabel={stageConfig.workStatusLabel ?? "짚어주는 중"}
            statusSub="검토 · 수정"
            messages={[
              {
                type: "bubble",
                content: (
                  <>
                    {reviewCoachGreeting}왼쪽에 정리해 두었어요. 직접 고치거나,
                    바꾸고 싶은 내용을 말씀해 주세요.
                  </>
                ),
              },
            ]}
            chatContext={chatContext}
            formatCoachReply={stripEditMetaLine}
            inputGuide={reviewInputGuide}
            onUserMessage={(msg) => {
              lastUserMessageRef.current = msg;
            }}
            onCoachReply={(reply) => {
              handleCoachReply(reply, lastUserMessageRef.current);
            }}
          />
        }
      />
      </div>
    </StageRevealGroup>
  );
}
