import type { MatchVoterInfo } from "@/features/matches/lib/voterInfo";

interface MatchVotersProps {
  voters: MatchVoterInfo;
  compact?: boolean;
}

export function MatchVoters({ voters, compact }: MatchVotersProps) {
  if (voters.count === 0) return null;

  return (
    <span
      className={
        compact ? "text-[10px] text-white/50" : "text-[11px] text-white/50"
      }
    >
      {voters.count} voted
    </span>
  );
}
