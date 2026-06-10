"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { StageActivityGuidePanel } from "@/components/stage/StageActivityGuidePanel";
import {
  isStageGuideDismissed,
  setStageGuideDismissed,
} from "@/lib/stages/stageGuideDismissal";

type StageGuideContextValue = {
  stageNumber: number;
  guideReady: boolean;
  isBlocking: boolean;
  isDismissed: boolean;
  manualOpen: boolean;
  openGuide: () => void;
  closeGuide: () => void;
  completeGuide: (dontShowAgain: boolean) => void;
};

const StageGuideContext = createContext<StageGuideContextValue | null>(null);

export function useStageGuide(): StageGuideContextValue {
  const ctx = useContext(StageGuideContext);
  if (!ctx) {
    throw new Error("useStageGuide must be used within StageGuideProvider");
  }
  return ctx;
}

interface StageGuideProviderProps {
  stageNumber: number;
  children: ReactNode;
}

export function StageGuideProvider({
  stageNumber,
  children,
}: StageGuideProviderProps) {
  const [guideReady, setGuideReady] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [isBlocking, setIsBlocking] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);

  useEffect(() => {
    const dismissed = isStageGuideDismissed(stageNumber);
    setIsDismissed(dismissed);
    setIsBlocking(!dismissed);
    setManualOpen(false);
    setGuideReady(true);
  }, [stageNumber]);

  const openGuide = useCallback(() => setManualOpen(true), []);
  const closeGuide = useCallback(() => setManualOpen(false), []);

  const completeGuide = useCallback(
    (dontShowAgain: boolean) => {
      if (dontShowAgain) {
        setStageGuideDismissed(stageNumber, true);
        setIsDismissed(true);
      }
      setIsBlocking(false);
      setManualOpen(false);
    },
    [stageNumber],
  );

  const value = useMemo(
    (): StageGuideContextValue => ({
      stageNumber,
      guideReady,
      isBlocking,
      isDismissed,
      manualOpen,
      openGuide,
      closeGuide,
      completeGuide,
    }),
    [
      stageNumber,
      guideReady,
      isBlocking,
      isDismissed,
      manualOpen,
      openGuide,
      closeGuide,
      completeGuide,
    ],
  );

  return (
    <StageGuideContext.Provider value={value}>
      {children}
    </StageGuideContext.Provider>
  );
}

interface StageGuideBodyProps {
  children: ReactNode;
}

/** 단계 작업 본문 — 가이드(최초) 또는 실제 단계 UI */
export function StageGuideBody({ children }: StageGuideBodyProps) {
  const {
    stageNumber,
    guideReady,
    isBlocking,
    isDismissed,
    manualOpen,
    closeGuide,
    completeGuide,
  } = useStageGuide();

  const showGate = guideReady && isBlocking;
  const showDialog = guideReady && manualOpen && !isBlocking;

  if (!guideReady) {
    return null;
  }

  return (
    <>
      {showGate ? (
        <StageActivityGuidePanel
          stageNumber={stageNumber}
          mode="gate"
          showDismissOption={!isDismissed}
          onStart={completeGuide}
        />
      ) : null}

      {showDialog ? (
        <StageActivityGuidePanel
          stageNumber={stageNumber}
          mode="dialog"
          showDismissOption={!isDismissed}
          onStart={completeGuide}
          onClose={closeGuide}
        />
      ) : null}

      {!isBlocking ? children : null}
    </>
  );
}
