"use client";

import { createContext, useContext, type ReactNode } from "react";

const StageIntroGateContext = createContext<(() => void) | null>(null);

export function StageIntroGateProvider({
  onIntroComplete,
  children,
}: {
  onIntroComplete: () => void;
  children: ReactNode;
}) {
  return (
    <StageIntroGateContext.Provider value={onIntroComplete}>
      {children}
    </StageIntroGateContext.Provider>
  );
}

/** StageContainer 인트로 모드에서 코치 발화 종료 시 호출 */
export function useStageIntroGate(): (() => void) | null {
  return useContext(StageIntroGateContext);
}
