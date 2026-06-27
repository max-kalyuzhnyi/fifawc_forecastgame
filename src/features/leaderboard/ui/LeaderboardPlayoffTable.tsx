"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";
import type { LeaderboardOverallEntry } from "@/features/leaderboard/lib/buildAnalytics";
import { LeaderboardOverallTable } from "@/features/leaderboard/ui/LeaderboardOverallTable";
import { Badge } from "@/components/ui/badge";

interface LeaderboardPlayoffTableProps {
  entries: LeaderboardOverallEntry[];
  currentUserId?: string | null;
  canSeePlayerNames: boolean;
}

function GroupRankBadge({ groupRank }: { groupRank: number | null | undefined }) {
  const t = useTranslations("leaderboard");

  if (!groupRank) {
    return null;
  }

  if (groupRank === 1) {
    return (
      <span className="text-sm leading-none" title={t("rank1")} aria-label={t("rank1")}>
        🥇
      </span>
    );
  }

  if (groupRank === 2) {
    return (
      <span className="text-sm leading-none" title={t("rank2")} aria-label={t("rank2")}>
        🥈
      </span>
    );
  }

  if (groupRank === 3) {
    return (
      <span className="text-sm leading-none" title={t("rank3")} aria-label={t("rank3")}>
        🥉
      </span>
    );
  }

  return (
    <Badge
      variant="secondary"
      className="h-4 shrink-0 rounded-md px-1.5 text-[10px] tabular-nums"
      title={t("groupRankBadge", { rank: groupRank })}
    >
      #{groupRank}
    </Badge>
  );
}

export function LeaderboardPlayoffTable({
  entries,
  currentUserId,
  canSeePlayerNames,
}: LeaderboardPlayoffTableProps) {
  const decoratedEntries = useMemo(
    () =>
      entries.map((entry) => ({
        ...entry,
        display_name: entry.display_name,
      })),
    [entries],
  );

  return (
    <LeaderboardOverallTable
      entries={decoratedEntries}
      currentUserId={currentUserId}
      canSeePlayerNames={canSeePlayerNames}
      renderNameAccessory={(entry) => (
        <GroupRankBadge groupRank={entry.group_rank} />
      )}
    />
  );
}
