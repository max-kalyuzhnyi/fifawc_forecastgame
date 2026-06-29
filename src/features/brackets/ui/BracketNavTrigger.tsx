"use client";

import { useTranslations } from "next-intl";
import { useBracketOverlay } from "@/features/brackets/model/BracketOverlayContext";
import { BracketViewIcon } from "@/shared/ui/BracketViewIcon";
import { cn } from "@/lib/utils";

export function BracketNavTrigger({ className }: { className?: string }) {
  const t = useTranslations("nav");
  const { openBracket } = useBracketOverlay();

  return (
    <button
      type="button"
      onClick={openBracket}
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/85 transition-[transform,background-color] duration-200 hover:bg-white/15 active:scale-95 motion-reduce:transition-none",
        className,
      )}
      aria-label={t("brackets")}
    >
      <BracketViewIcon className="size-5" />
    </button>
  );
}
