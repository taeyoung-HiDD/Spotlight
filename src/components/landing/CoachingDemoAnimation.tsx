"use client";

import { IconBulb } from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState } from "react";

type MessageRole = "user" | "coach";

interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  emphasis?: string[];
}

interface CoachingPhase {
  id: string;
  stage: string;
  mode: string;
  messages: ChatMessage[];
  insight?: string;
  ideas?: string[];
}

const PHASES: CoachingPhase[] = [
  {
    id: "research",
    stage: "단계 3 · 사용자 조사 준비하기",
    mode: "듣는 중",
    messages: [
      {
        id: "r1",
        role: "user",
        text: "인터뷰 로그 3건 올렸어요. 소상공인들이 재고 확인에 하루 2시간은 쓴다고 해요.",
      },
      {
        id: "r2",
        role: "coach",
        text: "리서치 자료 잘 받았어요. 발화와 행동에서 Pain 신호를 함께 짚어볼게요.",
        emphasis: ["Pain"],
      },
    ],
  },
  {
    id: "pain",
    stage: "단계 4 · 패턴 발견",
    mode: "짚어주는 중",
    messages: [
      {
        id: "p1",
        role: "coach",
        text: "Pain point — 마감 직전 재고 파악이 어렵다. 사용자가 직접 말한 것이에요.",
        emphasis: ["Pain point", "말한 것"],
      },
      {
        id: "p2",
        role: "coach",
        text: "관찰 메모에는 ‘바쁠 때 앱을 안 연다’는 행동이 있어요. 말과 행동을 나란히 둘게요.",
        emphasis: ["행동"],
      },
    ],
  },
  {
    id: "needs",
    stage: "단계 5 · 진짜 필요 찾기 · 니즈 분석하기",
    mode: "짚어주는 중",
    messages: [
      {
        id: "n1",
        role: "coach",
        text: "한 단계 더 — 잠재 니즈는 ‘예측 가능한 재고’일 수 있어요. 아직 가설 상태예요.",
        emphasis: ["잠재 니즈", "가설"],
      },
    ],
    insight: "How보다 Why — 표면 답이 아니라 깊은 동기로 내려간다.",
  },
  {
    id: "ideas",
    stage: "단계 7 · HMW 질문 만들기",
    mode: "짚어주는 중",
    messages: [
      {
        id: "i1",
        role: "coach",
        text: "잠재 니즈를 HMW 질문으로 바꿔 볼까요? 아직 답이 아니라 열린 질문이면 충분해요.",
        emphasis: ["HMW"],
      },
    ],
    ideas: ["실시간 재고 알림", "바코드 스캔 키트", "예측 대시보드"],
  },
];

const TYPING_MS = 700;
const MESSAGE_GAP_MS = 2400;
const PHASE_PAUSE_MS = 2800;
const IDEA_STAGGER_MS = 450;

function emphasizeText(text: string, terms: string[] = []) {
  if (terms.length === 0) return text;

  const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "g");
  const parts = text.split(pattern);

  return parts.map((part, index) =>
    terms.includes(part) ? (
      <strong key={`${part}-${index}`} className="font-semibold text-gold">
        {part}
      </strong>
    ) : (
      part
    ),
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function TypingIndicator() {
  return (
    <div
      className="flex items-center gap-1 rounded-[9px] bg-surface px-3 py-2.5"
      aria-label="코치 입력 중"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="coach-typing-dot size-1.5 rounded-full bg-muted"
          style={{ animation: `coach-typing 1s ease-in-out ${i * 0.15}s infinite` }}
        />
      ))}
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isCoach = message.role === "coach";

  return (
    <div
      className={[
        "coach-message-in max-w-[95%] rounded-[9px] px-3 py-2.5 text-[11.5px] leading-[1.65]",
        isCoach
          ? "mr-auto bg-surface text-foreground"
          : "ml-auto bg-bubble-user text-foreground",
      ].join(" ")}
      style={{ animation: "coach-message-in 0.45s ease-out both" }}
    >
      {emphasizeText(message.text, message.emphasis)}
    </div>
  );
}

export function CoachingDemoAnimation() {
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [visibleMessages, setVisibleMessages] = useState<ChatMessage[]>([]);
  const [showInsight, setShowInsight] = useState(false);
  const [visibleIdeas, setVisibleIdeas] = useState<string[]>([]);
  const [isTyping, setIsTyping] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const phase = PHASES[phaseIndex];

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timersRef.current.push(id);
  }, []);

  const runPhase = useCallback(
    (index: number) => {
      const current = PHASES[index];
      setPhaseIndex(index);
      setVisibleMessages([]);
      setShowInsight(false);
      setVisibleIdeas([]);
      setIsTyping(false);

      let elapsed = 400;

      current.messages.forEach((message, msgIndex) => {
        if (message.role === "coach") {
          schedule(() => setIsTyping(true), elapsed);
          elapsed += TYPING_MS;
          schedule(() => setIsTyping(false), elapsed);
        }

        schedule(() => {
          setVisibleMessages((prev) => [...prev, message]);
        }, elapsed);

        elapsed += MESSAGE_GAP_MS;

        if (msgIndex === current.messages.length - 1 && current.insight) {
          schedule(() => setShowInsight(true), elapsed);
          elapsed += MESSAGE_GAP_MS;
        }

        if (msgIndex === current.messages.length - 1 && current.ideas) {
          schedule(() => {
            current.ideas?.forEach((idea, ideaIndex) => {
              schedule(() => {
                setVisibleIdeas((prev) => [...prev, idea]);
              }, ideaIndex * IDEA_STAGGER_MS);
            });
          }, elapsed);
          elapsed +=
            (current.ideas.length - 1) * IDEA_STAGGER_MS + MESSAGE_GAP_MS;
        }
      });

      schedule(() => {
        const next = (index + 1) % PHASES.length;
        runPhase(next);
      }, elapsed + PHASE_PAUSE_MS);
    },
    [schedule],
  );

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const applyMotion = () => setReducedMotion(mq.matches);
    applyMotion();
    mq.addEventListener("change", applyMotion);
    return () => mq.removeEventListener("change", applyMotion);
  }, []);

  useEffect(() => {
    clearTimers();

    if (reducedMotion) {
      const last = PHASES[PHASES.length - 1];
      setPhaseIndex(PHASES.length - 1);
      setVisibleMessages(last.messages);
      setShowInsight(Boolean(last.insight));
      setVisibleIdeas(last.ideas ?? []);
      setIsTyping(false);
      return;
    }

    runPhase(0);
    return clearTimers;
  }, [reducedMotion, runPhase, clearTimers]);

  return (
    <div className="relative rounded-[14px] border border-border-warm bg-panel p-[18px] shadow-[0_12px_32px_rgba(45,45,42,0.1)]">
      <span className="absolute -top-3 left-[18px] rounded bg-charcoal px-[11px] py-1 text-[9.5px] font-medium tracking-[0.4px] text-spotlight">
        실제 코칭 화면
      </span>

      <div className="mb-3 flex items-center gap-[9px] border-b border-divider pb-[11px]">
        <div className="flex size-[30px] items-center justify-center rounded-full bg-spotlight">
          <IconBulb className="size-4 text-on-spotlight" stroke={2} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11.5px] font-medium text-foreground">Kevin</div>
          <div
            key={phase.id}
            className="text-[9.5px] text-muted transition-opacity duration-300"
          >
            {phase.stage} · {phase.mode}
          </div>
        </div>
      </div>

      <div className="mb-2 flex gap-1">
        {PHASES.map((p, i) => (
          <span
            key={p.id}
            className={[
              "h-1 flex-1 rounded-full transition-colors duration-500",
              i === phaseIndex ? "bg-spotlight" : "bg-border-warm",
              i === phaseIndex && !reducedMotion ? "coach-phase-pulse" : "",
            ].join(" ")}
            style={
              i === phaseIndex && !reducedMotion
                ? { animation: "coach-phase-pulse 2s ease-in-out infinite" }
                : undefined
            }
            aria-hidden
          />
        ))}
      </div>

      <div
        className="flex min-h-[220px] flex-col gap-2 overflow-hidden"
        aria-live="polite"
        aria-atomic="false"
      >
        {visibleMessages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}

        {isTyping && <TypingIndicator />}

        {showInsight && phase.insight && (
          <div
            className="coach-message-in rounded-[9px] border border-spotlight bg-highlight px-[13px] py-[11px]"
            style={{ animation: "coach-message-in 0.45s ease-out both" }}
          >
            <div className="mb-1.5 text-[9px] font-medium tracking-[0.4px] text-gold uppercase">
              디자인씽킹 정신
            </div>
            <p className="text-xs font-medium leading-normal text-foreground italic">
              {phase.insight}
            </p>
          </div>
        )}

        {visibleIdeas.length > 0 && (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {visibleIdeas.map((idea) => (
              <span
                key={idea}
                className="coach-message-in rounded-md border border-spotlight bg-highlight px-2.5 py-1 text-[10.5px] font-medium text-gold"
                style={{ animation: "coach-message-in 0.4s ease-out both" }}
              >
                {idea}
              </span>
            ))}
          </div>
        )}
      </div>

      <p className="mt-2 text-[9px] text-muted">
        리서치 → Pain point → 니즈 → 아이디어 · AI 코치와 대화하며 진행
      </p>
    </div>
  );
}
