"use client";

import { useTranslations } from "next-intl";

interface PlayoffTierNoteProps {
  tier: number | null | undefined;
}

function getTierColorClass(tier: number): string {
  if (tier === 1) return "text-amber-400";
  if (tier === 2) return "text-slate-300";
  if (tier === 3) return "text-orange-400";
  return "text-foreground";
}

export function PlayoffTierNote({ tier }: PlayoffTierNoteProps) {
  const t = useTranslations("leaderboard");

  if (!tier) {
    return null;
  }

  const tooltip = t("tierNote", { tier });

  return (
    <span
      className={`shrink-0 text-[10px] font-medium tabular-nums leading-none ${getTierColorClass(tier)}`}
      title={tooltip}
      aria-label={tooltip}
    >
      T{tier}
    </span>
  );
}
