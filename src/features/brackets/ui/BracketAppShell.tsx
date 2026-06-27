"use client";

import type { ReactNode } from "react";
import { BracketOverlayProvider } from "@/features/brackets/model/BracketOverlayContext";
import { BracketOverlay } from "@/features/brackets/ui/BracketOverlay";

export function BracketAppShell({ children }: { children: ReactNode }) {
  return (
    <BracketOverlayProvider>
      {children}
      <BracketOverlay />
    </BracketOverlayProvider>
  );
}
