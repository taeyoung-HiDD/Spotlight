"use client";

import { useCallback, useEffect, useState } from "react";
import { GuidanceStylePicker } from "@/components/stage/stage1/GuidanceStylePicker";
import { StageRevealGroup } from "@/components/stage/motion/StageReveal";
import {
  fetchStage1CollectState,
  saveStage1CollectState,
} from "@/lib/artifacts/stage1Collect";
import {
  buildOnboardingResult,
  type Stage1OnboardingResult,
} from "@/lib/stages/stage1/onboardingFlow";
import type { GuidanceStyle } from "@/lib/stages/stage1/guidanceStyle";

interface Stage1OnboardingCollectProps {
  projectId: string;
  displayName: string;
  onComplete: (result: Stage1OnboardingResult) => void;
}

/** 단계 1 · 코칭 방식 선택 (작업 영역만) */
export function Stage1OnboardingCollect({
  projectId,
  displayName,
  onComplete,
}: Stage1OnboardingCollectProps) {
  const [selectedStyle, setSelectedStyle] = useState<GuidanceStyle | null>(
    null,
  );
  const [onboardingDone, setOnboardingDone] = useState(false);
  const [pendingResult, setPendingResult] =
    useState<Stage1OnboardingResult | null>(null);
  const [artifactId, setArtifactId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { artifactId: id, state } = await fetchStage1CollectState(
          projectId,
        );
        if (cancelled) return;
        setArtifactId(id);
        if (state.guidanceStyle) {
          setSelectedStyle(state.guidanceStyle);
        } else if (state.userLevel) {
          setSelectedStyle(
            state.userLevel === "expert" ? "task_focused" : "full_guidance",
          );
        }
      } catch {
        /* 로컬 진행 */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const handleStyleSelect = useCallback(
    (style: GuidanceStyle) => {
      setSelectedStyle(style);
      const result = buildOnboardingResult(displayName, style);
      setPendingResult(result);
      setOnboardingDone(true);

      void (async () => {
        try {
          const { artifactId: id, state } = await fetchStage1CollectState(
            projectId,
          );
          const nextId = await saveStage1CollectState(
            projectId,
            {
              ...state,
              displayName: result.displayName,
              guidanceStyle: style,
              userLevel: result.userLevel,
            },
            id ?? artifactId,
          );
          setArtifactId(nextId);
        } catch {
          /* 다음 저장 시 재시도 */
        }
      })();
    },
    [artifactId, displayName, projectId],
  );

  const handleContinue = useCallback(() => {
    if (!pendingResult) return;
    onComplete(pendingResult);
  }, [onComplete, pendingResult]);

  return (
    <StageRevealGroup>
      <GuidanceStylePicker
        value={selectedStyle}
        onChange={handleStyleSelect}
        showContinue={onboardingDone && Boolean(pendingResult)}
        onContinue={handleContinue}
        continueLabel="프로젝트 이름 정하기"
      />
    </StageRevealGroup>
  );
}
