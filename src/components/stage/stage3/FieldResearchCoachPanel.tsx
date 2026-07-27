"use client";

import { useUiLocale } from "@/hooks/useUiLocale";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AnimatedCoachPanel } from "@/components/stage/motion/AnimatedCoachPanel";
import type { CoachDialogItem } from "@/components/stage/motion/CoachSequentialDialog";
import { fetchStage1CollectState } from "@/lib/artifacts/stage1Collect";
import { fetchStage2PrePmf } from "@/lib/artifacts/stage2PrePmf";
import {
  buildPrePmfSummaryText,
  extractCompetitorLabels,
  prePmfNextActivityUnknowns,
  prePmfPersonDisplayLabels,
} from "@/lib/stages/stage2/prePmfOverview";
import { summarizeStage3Artifact } from "@/lib/coach/artifactSummary";
import type { CoachChatHistoryItem } from "@/lib/coach/chatClient";
import { getStageWorkInputGuide } from "@/lib/coach/inputGuidance";
import { stageChatTitle } from "@/lib/coach/chatClient";
import { formatResearchMethodsForCoach } from "@/lib/stages/fieldResearch/researchMethodCatalog";
import {
  advanceToKnowDiscovery,
  buildDiscoveryKickoff,
  getToKnowPurposeExplanation,
  isToKnowDiscoveryActive,
  TO_KNOW_PURPOSE_LABEL,
  TO_KNOW_PURPOSE_LABEL_EN,
  type Stage3BaselineContext,
} from "@/lib/stages/fieldResearch/stage3ToKnowPrepFlow";
import {
  buildDefaultToKnowCoreQuestion,
  sanitizeToKnowCoreQuestion,
} from "@/lib/stages/fieldResearch/toKnowGuideCategories";
import {
  demographicSpecificityCoachPrompt,
  extractSelectionProfileFromUtterance,
  isDemographicOnlyLabel,
} from "@/lib/stages/fieldResearch/selectionProfile";
import {
  mergeSessionsForRespondents,
  normalizeRespondent,
  segmentsFromRespondents,
} from "@/lib/stages/fieldResearch/respondentNormalize";
import type { FieldResearchData, Respondent } from "@/lib/stages/fieldResearch/types";
import { normalizeStage3ResearchPrep } from "@/lib/stages/fieldResearch/stage3ResearchPrep";

function purposeHighlight(
  baseline: Stage3BaselineContext,
  locale: import("@/lib/i18n/uiLocale").UiLocale,
): CoachDialogItem {
  return {
    type: "highlight",
    label:
      locale === "en"
        ? TO_KNOW_PURPOSE_LABEL_EN
        : TO_KNOW_PURPOSE_LABEL,
    content: getToKnowPurposeExplanation(baseline, locale),
  };
}

const RESEARCH_PREP_COACH_TAIL: CoachDialogItem[] = [
  {
    type: "bubble",
    content:
      "CORE 2에서는 극단 사용자(Heavy·Light)와 대조군을 스펙트럼에 올려요. 「20대 직장인」처럼만 적히면, 거주·지원·혼인 같은 환경 변수로 더 구체화해 볼게요.",
  },
  {
    type: "highlight",
    label: "디자인씽킹 정신",
    content:
      "극단에서 보편을 본다 — 양 끝의 사용자가 잠재 니즈를 가장 잘 드러낸다. 지금은 가설 상태예요.",
  },
  {
    type: "bubble",
    variant: "secondary",
    content:
      "조사 계획(방법·인원·대상)을 정한 뒤 To-know list로 넘어가 질문을 구체화할게요.",
  },
];

const REFINE_COACH_TAIL: CoachDialogItem[] = [
  {
    type: "bubble",
    content:
      "왼쪽 To-know 표를 보면서 질문과 방법을 다듬어 보세요. 방법 열 옆 ⓘ 아이콘을 누르면 각 조사 방법의 간단한 설명을 볼 수 있어요.",
  },
  {
    type: "bubble",
    content:
      "FGD·인터뷰·섀도잉·데스크리서치 등 조사 방법이 궁금하면 아래 입력창으로 편하게 물어봐 주세요. 우리 상황에 맞는지 같이 골라볼게요.",
  },
  {
    type: "highlight",
    label: "디자인씽킹 정신",
    content: "사용자 발화·행동 = 자료 출처 — 추측이 아니라 들은 말과 본 행동을 남겨요.",
  },
  {
    type: "bubble",
    variant: "secondary",
    content:
      "이 단계에서는 To-know 표만 작성·검토해요. 동의서·로그·디브리핑은 다음 단계에서 이어서 정리할게요.",
  },
];

const STAGE3_DISCOVERY_DIRECTIVE = `3단계 사용자 조사 준비하기(To-know 설계 · 맥락 수집 중):
- 한 턴에 질문은 하나만. Porter 5 Forces·Desk/필드 용어를 먼저 나열하지 않는다.
- 조사 대상 이름은 사전 조사(2단계) 타겟·이해관계자로 자동 반영된다. 대상 이름을 다시 묻지 않는다.
- 1단계 문제·2단계 사전 조사를 짚으며, 상황·이해관계·경쟁 환경을 순서대로 듣는다.
- 사용자 답을 요약만 짧게 하고 다음 질문으로 넘긴다. 표·초안은 시스템이 채운다.`;

const STAGE3_RESEARCH_PREP_DIRECTIVE = `3단계 사용자 조사 준비하기(조사 계획 · Extreme User 선정):
- 왼쪽 CORE 2는 Heavy·Light 극단 사용자와 대조군 스펙트럼입니다.
- 사용자가 「20대 직장인」「30대 주부」처럼 인구통계만 말하면, 거주·경제 지원·혼인 등 환경 변수로 구체화하도록 한 가지만 묻습니다(묻는 중).
- 사용자가 맥락을 설명하면 selectionCriteria(칩)·reasoning(선정 이유)으로 요약해 주되, 가설임을 밝힙니다.
- 2단계 사전 조사·타겟을 바탕으로 인원·질문을 (가설)로 제안합니다.`;

const STAGE3_REFINE_DIRECTIVE = `3단계 사용자 조사 준비하기(To-know 다듬기):
- 왼쪽 표에 초안이 있다. To-know 질문·방법 편집을 돕는다.
- 사용자가 조사 방법(FGD·인터뷰·섀도잉·데스크리서치 등)을 물으면 아래 요약을 바탕으로 짧고 일상적으로 설명한다. 우리 문제·To-know 질문에 맞는지 연결해 준다.
${formatResearchMethodsForCoach()}
- 전문 프레임워크 설명보다 구체적인 질문 문장·조사 준비 팁을 짧게 제안한다.`;

interface FieldResearchCoachPanelProps {
  projectId: string;
  data: FieldResearchData;
  onDataChange: (data: FieldResearchData) => void;
  /** 맥락 수집 대화 종료 후 — 화면 전환은 부모 게이트에서 처리 */
  onDiscoveryComplete?: (next: FieldResearchData) => void;
  discoveryGatePending?: boolean;
  footer?: ReactNode;
}

export function FieldResearchCoachPanel({
  projectId,
  data,
  onDataChange,
  onDiscoveryComplete,
  discoveryGatePending = false,
  footer,
}: FieldResearchCoachPanelProps) {
  const locale = useUiLocale();
  const [baseline, setBaseline] = useState<Stage3BaselineContext>({
    startingPoint: "",
    personaName: "",
    personaSituation: "",
    contextualAnswers: {},
    unknowns: [],
  });
  const [baselineReady, setBaselineReady] = useState(false);

  const discoveryActive = isToKnowDiscoveryActive(data.toKnowPrep);
  const researchPrepPhase = data.prepWorkflowPhase === "research_prep";

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [s1, s2] = await Promise.all([
          fetchStage1CollectState(projectId),
          fetchStage2PrePmf(projectId),
        ]);
        if (cancelled) return;
        const pre = s2.data;
        setBaseline({
          startingPoint: s1.state.startingPoint?.trim() ?? "",
          personaName: prePmfPersonDisplayLabels(pre.targetUsers, "타겟")[0] ?? "",
          personaSituation: pre.problemStatement.trim(),
          contextualAnswers: {
            primary_users: prePmfPersonDisplayLabels(pre.targetUsers, "타겟"),
            stakeholders: prePmfPersonDisplayLabels(
              pre.stakeholders,
              "이해관계자",
            ),
            competitors: extractCompetitorLabels(pre),
            products_services: pre.similarServices.items.map((it) => it.name),
          },
          contextualInsights: buildPrePmfSummaryText(pre),
          unknowns: prePmfNextActivityUnknowns(pre.nextSteps),
          dimensionResearch: {},
          selectedDimensions: [
            "primary_users",
            "stakeholders",
            "competitors",
            "products_services",
          ],
        });
      } catch {
        if (!cancelled) {
          setBaseline({
            startingPoint: "",
            personaName: "",
            personaSituation: "",
            contextualAnswers: {},
            unknowns: [],
          });
        }
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
      return [
        {
          type: "bubble",
          content:
            locale === "en"
              ? "Loading project context…"
              : "맥락을 불러오는 중이에요…",
        },
      ];
    }
    const purpose = purposeHighlight(baseline, locale);
    if (researchPrepPhase) {
      return [
        purpose,
        {
          type: "highlight" as const,
          label:
            locale === "en" ? "Build a research plan" : "조사 계획 세우기",
          content:
            locale === "en"
              ? "Based on desk research, I’ll recommend subjects, headcount, and question guides—then we continue into the To-know list."
              : "사전 조사 결과로 조사 대상·인원·질문 가이드를 추천해 드려요. To-know list로 이어가요.",
        },
        ...RESEARCH_PREP_COACH_TAIL,
      ];
    }
    if (!discoveryActive) {
      return [purpose, ...REFINE_COACH_TAIL];
    }
    const kickoff = buildDiscoveryKickoff(baseline).map((content) => ({
      type: "bubble" as const,
      content,
    }));
    return [purpose, ...kickoff];
  }, [discoveryActive, researchPrepPhase, baselineReady, baseline, locale]);

  const coachInputGuide = useMemo(() => {
    if (researchPrepPhase) {
      return {
        title: "조사 계획 · 인원",
        hint: "조사 인원·세그먼트·질문 가이드가 궁금하면 Kevin에게 물어보세요.",
        examples: [
          "우리 프로젝트에 적정 조사 인원을 다시 추천해 줘",
          "핵심 질문 가이드를 한 가지 더 제안해 줘",
          "인뎁스 인터뷰와 섀도잉 중 뭐가 더 맞을까?",
        ],
        placeholder: "조사 계획이 궁금한 점을 물어보세요…",
      };
    }
    if (discoveryActive) {
      return {
        title: "맥락 답하기",
        hint: "Kevin이 물은 것에 한 가지만 답해 주세요.",
        examples: [
          "매장을 직접 보는 40대 자영업자, 출근 전이 가장 바빠요",
          "경쟁은 수기 장부랑 네이버 검색 정도예요",
          "가족이 같이 일하고 지자체 지원도 알아보는 중이에요",
        ],
        placeholder: "한 가지씩 답해 주세요…",
      };
    }
    return {
      ...getStageWorkInputGuide(3, locale),
      hint: "To-know 질문 다듬기 · 조사 방법이 궁금하면 Kevin에게 물어보세요.",
      examples: [
        "FGD랑 인뎁스 인터뷰 차이가 뭐예요?",
        "우리 문제에는 섀도잉이 맞을까요?",
        "데스크리서치로 확인할 To-know 질문 예시를 줘",
      ],
    };
  }, [discoveryActive, researchPrepPhase, locale]);

  const chatContext = useMemo(() => {
    const lines = [summarizeStage3Artifact(data)];
    if (researchPrepPhase && data.researchPrep.recommendationsGenerated) {
      const prep = data.researchPrep;
      lines.push(
        [
          `[조사 계획] 권장 ${prep.recommendedParticipantCount}명 · 선택 ${prep.selectedParticipantCount}명 · 현장 인터뷰`,
          prep.segments.length
            ? `[세그먼트] ${prep.segments.map((s) => `${s.label} ${s.selectedCount}명`).join(" · ")}`
            : "",
        ]
          .filter(Boolean)
          .join("\n"),
      );
    }
    if (baseline.startingPoint) {
      lines.push(`[1단계 출발 문제]\n${baseline.startingPoint}`);
    }
    if (data.toKnowPrep.targetPerson.trim()) {
      lines.push(`[수집·대상] ${data.toKnowPrep.targetPerson.trim()}`);
    }
    if (data.toKnowPrep.situation.trim()) {
      lines.push(`[수집·상황] ${data.toKnowPrep.situation.trim()}`);
    }
    if (data.toKnowPrep.stakeholders.trim()) {
      lines.push(`[수집·이해관계] ${data.toKnowPrep.stakeholders.trim()}`);
    }
    if (data.toKnowPrep.competitiveContext.trim()) {
      lines.push(`[수집·경쟁] ${data.toKnowPrep.competitiveContext.trim()}`);
    }
    return {
      projectId,
      stageId: 3,
      stageTitle: stageChatTitle(3),
      artifactSummary: lines.join("\n\n"),
      stageBehaviorNote: discoveryActive
        ? STAGE3_DISCOVERY_DIRECTIVE
        : researchPrepPhase
          ? STAGE3_RESEARCH_PREP_DIRECTIVE
          : STAGE3_REFINE_DIRECTIVE,
    };
  }, [projectId, data, baseline.startingPoint, data.toKnowPrep, discoveryActive, researchPrepPhase]);

  const pendingDataPatchRef = useRef<FieldResearchData | null>(null);

  const handleCoachMessage = useCallback(
    async (
      message: string,
      _history: CoachChatHistoryItem[],
    ): Promise<string | null | undefined> => {
      if (discoveryActive) {
        const result = advanceToKnowDiscovery(
          message,
          data.toKnowPrep,
          baseline,
        );

        const next: FieldResearchData = {
          ...data,
          toKnowPrep: result.prep,
          ...(result.draftTable ? { toKnowTable: result.draftTable } : {}),
          toKnowCoreQuestion:
            sanitizeToKnowCoreQuestion(
              data.toKnowCoreQuestion,
              baseline.startingPoint,
            ) || buildDefaultToKnowCoreQuestion(baseline.startingPoint),
        };
        const endsDiscovery =
          isToKnowDiscoveryActive(data.toKnowPrep) &&
          !isToKnowDiscoveryActive(result.prep);

        if (endsDiscovery) {
          pendingDataPatchRef.current = next;
        } else {
          onDataChange(next);
        }

        return result.coachReply;
      }

      if (!researchPrepPhase) return undefined;

      const trimmed = message.trim();
      if (isDemographicOnlyLabel(trimmed)) {
        return demographicSpecificityCoachPrompt(baseline.startingPoint);
      }

      const extracted = extractSelectionProfileFromUtterance(trimmed);
      if (!extracted) return undefined;

      const respondents = (data.respondents ?? [])
        .map((r, i) => normalizeRespondent(r, i))
        .filter((r): r is Respondent => r !== null);
      if (!respondents.length) return undefined;

      const target =
        respondents.find((r) => isDemographicOnlyLabel(r.subtitle || r.name)) ??
        respondents.find((r) => r.role === "heavy") ??
        respondents[0];
      const nextRespondents = respondents.map((r) =>
        r.id === target.id
          ? {
              ...r,
              selectionCriteria: extracted.selectionCriteria,
              criterionDetails: extracted.criterionDetails,
              reasoning: extracted.reasoning,
              subtitle:
                r.subtitle && !isDemographicOnlyLabel(r.subtitle)
                  ? r.subtitle
                  : extracted.selectionCriteria.slice(0, 2).join(" · ") ||
                    r.subtitle,
            }
          : r,
      );
      const prep = normalizeStage3ResearchPrep(data.researchPrep);
      onDataChange({
        ...data,
        respondents: nextRespondents,
        sessions: mergeSessionsForRespondents(nextRespondents, data.sessions),
        researchPrep: {
          ...data.researchPrep,
          segments: segmentsFromRespondents(nextRespondents, prep.segments),
        },
      });

      return `말씀하신 맥락을 선정 기준 칩으로 옮겨 뒀어요: ${extracted.selectionCriteria.join(" · ")}. 왼쪽 카드에서 이유를 확인해 주세요. (가설)`;
    },
    [
      discoveryActive,
      researchPrepPhase,
      data,
      baseline,
      onDataChange,
    ],
  );

  const handleCoachReply = useCallback(() => {
    const pending = pendingDataPatchRef.current;
    if (!pending) return;
    pendingDataPatchRef.current = null;
    onDiscoveryComplete?.(pending);
  }, [onDiscoveryComplete]);

  const sceneKey = discoveryActive
    ? `stage-3-prep-disc-${projectId}-${baselineReady ? "ready" : "load"}`
    : researchPrepPhase
      ? `stage-3-research-prep-${projectId}-${baselineReady ? "ready" : "load"}`
      : `stage-3-refine-${projectId}-${baselineReady ? "ready" : "load"}`;

  return (
    <AnimatedCoachPanel
      sceneKey={sceneKey}
      statusLabel={discoveryActive ? "듣는 중" : researchPrepPhase ? "제안 중" : "짚어주는 중"}
      statusSub={
        discoveryActive
          ? "조사 맥락 수집"
          : researchPrepPhase
            ? "조사 계획 세우기"
            : "To-know 다듬기"
      }
      messages={introMessages}
      chatContext={chatContext}
      inputGuide={coachInputGuide}
      onCoachMessage={
        (discoveryActive && !discoveryGatePending) || researchPrepPhase
          ? handleCoachMessage
          : undefined
      }
      onCoachReply={
        discoveryActive && onDiscoveryComplete ? handleCoachReply : undefined
      }
      showComposer={!discoveryGatePending}
      footer={footer}
    />
  );
}
