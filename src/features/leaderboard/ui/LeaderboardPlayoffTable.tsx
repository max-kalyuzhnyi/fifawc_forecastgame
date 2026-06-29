"use client";

import { useMemo } from "react";
import type { LeaderboardOverallEntry } from "@/features/leaderboard/lib/buildAnalytics";
import { LeaderboardOverallTable } from "@/features/leaderboard/ui/LeaderboardOverallTable";
import { PlayoffGroupTierNote } from "@/features/leaderboard/ui/PlayoffGroupTierNote";

interface LeaderboardPlayoffTableProps {
  entries: LeaderboardOverallEntry[];
  currentUserId?: string | null;
  canSeePlayerNames: boolean;
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
        <PlayoffGroupTierNote
          groupRank={entry.group_rank}
          tier={entry.tier}
        />
      )}
    />
  );
}
