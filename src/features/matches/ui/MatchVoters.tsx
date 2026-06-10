import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar";
import type { MatchVoterInfo } from "@/features/matches/lib/voterInfo";
import { getVoterLetter } from "@/features/matches/lib/voterInfo";
import { cn } from "@/lib/utils";

interface MatchVotersProps {
  voters: MatchVoterInfo;
  compact?: boolean;
}

function voterAvatarFallbackClass(compact: boolean | undefined) {
  return compact
    ? "bg-[#5c6daf] text-[9px] font-semibold text-white"
    : "bg-[#5c6daf] text-[11px] font-semibold text-white";
}

export function MatchVoters({ voters, compact }: MatchVotersProps) {
  if (voters.count === 0) return null;

  const remaining = voters.count - voters.voters.length;

  return (
    <div className={compact ? "flex items-center gap-1" : "flex items-center gap-2"}>
      <AvatarGroup
        className={cn(
          "*:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-[#181e44]",
          compact && "*:data-[slot=avatar]:size-5",
        )}
      >
        {voters.voters.map((voter) => (
          <Avatar
            key={voter.name}
            size="sm"
            className={cn(compact && "size-5 after:hidden")}
          >
            {voter.photoUrl && (
              <AvatarImage src={voter.photoUrl} alt={voter.name} />
            )}
            <AvatarFallback className={voterAvatarFallbackClass(compact)}>
              {getVoterLetter(voter.name)}
            </AvatarFallback>
          </Avatar>
        ))}
        {remaining > 0 && (
          <AvatarGroupCount
            className={cn(
              "bg-[#4a578f] font-semibold text-white ring-[#181e44]",
              compact ? "size-5 text-[8px]" : "text-[10px]",
            )}
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
