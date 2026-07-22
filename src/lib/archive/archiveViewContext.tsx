"use client";

import { createContext, useContext, type ReactNode } from "react";

const ArchiveViewContext = createContext(false);

export function ArchiveViewProvider({ children }: { children: ReactNode }) {
  return (
    <ArchiveViewContext.Provider value={true}>
      {children}
    </ArchiveViewContext.Provider>
  );
}

export function useArchiveView(): boolean {
  return useContext(ArchiveViewContext);
}
