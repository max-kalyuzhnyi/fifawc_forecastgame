import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
} from "@/components/ui/avatar";
import type { MatchVoterInfo } from "@/features/matches/lib/voterInfo";
import { getInitials } from "@/features/matches/lib/voterInfo";

interface MatchVotersProps {
  voters: MatchVoterInfo;
  compact?: boolean;
}

export function MatchVoters({ voters, compact }: MatchVotersProps) {
  if (voters.count === 0) return null;

  const remaining = voters.count - voters.voters.length;

  return (
    <div className={compact ? "flex items-center gap-1" : "flex items-center gap-2"}>
      <AvatarGroup className={compact ? "*:data-[slot=avatar]:size-5" : undefined}>
        {voters.voters.map((name) => (
          <Avatar key={name} size="sm" className={compact ? "size-5" : undefined}>
            <AvatarFallback
              className={
                compact
                  ? "bg-primary/25 text-[8px] text-primary-foreground"
                  : "bg-primary/25 text-[10px] text-primary-foreground"
              }
            >
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
        ))}
        {remaining > 0 && (
          <AvatarGroupCount
            className={
              compact
                ? "size-5 bg-primary/20 text-[8px] text-primary-foreground"
                : "bg-primary/20 text-[10px] text-primary-foreground"
            }
          >
            +{remaining}
          </AvatarGroupCount>
        )}
      </AvatarGroup>
      <span
        className={
          compact
            ? "text-[10px] text-muted-foreground"
            : "text-[11px] text-muted-foreground"
        }
      >
        {voters.count} voted
      </span>
    </div>
  );
}
