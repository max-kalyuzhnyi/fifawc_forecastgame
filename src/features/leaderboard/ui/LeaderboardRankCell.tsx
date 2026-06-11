interface LeaderboardRankCellProps {
  rank: number;
  labels: Record<number, { emoji: string; label: string }>;
}

export function LeaderboardRankCell({
  rank,
  labels,
}: LeaderboardRankCellProps) {
  const medal = labels[rank];

  if (medal) {
    return (
      <span className="flex size-6 items-center justify-center text-base leading-none">
        <span role="img" aria-label={medal.label}>
          {medal.emoji}
        </span>
      </span>
    );
  }

  return (
    <span className="flex size-6 items-center justify-center text-[12px] tabular-nums text-muted-foreground">
      {rank}
    </span>
  );
}
