"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { LeaderboardOverallEntry } from "@/features/leaderboard/lib/buildAnalytics";
import { LeaderboardRankCell } from "@/features/leaderboard/ui/LeaderboardRankCell";
import { getInitials } from "@/features/matches/lib/voterInfo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface LeaderboardOverallTableProps {
  entries: LeaderboardOverallEntry[];
  canSeePlayerNames: boolean;
}

export function LeaderboardOverallTable({
  entries,
  canSeePlayerNames,
}: LeaderboardOverallTableProps) {
  const t = useTranslations("leaderboard");

  const rankLabels = useMemo(
    () => ({
      1: { emoji: "🥇", label: t("rank1") },
      2: { emoji: "🥈", label: t("rank2") },
      3: { emoji: "🥉", label: t("rank3") },
    }),
    [t],
  );

  if (entries.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-muted-foreground">
        {t("noPlayers")}
      </p>
    );
  }

  if (!canSeePlayerNames) {
    return (
      <>
        <div className="grid grid-cols-[2rem_1fr] items-center gap-x-3 px-3 py-2 text-[11px] font-medium text-muted-foreground">
          <span className="text-center">#</span>
          <span className="text-right">{t("points")}</span>
        </div>

        {entries.map((entry) => (
          <div
            key={entry.user_id}
            className="grid grid-cols-[2rem_1fr] items-center gap-x-3 border-t border-white/[0.08] px-3 py-2.5"
          >
            <LeaderboardRankCell rank={entry.rank} labels={rankLabels} />
            <p className="text-right text-[17px] font-bold leading-none tabular-nums text-foreground">
              {entry.total_points}
            </p>
          </div>
        ))}
      </>
    );
  }

  return (
    <>
      <div className="grid grid-cols-[2rem_minmax(0,1fr)_4rem_3rem] items-center gap-x-3 px-3 py-2 text-[11px] font-medium text-muted-foreground">
        <span className="text-center">#</span>
        <span>{t("player")}</span>
        <span className="text-right">{t("points")}</span>
        <span className="text-right">{t("picks")}</span>
      </div>

      {entries.map((entry) => (
        <div
          key={entry.user_id}
          className="grid grid-cols-[2rem_minmax(0,1fr)_4rem_3rem] items-center gap-x-3 border-t border-white/[0.08] px-3 py-2.5"
        >
          <LeaderboardRankCell rank={entry.rank} labels={rankLabels} />
          <div className="flex min-w-0 items-center gap-2">
            <Avatar size="sm" className="shrink-0">
              {entry.photo_url && (
                <AvatarImage src={entry.photo_url} alt={entry.display_name} />
              )}
              <AvatarFallback className="text-[10px]">
                {getInitials(entry.display_name)}
              </AvatarFallback>
            </Avatar>
            <p className="truncate text-[13px] font-medium leading-tight">
              {entry.display_name}
            </p>
          </div>
          <p className="text-right text-[17px] font-bold leading-none tabular-nums text-foreground">
            {entry.total_points}
          </p>
          <p className="text-right text-[12px] tabular-nums text-muted-foreground">
            {entry.predictions_count}
          </p>
        </div>
      ))}
    </>
  );
}
