"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

interface BracketOverlayContextValue {
  open: boolean;
  openBracket: () => void;
  closeBracket: () => void;
}

const BracketOverlayContext = createContext<BracketOverlayContextValue | null>(
  null,
);

export function BracketOverlayProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  const openBracket = useCallback(() => setOpen(true), []);
  const closeBracket = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({ open, openBracket, closeBracket }),
    [open, openBracket, closeBracket],
  );

  return (
    <BracketOverlayContext.Provider value={value}>
      {children}
    </BracketOverlayContext.Provider>
  );
}

export function useBracketOverlay() {
  const context = useContext(BracketOverlayContext);
  if (!context) {
    throw new Error("useBracketOverlay must be used within BracketOverlayProvider");
  }
  return context;
}
