"use client";

import { useUiLocale } from "@/hooks/useUiLocale";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatedCoachPanel } from "@/components/stage/motion/AnimatedCoachPanel";
import type { CoachDialogItem } from "@/components/stage/motion/CoachSequentialDialog";
import { fetchStage1CollectState } from "@/lib/artifacts/stage1Collect";
import { fetchStage4Discoveries } from "@/lib/artifacts/stage4Discoveries";
import { summarizeStage5Artifact } from "@/lib/coach/artifactSummary";
import type { CoachChatHistoryItem } from "@/lib/coach/chatClient";
import { getStageWorkInputGuide } from "@/lib/coach/inputGuidance";
import { stageChatTitle } from "@/lib/coach/chatClient";
import { getStageConfig } from "@/config/stageConfig";
import { getStagePurposeCopy } from "@/lib/stages/discovery/stagePurposeCopy";
import {
  buildStage5DiscoveryInputExamples,
  buildStage5IntroCoachMessages,
} from "@/lib/stages/iceberg/stage5IcebergIntro";
import {
  advanceIcebergDiscovery,
  buildIcebergDiscoveryKickoff,
  getIcebergPurposeExplanation,
  isIcebergDiscoveryActive,
} from "@/lib/stages/iceberg/stage5IcebergDiscoveryFlow";
import {
  EMPTY_STAGE5_BASELINE,
  type Stage5BaselineContext,
} from "@/lib/stages/iceberg/stage5ProjectContext";
import type { IcebergModelData } from "@/lib/stages/iceberg/types";

const REFINE_COACH_TAIL: CoachDialogItem[] = [
  {
    type: "bubble",
    content:
      "왼쪽 세 층을 보면서 문장을 다듬어 보세요. 막히면 아래 입력창으로 물어보세요.",
  },
  {
    type: "highlight",
    label: "디자인씽킹 정신",
    content: "말한 것 ≠ 행동 ≠ 잠재 동기 — 층마다 출처를 구분해 두세요.",
  },
];

const STAGE5_DISCOVERY_DIRECTIVE = `6단계 진짜 필요 찾기(맥락 수집 중):
- 한 턴에 질문은 하나만. 세 층 용어를 먼저 나열하지 않는다.
- explicit(말한 니즈) → tacit(행동 패턴) → latent(깊은 동기 가설) 순으로 듣는다.
- 사용자 답을 짧게 요약만 하고 다음 질문으로 넘긴다. 표·초안은 시스템이 채운다.
- 1단계 문제점·4단계 공감맵(Says/행동함 등)이 있으면 그걸 맥락으로 참고한다.`;

const STAGE5_REFINE_DIRECTIVE = `6단계 진짜 필요 찾기 다듬기:
- 왼쪽에 초안이 있다. 각 층 문장 편집을 돕는다.
- 결론보다 가설·검증 포인트를 짧게 제안한다.`;

function primaryPersonaFromStage4(
  maps: Stage5BaselineContext["empathyMaps"],
): { name: string; situation: string } {
  const first =
    maps.find((m) => m.personaName.trim() || m.personaContext.trim()) ??
    maps[0];
  if (!first) return { name: "", situation: "" };
  return {
    name: first.personaName.trim(),
    situation: first.personaContext.trim(),
  };
}

interface IcebergCoachPanelProps {
  projectId: string;
  data: IcebergModelData;
  onDataChange: (data: IcebergModelData) => void;
  variant: "intro" | "work";
}

export function IcebergCoachPanel({
  projectId,
  data,
  onDataChange,
  variant,
}: IcebergCoachPanelProps) {
  const stageConfig = getStageConfig(5);
  const locale = useUiLocale();
  const purposeCopy = getStagePurposeCopy(5, locale);
  const discoveryActive =
    variant === "work" && isIcebergDiscoveryActive(data.prep);

  const [baseline, setBaseline] =
    useState<Stage5BaselineContext>(EMPTY_STAGE5_BASELINE);
  const [baselineReady, setBaselineReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setBaselineReady(false);
    void (async () => {
      try {
        const [s1, s4] = await Promise.all([
          fetchStage1CollectState(projectId),
          fetchStage4Discoveries(projectId),
        ]);
        if (cancelled) return;
        const persona = primaryPersonaFromStage4(s4.data.empathyMaps);
        setBaseline({
          startingPoint: s1.state.startingPoint?.trim() ?? "",
          personaName: persona.name,
          personaSituation: persona.situation,
          empathyMaps: s4.data.empathyMaps,
        });
      } catch {
        if (!cancelled) setBaseline(EMPTY_STAGE5_BASELINE);
      } finally {
        if (!cancelled) setBaselineReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  const introMessages = useMemo((): CoachDialogItem[] => {
    if (!baselineReady) {
      return [{ type: "bubble", content: "프로젝트 맥락을 불러오는 중이에요…" }];
    }
    return buildStage5IntroCoachMessages(baseline);
  }, [baseline, baselineReady]);

  const workIntroMessages = useMemo((): CoachDialogItem[] => {
    if (!baselineReady) {
      return [{ type: "bubble", content: "프로젝트 맥락을 불러오는 중이에요…" }];
    }
    const purpose: CoachDialogItem = {
      type: "highlight",
      label: purposeCopy.label,
      content: getIcebergPurposeExplanation(baseline),
    };
    if (!discoveryActive) {
      return [purpose, ...REFINE_COACH_TAIL];
    }
    const kickoff = buildIcebergDiscoveryKickoff(baseline).map((content) => ({
      type: "bubble" as const,
      content,
    }));
    return [purpose, ...kickoff];
  }, [baselineReady, baseline, discoveryActive, purposeCopy.label]);

  const coachInputGuide = useMemo(() => {
    if (discoveryActive) {
      return {
        title: "말한 것·행동·잠재",
        hint: "Kevin이 물은 층에 한 가지만 답해 주세요.",
        examples: baselineReady
          ? buildStage5DiscoveryInputExamples(baseline)
          : [],
        placeholder: "한 가지씩 답해 주세요…",
      };
    }
    return getStageWorkInputGuide(5, locale);
  }, [discoveryActive, baseline, baselineReady, locale]);

  const chatContext = useMemo(() => {
    const lines = [summarizeStage5Artifact(data)];
    if (baseline.startingPoint) {
      lines.push(`[1단계 출발 문제]\n${baseline.startingPoint}`);
    }
    if (baseline.empathyMaps.length) {
      const personaLines = baseline.empathyMaps
        .map((m, idx) => {
          const name = m.personaName.trim() || `페르소나 ${idx + 1}`;
          const says = m.quadrants.says
            .map((i) => i.text.trim())
            .filter(Boolean)
            .slice(0, 3);
          return says.length
            ? `${name} Says: ${says.join(" / ")}`
            : `${name}${m.personaContext.trim() ? ` · ${m.personaContext.trim()}` : ""}`;
        })
        .join("\n");
      lines.push(`[4단계 공감맵]\n${personaLines}`);
    }
    if (data.prep.explicitNotes.trim()) {
      lines.push(`[수집·말한 것] ${data.prep.explicitNotes.trim()}`);
    }
    if (data.prep.tacitNotes.trim()) {
      lines.push(`[수집·행동] ${data.prep.tacitNotes.trim()}`);
    }
    if (data.prep.latentNotes.trim()) {
      lines.push(`[수집·잠재] ${data.prep.latentNotes.trim()}`);
    }
    return {
      projectId,
      stageId: 6,
      stageTitle: stageChatTitle(5),
      artifactSummary: lines.join("\n\n"),
      stageBehaviorNote: discoveryActive
        ? STAGE5_DISCOVERY_DIRECTIVE
        : STAGE5_REFINE_DIRECTIVE,
    };
  }, [projectId, data, baseline, data.prep, discoveryActive]);

  const pendingDataPatchRef = useRef<IcebergModelData | null>(null);

  const handleCoachMessage = useCallback(
    async (
      message: string,
      _history: CoachChatHistoryItem[],
    ): Promise<string | null | undefined> => {
      if (!discoveryActive) return undefined;

      const result = advanceIcebergDiscovery(
        message,
        data.prep,
        baseline,
      );

      const draft = result.draftData;
      const next: IcebergModelData = {
        ...data,
        prep: result.prep,
        ...(draft
          ? {
              explicit: draft.explicit ?? data.explicit,
              tacit: draft.tacit ?? data.tacit,
              tacitAutoNote: draft.tacitAutoNote ?? data.tacitAutoNote,
              latent: draft.latent ?? data.latent,
            }
          : {}),
      };
      const endsDiscovery =
        isIcebergDiscoveryActive(data.prep) && !isIcebergDiscoveryActive(result.prep);

      if (endsDiscovery) {
        pendingDataPatchRef.current = next;
      } else {
        onDataChange(next);
      }

      return result.coachReply;
    },
    [discoveryActive, data, baseline, onDataChange],
  );

  const handleCoachReply = useCallback(() => {
    const pending = pendingDataPatchRef.current;
    if (!pending) return;
    pendingDataPatchRef.current = null;
    onDataChange(pending);
  }, [onDataChange]);

  const sceneKey = discoveryActive
    ? `stage-5-prep-${projectId}`
    : `stage-5-refine-${projectId}`;

  if (variant === "intro") {
    return (
      <AnimatedCoachPanel
        sceneKey={`stage-5-iceberg-${projectId}-intro-${baselineReady ? "ready" : "load"}`}
        statusLabel={stageConfig.introStatusLabel ?? "함께 짚어보는 중"}
        statusSub={stageConfig.introStatusSub ?? "니즈 분석하기"}
        messages={introMessages}
        showComposer={false}
      />
    );
  }

  return (
    <AnimatedCoachPanel
      sceneKey={sceneKey}
      statusLabel={discoveryActive ? "듣는 중" : "함께 짚어보는 중"}
      statusSub={discoveryActive ? "맥락 수집" : "세 층 · 작업"}
      messages={workIntroMessages}
      chatContext={chatContext}
      inputGuide={coachInputGuide}
      onCoachMessage={discoveryActive ? handleCoachMessage : undefined}
      onCoachReply={discoveryActive ? handleCoachReply : undefined}
      showComposer
    />
  );
}
