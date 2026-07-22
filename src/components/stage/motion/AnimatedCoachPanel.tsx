"use client";

import { IconBulb } from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CoachBubble } from "@/components/stage/CoachPanel";
import { CoachDialogMessage } from "@/components/stage/motion/CoachDialogMessage";
import {
  CoachSequentialDialog,
  type CoachDialogItem,
} from "@/components/stage/motion/CoachSequentialDialog";
import { CoachMessageComposer } from "@/components/stage/motion/CoachMessageComposer";
import { CoachRevealText } from "@/components/stage/motion/CoachRevealText";
import { CoachTypingIndicator } from "@/components/stage/motion/CoachTypingIndicator";
import { CoachUserBubble } from "@/components/stage/motion/CoachUserBubble";
import {
  sendCoachChat,
  type CoachChatContext,
  type CoachChatHistoryItem,
} from "@/lib/coach/chatClient";
import { COACH_DISPLAY_NAME } from "@/lib/coach/constants";
import { formatCoachDialogBreaks } from "@/lib/coach/formatCoachDialog";
import {
  DEFAULT_COACH_INPUT_GUIDE,
  formatInputGuideForContext,
  getStageWorkInputGuide,
  type CoachInputGuide,
} from "@/lib/coach/inputGuidance";
import { useOptionalProjectWorkspace } from "@/components/project/ProjectWorkspaceContext";
import { useStageIntroGate } from "@/components/layout/StageIntroGate";
import { useLocalizedContent } from "@/hooks/useLocalizedContent";
import { useT } from "@/hooks/useT";
import { useUiLocale } from "@/hooks/useUiLocale";
import { briefCoachIntroForTaskFocus } from "@/lib/coach/coachIntroBrief";
import { withCoachingLevelHint } from "@/lib/coach/coachingLevelContext";
import { localizeCoachStatus } from "@/lib/i18n/localizeCoachStatus";
import { isTaskFocusedProjectState } from "@/lib/stages/stage1/guidanceStyle";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { followCoachConversationScroll } from "@/lib/motion/coachScrollFollow";
import { MOTION, sleep } from "@/lib/motion/timings";
import {
  normalizeCoachMessageResult,
  type CoachMessageHandlerResult,
  type CoachSpeakerTurnPayload,
} from "@/lib/stages/stage4/multidisciplinaryCoach";
import { stageCoachAside, stageCoachName, stageCoachStatus } from "@/lib/stages/ui";

type LiveTurn =
  | { id: string; role: "user"; text: string }
  | {
      id: string;
      role: "coach";
      text: string;
      replyRaw: string;
      speaker?: "kevin" | "expert";
      expertId?: string;
      expertLabelKo?: string;
      expertLabelEn?: string;
      lens?: string;
    }
  | { id: string; role: "error"; text: string };

interface AnimatedCoachPanelProps {
  statusLabel?: string;
  statusSub?: string;
  messages: CoachDialogItem[];
  sceneKey: string;
  onDialogComplete?: () => void;
  footer?: ReactNode;
  /** 하단 메시지 입력 (기본 켜짐) */
  showComposer?: boolean;
  /** 설정 시 Gemini `/api/chat` 연동 */
  chatContext?: CoachChatContext;
  /** API 대신 로컬·커스텀 코치 응답 (대화 수집 단계 등) — 문자열 또는 다중 화자 turns */
  onCoachMessage?: (
    message: string,
    history: CoachChatHistoryItem[],
  ) => Promise<CoachMessageHandlerResult>;
  onUserMessage?: (message: string) => void;
  onCoachReply?: (reply: string) => void;
  /** 코치 응답 표시 전 변환 (예: EDIT 메타 줄 제거) */
  formatCoachReply?: (reply: string) => string;
  /** 입력 대기 예시 가이드 (미설정 시 stageId 기본값 없음 → DEFAULT) */
  inputGuide?: CoachInputGuide;
  /** 단계 전환 시 입력란 초기화·자동완성 간섭 방지 */
  composerResetKey?: string;
  /** 인트로 순차 재생이 끝난 뒤, 대화 상단에 정적으로 붙는 코치 말풍선(재생 없음) */
  staticCoachLines?: CoachDialogItem[];
  /** 외부 UI(예: 「이 항목 완료」)에서 보낼 메시지 — id가 바뀔 때마다 1회 전송 */
  queuedSend?: { id: string; text: string } | null;
  /** 외부에서 완성된 사용자·코치 교환을 대화에 삽입 */
  injectedExchange?: {
    id: string;
    userText: string;
    coachText: string;
  } | null;
  /** 외부에서 Kevin/전문가 말풍선을 순차 삽입 (id 변경 시 1회) */
  injectedSpeakerTurns?: {
    id: string;
    turns: CoachSpeakerTurnPayload[];
  } | null;
}

/** 컷 2+ · 코치 패널 — 발화 순차 재생 + 사용자 입력 + (선택) Gemini 채팅 */
export function AnimatedCoachPanel({
  statusLabel = "듣는 중",
  statusSub,
  messages,
  sceneKey,
  onDialogComplete,
  footer,
  showComposer = true,
  chatContext,
  onCoachMessage,
  onUserMessage,
  onCoachReply,
  formatCoachReply,
  inputGuide,
  composerResetKey,
  staticCoachLines,
  queuedSend,
  injectedExchange,
  injectedSpeakerTurns,
}: AnimatedCoachPanelProps) {
  const workspace = useOptionalProjectWorkspace();
  const uiLocale = useUiLocale();
  const t = useT();
  const localizedStatusLabel = localizeCoachStatus(uiLocale, statusLabel);
  const { text: localizedStatusSub } = useLocalizedContent(statusSub ?? "");
  const notifyIntroGate = useStageIntroGate();
  const reducedMotion = useReducedMotion();
  const taskFocused = workspace
    ? isTaskFocusedProjectState({
        guidanceStyle: workspace.guidanceStyle,
        userLevel: workspace.coachingLevel,
      })
    : false;
  const resolvedIntroMessages = useMemo(
    () => briefCoachIntroForTaskFocus(messages, taskFocused),
    [messages, taskFocused],
  );
  const [introMessages, setIntroMessages] = useState(resolvedIntroMessages);
  const [liveTurns, setLiveTurns] = useState<LiveTurn[]>([]);
  const [exchangeBusy, setExchangeBusy] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [coachRevealing, setCoachRevealing] = useState(false);
  const [introRevealing, setIntroRevealing] = useState(false);
  const [introDialogDone, setIntroDialogDone] = useState(false);
  const [activeExpertStatus, setActiveExpertStatus] = useState<string | null>(
    null,
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const sendLockRef = useRef(false);
  const revealDoneRef = useRef<(() => void) | null>(null);

  const isSpeechGenerating =
    introRevealing || coachRevealing || chatLoading || exchangeBusy;

  /** 대화·예시 칩·입력창·푸터 등 패널 최하단까지 스크롤 */
  const followScroll = useCallback(
    (force = true) => {
      followCoachConversationScroll({
        coachScrollEl: scrollRef.current,
        scrollEndEl: scrollEndRef.current,
        force: force || isSpeechGenerating,
      });
    },
    [isSpeechGenerating],
  );

  useEffect(() => {
    setIntroMessages(resolvedIntroMessages);
    setLiveTurns([]);
    setExchangeBusy(false);
    setChatLoading(false);
    setIntroDialogDone(false);
    setActiveExpertStatus(null);
    sendLockRef.current = false;
    revealDoneRef.current = null;
  }, [sceneKey, resolvedIntroMessages]);

  const waitForReveal = useCallback(async () => {
    await new Promise<void>((resolve) => {
      let settled = false;
      const done = () => {
        if (settled) return;
        settled = true;
        if (revealDoneRef.current === done) revealDoneRef.current = null;
        resolve();
      };
      revealDoneRef.current = done;
      if (reducedMotion) {
        queueMicrotask(done);
        return;
      }
      window.setTimeout(done, 20_000);
    });
  }, [reducedMotion]);

  const pushSpeakerTurns = useCallback(
    async (payloads: CoachSpeakerTurnPayload[]) => {
      for (let i = 0; i < payloads.length; i += 1) {
        const payload = payloads[i]!;
        const raw = payload.text.trim();
        if (!raw) continue;
        const display = formatCoachDialogBreaks(
          (formatCoachReply?.(raw) ?? raw).trim(),
        );
        if (!display) continue;

        if (payload.speaker === "expert") {
          const label =
            payload.expertLabelKo?.trim() ||
            payload.expertLabelEn?.trim() ||
            "전문가";
          setActiveExpertStatus(label);
        } else {
          setActiveExpertStatus(null);
        }

        if (!reducedMotion && i > 0) {
          await sleep(MOTION.coachReplyAfterUserMs);
        }

        const turnId = `coach-${Date.now()}-${i}`;
        setLiveTurns((prev) => [
          ...prev,
          {
            id: turnId,
            role: "coach",
            text: display,
            replyRaw: raw,
            speaker: payload.speaker,
            expertId: payload.expertId,
            expertLabelKo: payload.expertLabelKo,
            expertLabelEn: payload.expertLabelEn,
            lens: payload.lens,
          },
        ]);
        await waitForReveal();
      }
      setActiveExpertStatus(null);
    },
    [formatCoachReply, reducedMotion, waitForReveal],
  );

  useEffect(() => {
    followScroll(true);
  }, [liveTurns, chatLoading, coachRevealing, introRevealing, exchangeBusy, followScroll]);

  useEffect(() => {
    const content = contentRef.current;
    if (!content) return;

    const ro = new ResizeObserver(() => {
      followScroll(true);
    });
    ro.observe(content);
    return () => ro.disconnect();
  }, [followScroll]);

  const resolvedInputGuide =
    inputGuide ??
    (chatContext?.stageId != null
      ? getStageWorkInputGuide(chatContext.stageId, uiLocale)
      : showComposer
        ? getStageWorkInputGuide(0, uiLocale)
        : undefined);

  const hasExampleChips = Boolean(resolvedInputGuide?.examples?.length);

  /** Kevin 발화(인트로 순차 재생 · 라이브 타이핑 · API 대기)가 모두 끝난 뒤에만 입력·예시 칩 노출 */
  const coachSpeechIdle = !introRevealing && !coachRevealing && !chatLoading;

  const guideTurnReady =
    introDialogDone ||
    (liveTurns.some((t) => t.role === "user") &&
      liveTurns.some((t) => t.role === "coach"));

  const composerReady =
    coachSpeechIdle && guideTurnReady && !exchangeBusy;

  const showInputGuide =
    hasExampleChips && composerReady;

  const showSpeechIdleFooter = Boolean(footer) && coachSpeechIdle;

  useEffect(() => {
    if (!composerReady && !showSpeechIdleFooter) return;
    followScroll(true);
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => followScroll(true));
    });
    return () => cancelAnimationFrame(id);
  }, [composerReady, showSpeechIdleFooter, showInputGuide, showComposer, followScroll]);

  const handleComposerLayout = useCallback(() => {
    followScroll(true);
  }, [followScroll]);

  const handleSend = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (
        !trimmed ||
        sendLockRef.current ||
        exchangeBusy ||
        chatLoading ||
        coachRevealing ||
        introRevealing
      ) {
        return;
      }

      sendLockRef.current = true;
      setExchangeBusy(true);
      try {
        if (!reducedMotion) {
          await sleep(MOTION.userTurnBeforeShowMs);
        }

        const userId = `user-${Date.now()}`;
        setLiveTurns((prev) => [...prev, { id: userId, role: "user", text: trimmed }]);
        onUserMessage?.(trimmed);

        const history: CoachChatHistoryItem[] = [
          ...liveTurns
            .filter((t) => t.role === "user" || t.role === "coach")
            .map((t) => ({
              role: t.role === "user" ? ("user" as const) : ("model" as const),
              content: t.text,
            })),
          { role: "user", content: trimmed },
        ];

        if (!reducedMotion) {
          await sleep(MOTION.coachReplyAfterUserMs);
        }

        setChatLoading(true);

        if (onCoachMessage) {
          const result = await onCoachMessage(trimmed, history);
          const turns = normalizeCoachMessageResult(result);
          setChatLoading(false);
          if (turns.length) await pushSpeakerTurns(turns);
          return;
        }

        if (!chatContext) return;

        const guide = resolvedInputGuide ?? DEFAULT_COACH_INPUT_GUIDE;
        const artifactSummary = chatContext.artifactSummary
          ? withCoachingLevelHint(
              chatContext.artifactSummary,
              workspace?.coachingLevel,
            )
          : chatContext.artifactSummary;
        const { reply } = await sendCoachChat({
          message: trimmed,
          history,
          context: {
            ...chatContext,
            artifactSummary,
            inputGuideContext: formatInputGuideForContext(guide),
            uiLocale,
          },
        });
        setChatLoading(false);
        await pushSpeakerTurns([{ speaker: "kevin", text: reply }]);
      } catch (e) {
        const message =
          e instanceof Error
            ? e.message
            : uiLocale === "en"
              ? "No response received."
              : "응답을 받지 못했습니다.";
        setLiveTurns((prev) => [
          ...prev,
          { id: `err-${Date.now()}`, role: "error", text: message },
        ]);
      } finally {
        setChatLoading(false);
        setExchangeBusy(false);
        sendLockRef.current = false;
        setActiveExpertStatus(null);
      }
    },
    [
      chatContext,
      coachRevealing,
      exchangeBusy,
      chatLoading,
      introRevealing,
      liveTurns,
      onCoachMessage,
      onUserMessage,
      pushSpeakerTurns,
      reducedMotion,
      resolvedInputGuide,
      uiLocale,
      workspace?.coachingLevel,
    ],
  );

  const lastQueuedSendIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!queuedSend?.text?.trim() || !composerReady) return;
    if (lastQueuedSendIdRef.current === queuedSend.id) return;
    lastQueuedSendIdRef.current = queuedSend.id;
    void handleSend(queuedSend.text);
  }, [queuedSend, composerReady, handleSend]);

  const lastInjectedExchangeIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!injectedExchange?.coachText?.trim()) return;
    if (lastInjectedExchangeIdRef.current === injectedExchange.id) return;
    lastInjectedExchangeIdRef.current = injectedExchange.id;
    const stamp = Date.now();
    setLiveTurns((prev) => [
      ...prev,
      {
        id: `inj-u-${stamp}`,
        role: "user",
        text: injectedExchange.userText.trim() || "디브리핑을 요청했어요.",
      },
      {
        id: `inj-c-${stamp}`,
        role: "coach",
        text: injectedExchange.coachText,
        replyRaw: injectedExchange.coachText,
        speaker: "kevin",
      },
    ]);
    setIntroDialogDone(true);
  }, [injectedExchange]);

  const lastInjectedSpeakerTurnsIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!injectedSpeakerTurns?.turns?.length) return;
    if (lastInjectedSpeakerTurnsIdRef.current === injectedSpeakerTurns.id) {
      return;
    }
    lastInjectedSpeakerTurnsIdRef.current = injectedSpeakerTurns.id;
    setIntroDialogDone(true);
    setExchangeBusy(true);
    void (async () => {
      try {
        await pushSpeakerTurns(injectedSpeakerTurns.turns);
      } finally {
        setExchangeBusy(false);
      }
    })();
  }, [injectedSpeakerTurns, pushSpeakerTurns]);

  const isReplyBusy =
    exchangeBusy || chatLoading || coachRevealing || introRevealing;
  const displayStatus = chatLoading
    ? t("coach.status.thinking")
    : coachRevealing || introRevealing
      ? t("coach.status.typing")
      : localizedStatusLabel || t("coach.status.listening");

  const displayStatusSub = activeExpertStatus
    ? activeExpertStatus
    : statusSub?.trim()
      ? localizedStatusSub
      : "";

  const handleDialogComplete = useCallback(() => {
    setIntroDialogDone(true);
    onDialogComplete?.();
    notifyIntroGate?.();
  }, [onDialogComplete, notifyIntroGate]);

  return (
    <aside className={`${stageCoachAside} flex h-full min-h-0 flex-col`}>
      <div className="mb-3 flex shrink-0 items-center gap-2.5 border-b border-divider pb-3">
        <div className="flex size-9 items-center justify-center rounded-full bg-spotlight">
          <IconBulb className="size-4 text-on-spotlight" stroke={2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className={stageCoachName}>
            {activeExpertStatus || COACH_DISPLAY_NAME}
          </div>
          <div className={stageCoachStatus}>
            {displayStatusSub
              ? `${displayStatus} · ${displayStatusSub}`
              : displayStatus}
          </div>
        </div>
        <span
          className="coach-phase-pulse size-2 shrink-0 rounded-full bg-spotlight"
          style={{ animation: "coach-phase-pulse 2s ease-in-out infinite" }}
          aria-hidden
        />
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-0.5"
      >
        <div ref={contentRef} className="flex flex-col gap-3">
          <CoachSequentialDialog
            messages={introMessages}
            sceneKey={sceneKey}
            onComplete={handleDialogComplete}
            onTypingChange={setIntroRevealing}
            onProgress={() => followScroll()}
          />
          {introDialogDone && staticCoachLines?.length
            ? staticCoachLines.map((item, index) => (
                <CoachDialogMessage
                  key={`${sceneKey}-static-coach-${index}`}
                  item={item}
                  mode="static"
                  sceneKey={sceneKey}
                  index={introMessages.length + index}
                />
              ))
            : null}
          {liveTurns.map((turn) => (
            <div
              key={turn.id}
              className="coach-message-in"
              style={
                reducedMotion
                  ? undefined
                  : {
                      animation:
                        turn.role === "user"
                          ? `coach-message-in ${MOTION.userTurnRevealMs}ms ease forwards`
                          : `coach-message-in ${MOTION.coachTurnRevealMs}ms ease forwards`,
                    }
              }
            >
              {turn.role === "user" ? (
                <CoachUserBubble>{turn.text}</CoachUserBubble>
              ) : (
                <div className="space-y-1.5">
                  {turn.role === "coach" && turn.speaker === "expert" ? (
                    <div className="px-0.5">
                      <p className="text-[13px] font-semibold text-foreground break-keep">
                        {turn.expertLabelKo || "전문가"}
                        {turn.expertLabelEn ? (
                          <span className="ml-1.5 text-[12px] font-medium text-muted">
                            {turn.expertLabelEn}
                          </span>
                        ) : null}
                      </p>
                      {turn.lens ? (
                        <p className="text-[11px] text-muted break-keep">
                          {turn.lens}
                        </p>
                      ) : null}
                    </div>
                  ) : turn.role === "coach" ? (
                    <div className="px-0.5">
                      <p className="text-[13px] font-semibold text-foreground break-keep">
                        {COACH_DISPLAY_NAME}
                      </p>
                      <p className="text-[11px] text-muted break-keep">코치</p>
                    </div>
                  ) : null}
                  <CoachBubble
                    variant={
                      turn.role === "error" || turn.speaker === "expert"
                        ? "secondary"
                        : "primary"
                    }
                  >
                    {turn.role === "error" ? (
                      <>
                        <span className="font-semibold text-foreground">
                          {t("coach.connectionIssue")}
                        </span>
                        {" — "}
                        {turn.text}
                      </>
                    ) : (
                      <CoachRevealText
                        text={turn.text}
                        onProgress={() => followScroll()}
                        onTypingChange={setCoachRevealing}
                        onComplete={() => {
                          revealDoneRef.current?.();
                          revealDoneRef.current = null;
                          if (turn.role === "coach" && turn.speaker !== "expert") {
                            onCoachReply?.(turn.replyRaw);
                          }
                        }}
                      />
                    )}
                  </CoachBubble>
                </div>
              )}
            </div>
          ))}
          {chatLoading ? <CoachTypingIndicator /> : null}

          {showSpeechIdleFooter ? (
            <div className="shrink-0">{footer}</div>
          ) : null}

          {showComposer && composerReady ? (
            <CoachMessageComposer
              key={composerResetKey ?? "composer"}
              onSend={(text) => void handleSend(text)}
              disabled={isReplyBusy}
              inputGuide={resolvedInputGuide}
              showGuide={showInputGuide}
              onLayoutChange={handleComposerLayout}
            />
          ) : null}

          <div ref={scrollEndRef} className="h-px w-full shrink-0" aria-hidden />
        </div>
      </div>
    </aside>
  );
}
