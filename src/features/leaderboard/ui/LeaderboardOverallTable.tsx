"use client";

import { useMemo } from "react";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { LeaderboardOverallEntry } from "@/features/leaderboard/lib/buildAnalytics";
import { buildLeaderboardDisplayItems } from "@/features/leaderboard/lib/filterLeaderboardEntries";
import { LeaderboardRankCell } from "@/features/leaderboard/ui/LeaderboardRankCell";
import { getInitials } from "@/features/matches/lib/voterInfo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface LeaderboardOverallTableProps {
  entries: LeaderboardOverallEntry[];
  currentUserId?: string | null;
  canSeePlayerNames: boolean;
  renderNameAccessory?: (entry: LeaderboardOverallEntry) => ReactNode;
}

function LeaderboardPointsCell({
  totalPoints,
  livePointsDelta,
}: {
  totalPoints: number;
  livePointsDelta: number;
}) {
  const projectedTotal = totalPoints + livePointsDelta;

  return (
    <div className="flex items-center justify-end gap-1.5">
      {livePointsDelta > 0 && (
        <span className="rounded-md bg-emerald-500/20 px-1 py-0.5 text-[10px] font-semibold leading-none tabular-nums text-emerald-300">
          +{livePointsDelta}
        </span>
      )}
      <span className="text-[17px] font-bold leading-none tabular-nums text-foreground">
        {projectedTotal}
      </span>
    </div>
  );
}

function LeaderboardEllipsisRow({ label }: { label: string }) {
  return (
    <div
      className="border-t border-white/[0.08] px-3 py-2 text-center text-[13px] font-medium text-muted-foreground"
      aria-hidden
    >
      {label}
    </div>
  );
}

export function LeaderboardOverallTable({
  entries,
  currentUserId,
  canSeePlayerNames,
  renderNameAccessory,
}: LeaderboardOverallTableProps) {
  const t = useTranslations("leaderboard");
  const tCommon = useTranslations("common");

  const displayItems = useMemo(
    () => buildLeaderboardDisplayItems(entries, { currentUserId }),
    [entries, currentUserId],
  );

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

        {displayItems.map((item, index) => {
          if (item.type === "ellipsis") {
            return (
              <LeaderboardEllipsisRow
                key={`ellipsis-${index}`}
                label={t("rankGap")}
              />
            );
          }

          const { entry } = item;
          return (
            <div
              key={entry.user_id}
              className="grid grid-cols-[2rem_1fr] items-center gap-x-3 border-t border-white/[0.08] px-3 py-2.5"
            >
              <LeaderboardRankCell rank={entry.rank} labels={rankLabels} />
              <LeaderboardPointsCell
                totalPoints={entry.total_points}
                livePointsDelta={entry.live_points_delta}
              />
            </div>
          );
        })}
      </>
    );
  }

  return (
    <>
      <div className="grid grid-cols-[2rem_minmax(0,1fr)_5rem] items-center gap-x-3 px-3 py-2 text-[11px] font-medium text-muted-foreground">
        <span className="text-center">#</span>
        <span>{t("player")}</span>
        <span className="text-right">{t("points")}</span>
      </div>

      {displayItems.map((item, index) => {
        if (item.type === "ellipsis") {
          return (
            <LeaderboardEllipsisRow
              key={`ellipsis-${index}`}
              label={t("rankGap")}
            />
          );
        }

        const { entry } = item;
        const isCurrentUser = entry.user_id === currentUserId;

        return (
          <div
            key={entry.user_id}
            className="grid grid-cols-[2rem_minmax(0,1fr)_5rem] items-center gap-x-3 border-t border-white/[0.08] px-3 py-2.5"
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
              <div className="flex min-w-0 items-center gap-2">
                <p className="truncate text-[13px] font-medium leading-tight">
                  {entry.display_name}
                </p>
                {renderNameAccessory?.(entry)}
                {isCurrentUser && (
                  <Badge
                    variant="secondary"
                    className="h-4 shrink-0 rounded-md px-1.5 text-[10px]"
                  >
                    {tCommon("you")}
                  </Badge>
                )}
              </div>
            </div>
            <LeaderboardPointsCell
              totalPoints={entry.total_points}
              livePointsDelta={entry.live_points_delta}
            />
          </div>
        );
      })}
    </>
  );
}
