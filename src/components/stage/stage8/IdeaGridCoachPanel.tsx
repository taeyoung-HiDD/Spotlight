"use client";

import { IconExternalLink, IconLock } from "@tabler/icons-react";
import { useUiLocale } from "@/hooks/useUiLocale";
import { useEffect, useMemo, useState } from "react";
import { AnimatedCoachPanel } from "@/components/stage/motion/AnimatedCoachPanel";
import type { CoachDialogItem } from "@/components/stage/motion/CoachSequentialDialog";
import { getStageConfig } from "@/config/stageConfig";
import { formatCoachDialogBreaks } from "@/lib/coach/formatCoachDialog";
import { getStageWorkInputGuide } from "@/lib/coach/inputGuidance";
import { getStagePurposeCopy } from "@/lib/stages/discovery/stagePurposeCopy";
import {
  filledIdeaCount,
  type IdeaGridData,
} from "@/lib/stages/stage8/ideaGridTypes";
import type {
  ActiveHmwForCases,
  HmwLaunchCase,
} from "@/lib/stages/stage8/hmwLaunchCases";
import {
  getCachedHmwLaunchCases,
  requestHmwLaunchCases,
} from "@/lib/stages/stage8/hmwLaunchCasesClient";
import type { HmwQuestion } from "@/lib/stages/stage7/hmwTypes";
import { stageBtnSecondary, stageCaption } from "@/lib/stages/ui";

interface IdeaGridCoachPanelProps {
  projectId: string;
  data: IdeaGridData;
  hmwQuestions: HmwQuestion[];
  variant: "intro" | "work";
  /** 새 아이디어 입력 화면이 열려 있을 때 */
  editorOpen?: boolean;
  activeHmw?: ActiveHmwForCases | null;
  onAppendDescriptionHint?: (hint: string) => void;
  onChange?: (data: IdeaGridData) => void;
}

function LaunchCaseCards({
  cases,
  onHint,
}: {
  cases: HmwLaunchCase[];
  onHint?: (hint: string) => void;
}) {
  if (cases.length === 0) return null;
  return (
    <div className="mt-1 space-y-2.5">
      {cases.map((c) => (
        <div
          key={`${c.name}-${c.url || c.summary.slice(0, 24)}`}
          className="rounded-xl border border-border-warm bg-panel px-3 py-2.5 shadow-sm"
        >
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <p className="text-[13px] font-semibold text-foreground break-keep">
              {c.name}
            </p>
            <span className="rounded bg-cream px-1.5 py-0.5 text-[10px] font-semibold text-muted">
              {c.region === "korea" ? "국내" : "글로벌"}
            </span>
          </div>
          <p className="text-[12px] leading-relaxed text-foreground break-keep">
            {c.summary}
          </p>
          {c.hmwLink.trim() ? (
            <p className={`mt-1.5 ${stageCaption} text-muted`}>{c.hmwLink}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-1.5">
            {c.url.trim() ? (
              <a
                href={c.url.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className={`${stageBtnSecondary} inline-flex items-center gap-1 text-[11px]`}
              >
                <IconExternalLink className="size-3.5" stroke={1.75} />
                출처 보기
              </a>
            ) : null}
            {c.hint.trim() && onHint ? (
              <button
                type="button"
                onClick={() => onHint(c.hint.trim())}
                className={`${stageBtnSecondary} text-[11px]`}
              >
                이 방향 힌트
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}

function LockedCaseCardsShell({ onEarlyReveal }: { onEarlyReveal: () => void }) {
  return (
    <div className="mt-1 rounded-xl border border-dashed border-border-warm bg-cream/50 px-3.5 py-3">
      <div className="mb-1.5 flex items-center gap-1.5">
        <IconLock className="size-3.5 text-muted" stroke={1.75} />
        <p className="text-[13px] font-semibold text-foreground">
          참고 사례 · 잠김
        </p>
      </div>
      <p className={`${stageCaption} text-muted`}>
        내 아이디어를 먼저 1개 적으면 비슷한 문제를 푼 사례를 보여드려요.
      </p>
      <button
        type="button"
        onClick={onEarlyReveal}
        className={`${stageBtnSecondary} mt-2.5 text-[11px]`}
      >
        그래도 먼저 보기
      </button>
    </div>
  );
}

export function IdeaGridCoachPanel({
  projectId,
  data,
  hmwQuestions,
  variant,
  editorOpen = false,
  activeHmw = null,
  onAppendDescriptionHint,
  onChange,
}: IdeaGridCoachPanelProps) {
  const stageConfig = getStageConfig(8);
  const locale = useUiLocale();
  const purpose = getStagePurposeCopy(8, locale);

  const hmwSnippet = hmwQuestions.find((q) => q.hmwText.trim())?.hmwText.trim();
  const casesMode = Boolean(editorOpen && activeHmw?.hmwText.trim());

  const hasSavedIdeaForHmw = Boolean(
    activeHmw &&
      data.slots.some(
        (s) => s?.sourceHmwId === activeHmw.id && s.title.trim(),
      ),
  );
  const casesUnlocked =
    hasSavedIdeaForHmw || data.earlyRevealCaseCards === true;

  const [cases, setCases] = useState<HmwLaunchCase[]>([]);
  const [casesLoading, setCasesLoading] = useState(false);
  const [casesError, setCasesError] = useState<string | null>(null);

  useEffect(() => {
    if (!casesMode || !activeHmw || !casesUnlocked) {
      setCases([]);
      setCasesLoading(false);
      setCasesError(null);
      return;
    }

    const cached = getCachedHmwLaunchCases(projectId, activeHmw.id);
    if (cached) {
      setCases(cached);
      setCasesLoading(false);
      setCasesError(null);
      return;
    }

    let cancelled = false;
    setCases([]);
    setCasesLoading(true);
    setCasesError(null);
    void (async () => {
      try {
        const next = await requestHmwLaunchCases({
          projectId,
          hmwId: activeHmw.id,
          hmwText: activeHmw.hmwText,
          latentNeedText: activeHmw.latentNeedText,
        });
        if (cancelled) return;
        setCases(next);
      } catch (e) {
        if (cancelled) return;
        setCasesError(
          e instanceof Error ? e.message : "출시 사례를 불러오지 못했어요.",
        );
      } finally {
        if (!cancelled) setCasesLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [casesMode, casesUnlocked, projectId, activeHmw]);

  const handleEarlyReveal = () => {
    const ok = window.confirm(
      "Kevin: 사례를 먼저 보면 비슷한 아이디어가 나오기 쉬워요. 그래도 보시겠어요?",
    );
    if (!ok) return;
    onChange?.({ ...data, earlyRevealCaseCards: true });
  };

  const gridIntroMessages = useMemo((): CoachDialogItem[] => {
    return [
      {
        type: "highlight",
        label: purpose.label,
        content: formatCoachDialogBreaks(purpose.purpose),
      },
      {
        type: "bubble",
        content: formatCoachDialogBreaks(
          hmwSnippet
            ? `7단계 HMW 질문을 출발점으로 아이디어를 quantity-first로 펼쳐 보세요.\n\n예: 「${hmwSnippet.slice(0, 48)}${hmwSnippet.length > 48 ? "…" : ""}」`
            : "HMW 질문을 바탕으로 해결 아이디어를 quantity-first로 펼쳐 보세요. 먼저 양으로, 평가는 나중에.",
        ),
      },
      {
        type: "bubble",
        variant: "secondary",
        content: formatCoachDialogBreaks(
          "앞 단계 HMW마다 칸이 생겨요. 핵심 니즈 기준으로 먼저 펼치고, 더 필요하면 「다음 사분면에서 HMW 더 가져오기」로 칸을 늘릴 수 있어요. 막히면 「다른 관점이 필요해요」로 SCAMPER·원리 카드·팀 관점을 받아 보세요. 칸을 비우면 아이디어 은행에 보류됩니다.",
        ),
      },
    ];
  }, [purpose, hmwSnippet]);

  const editorMessages = useMemo((): CoachDialogItem[] => {
    const hmwLine = activeHmw?.hmwText.trim() ?? "";
    const items: CoachDialogItem[] = [
      {
        type: "highlight",
        label: casesUnlocked ? "HMW 참고 사례" : "아이디어 먼저",
        content: formatCoachDialogBreaks(
          casesUnlocked
            ? hmwLine
              ? `「${hmwLine.slice(0, 72)}${hmwLine.length > 72 ? "…" : ""}」\n\n비슷한 문제를 풀어 이미 나온 출시 서비스를 찾아볼게요.`
              : "이 칸의 HMW에 맞춰 출시 사례를 찾아볼게요."
            : hmwLine
              ? `「${hmwLine.slice(0, 72)}${hmwLine.length > 72 ? "…" : ""}」\n\n먼저 왼쪽에서 나만의 아이디어를 한 줄 적어 보세요. 그다음 비슷한 출시 사례를 열어 드릴게요.`
              : "먼저 왼쪽에서 아이디어를 적어 보세요. 사례는 그다음에 보여드려요.",
        ),
      },
    ];

    if (!casesUnlocked) {
      items.push({
        type: "bubble",
        variant: "secondary",
        content: formatCoachDialogBreaks(
          "질문을 풀어보거나, 떠오르는 한 줄부터 적어도 좋아요. 사례를 먼저 보면 비슷한 아이디어에 묶이기 쉬워요.",
        ),
      });
      return items;
    }

    if (casesLoading) {
      items.push({
        type: "bubble",
        content: formatCoachDialogBreaks(
          "웹에서 비슷한 출시 사례를 찾는 중이에요…",
        ),
      });
    } else if (casesError) {
      items.push({
        type: "bubble",
        variant: "secondary",
        content: formatCoachDialogBreaks(
          `${casesError} 왼쪽에서 떠오르는 아이디어부터 적어 봐도 좋아요.`,
        ),
      });
    } else if (cases.length > 0) {
      items.push({
        type: "bubble",
        content: formatCoachDialogBreaks(
          "비슷한 문제를 풀어 이미 나온 서비스가 있어요. 베끼는 게 아니라, 방향 힌트로만 보세요.",
        ),
      });
      items.push({
        type: "bubble",
        variant: "secondary",
        content: formatCoachDialogBreaks(
          "이제 왼쪽에서 나만의 아이디어를 더 적어 보세요. quantity-first — 양부터.",
        ),
      });
    } else {
      items.push({
        type: "bubble",
        content: formatCoachDialogBreaks(
          "바로 떠오르는 아이디어가 있으면 왼쪽에 적어 보세요. 막히면 다시 열어 사례를 받아 볼 수 있어요.",
        ),
      });
    }
    return items;
  }, [activeHmw, cases, casesError, casesLoading, casesUnlocked]);

  const chatContext = useMemo(
    () => ({
      projectId,
      stageId: 8,
      stageTitle: "아이디어 펼치기",
      artifactSummary: `아이디어 ${filledIdeaCount(data)}/${data.slots.length} · HMW ${hmwQuestions.filter((q) => q.hmwText.trim()).length}개 연결${
        casesMode && activeHmw
          ? ` · 편집 중 HMW: ${activeHmw.hmwText.slice(0, 80)}`
          : ""
      }`,
      stageBehaviorNote:
        "8단계 아이디어 펼치기: 핵심 니즈 기반 HMW로 칸을 채우고 quantity-first로 아이디어를 펼칩니다. 새 아이디어 화면에서는 HMW 해석(질문 풀어보기)으로 문제를 좁힌 뒤 쓰게 돕고, 출시 사례는 해당 HMW에 아이디어 1개 저장 후(또는 조기 해제 후)에만 보여 줍니다. 사용자 제목·설명을 대신 채우지 않습니다. 막히면 SCAMPER·원리 카드·팀 관점 자극을 쓰고, 칸을 비우면 아이디어 은행에 보류합니다. 아이디어 스케치는 사용자가 이미지를 올리거나, 제목·설명 작성 후 AI로 아이디어 그리기를 요청할 수 있습니다.",
    }),
    [projectId, data, hmwQuestions, casesMode, activeHmw],
  );

  const messages = casesMode ? editorMessages : gridIntroMessages;
  const sceneKey = casesMode
    ? `stage-8-ideation-${projectId}-editor-${activeHmw?.id ?? "none"}-${casesUnlocked ? (casesLoading ? "load" : "ready") : "locked"}`
    : variant === "intro"
      ? `stage-8-ideation-${projectId}-intro`
      : `stage-8-ideation-work-${projectId}`;

  const footer = casesMode ? (
    casesUnlocked ? (
      !casesLoading && cases.length > 0 ? (
        <LaunchCaseCards cases={cases} onHint={onAppendDescriptionHint} />
      ) : null
    ) : (
      <LockedCaseCardsShell onEarlyReveal={handleEarlyReveal} />
    )
  ) : null;

  if (variant === "intro" && !casesMode) {
    return (
      <AnimatedCoachPanel
        sceneKey={sceneKey}
        statusLabel={stageConfig.introStatusLabel ?? "함께 펼치는 중"}
        statusSub="아이디어 펼치기"
        messages={messages}
        showComposer={false}
      />
    );
  }

  return (
    <AnimatedCoachPanel
      sceneKey={sceneKey}
      statusLabel="함께 펼치는 중"
      statusSub={
        casesMode
          ? casesUnlocked
            ? "HMW 참고 사례"
            : "아이디어 먼저"
          : "아이디어 펼치기"
      }
      messages={messages}
      chatContext={chatContext}
      inputGuide={getStageWorkInputGuide(8, locale)}
      showComposer
      footer={footer}
    />
  );
}
