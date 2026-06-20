export const LEADERBOARD_TOP_N = 25;

export type LeaderboardDisplayItem<T> =
  | { type: "entry"; entry: T }
  | { type: "ellipsis" };

/** Top-N rows plus an ellipsis and the current user when they sit below the cutoff. */
export function buildLeaderboardDisplayItems<
  T extends { user_id: string; rank: number },
>(
  entries: T[],
  options: {
    topN?: number;
    currentUserId?: string | null;
  } = {},
): LeaderboardDisplayItem<T>[] {
  const topN = options.topN ?? LEADERBOARD_TOP_N;
  const currentUserId = options.currentUserId;

  if (entries.length <= topN) {
    return entries.map((entry) => ({ type: "entry", entry }));
  }

  const result: LeaderboardDisplayItem<T>[] = entries
    .slice(0, topN)
    .map((entry) => ({ type: "entry", entry }));

  if (!currentUserId) {
    return result;
  }

  const currentUserEntry = entries.find((entry) => entry.user_id === currentUserId);
  if (!currentUserEntry || currentUserEntry.rank <= topN) {
    return result;
  }

  result.push({ type: "ellipsis" });
  result.push({ type: "entry", entry: currentUserEntry });
  return result;
}
