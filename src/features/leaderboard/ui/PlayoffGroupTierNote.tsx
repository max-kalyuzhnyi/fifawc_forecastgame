"use client";

import { useTranslations } from "next-intl";

interface PlayoffGroupTierNoteProps {
  groupRank: number | null | undefined;
  tier: number | null | undefined;
}

function getTierColorClass(tier: number): string {
  if (tier === 1) return "text-amber-400";
  if (tier === 2) return "text-slate-300";
  if (tier === 3) return "text-orange-400";
  return "text-foreground";
}

export function PlayoffGroupTierNote({
  groupRank,
  tier,
}: PlayoffGroupTierNoteProps) {
  const t = useTranslations("leaderboard");

  if (!groupRank && !tier) {
    return null;
  }

  const tooltip =
    groupRank && tier
      ? t("groupTierNote", { rank: groupRank, tier })
      : groupRank
        ? t("groupRankBadge", { rank: groupRank })
        : t("tierNote", { tier: tier! });

  return (
    <span
      className="shrink-0 text-[10px] tabular-nums leading-none"
      title={tooltip}
      aria-label={tooltip}
    >
      {groupRank != null && (
        <span className="text-muted-foreground">#{groupRank}</span>
      )}
      {groupRank != null && tier != null && (
        <span className="text-muted-foreground"> · </span>
      )}
      {tier != null && (
        <span className={getTierColorClass(tier)}>T{tier}</span>
      )}
    </span>
  );
}
