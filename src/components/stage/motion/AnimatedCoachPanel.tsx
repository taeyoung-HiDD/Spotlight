"use client";

import { IconBulb } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
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
import { useStageIntroGate } from "@/components/layout/StageIntroGate";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { followCoachConversationScroll } from "@/lib/motion/coachScrollFollow";
import { MOTION, sleep } from "@/lib/motion/timings";
import { stageCoachAside, stageCoachName, stageCoachStatus } from "@/lib/stages/ui";

type LiveTurn =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "coach"; text: string; replyRaw: string }
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
  /** API 대신 로컬·커스텀 코치 응답 (대화 수집 단계 등) */
  onCoachMessage?: (
    message: string,
    history: CoachChatHistoryItem[],
  ) => Promise<string | null | undefined>;
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
}: AnimatedCoachPanelProps) {
  const notifyIntroGate = useStageIntroGate();
  const reducedMotion = useReducedMotion();
  const [introMessages, setIntroMessages] = useState(messages);
  const [liveTurns, setLiveTurns] = useState<LiveTurn[]>([]);
  const [exchangeBusy, setExchangeBusy] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [coachRevealing, setCoachRevealing] = useState(false);
  const [introRevealing, setIntroRevealing] = useState(false);
  const [introDialogDone, setIntroDialogDone] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollEndRef = useRef<HTMLDivElement>(null);
  const sendLockRef = useRef(false);

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
    setIntroMessages(messages);
    setLiveTurns([]);
    setExchangeBusy(false);
    setChatLoading(false);
    setIntroDialogDone(false);
    sendLockRef.current = false;
    // messages는 sceneKey 전환 시점 스냅샷만 반영 (참조 변경으로 인트로 리플레이 방지)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- messages
  }, [sceneKey]);

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
      ? getStageWorkInputGuide(chatContext.stageId)
      : showComposer
        ? DEFAULT_COACH_INPUT_GUIDE
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

        const pushCoachReply = async (raw: string) => {
          const replyTrimmed = raw.trim();
          if (!replyTrimmed) return;
          const display = formatCoachDialogBreaks(
            (formatCoachReply?.(replyTrimmed) ?? replyTrimmed).trim(),
          );
          if (!display) return;
          if (!reducedMotion) {
            await sleep(MOTION.coachReplyAfterFetchMs);
          }
          setLiveTurns((prev) => [
            ...prev,
            {
              id: `coach-${Date.now()}`,
              role: "coach",
              text: display,
              replyRaw: replyTrimmed,
            },
          ]);
        };

        if (onCoachMessage) {
          const reply = await onCoachMessage(trimmed, history);
          if (reply?.trim()) await pushCoachReply(reply);
          return;
        }

        if (!chatContext) return;

        const guide = resolvedInputGuide ?? DEFAULT_COACH_INPUT_GUIDE;
        const { reply } = await sendCoachChat({
          message: trimmed,
          history,
          context: {
            ...chatContext,
            inputGuideContext: formatInputGuideForContext(guide),
          },
        });
        await pushCoachReply(reply);
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "응답을 받지 못했습니다.";
        setLiveTurns((prev) => [
          ...prev,
          { id: `err-${Date.now()}`, role: "error", text: message },
        ]);
      } finally {
        setChatLoading(false);
        setExchangeBusy(false);
        sendLockRef.current = false;
      }
    },
    [
      chatContext,
      coachRevealing,
      exchangeBusy,
      chatLoading,
      formatCoachReply,
      introRevealing,
      liveTurns,
      onCoachMessage,
      onCoachReply,
      onUserMessage,
      reducedMotion,
      resolvedInputGuide,
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
      },
    ]);
    setIntroDialogDone(true);
  }, [injectedExchange]);

  const isReplyBusy =
    exchangeBusy || chatLoading || coachRevealing || introRevealing;
  const displayStatus = chatLoading
    ? "생각하는 중"
    : coachRevealing || introRevealing
      ? "입력하는 중"
      : statusLabel;

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
          <div className={stageCoachName}>{COACH_DISPLAY_NAME}</div>
          <div className={stageCoachStatus}>
            {statusSub ? `${displayStatus} · ${statusSub}` : displayStatus}
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
                <CoachBubble
                  variant={turn.role === "error" ? "secondary" : "primary"}
                >
                  {turn.role === "error" ? (
                    <>
                      <span className="font-semibold text-foreground">
                        연결 문제
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
                        if (turn.role === "coach") {
                          onCoachReply?.(turn.replyRaw);
                        }
                      }}
                    />
                  )}
                </CoachBubble>
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
