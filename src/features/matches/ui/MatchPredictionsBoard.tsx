"use client";

import type { Match } from "@/entities/match/model/types";
import { calculatePredictionPoints } from "@/entities/prediction/lib/calculatePredictionPoints";
import type { MatchPredictionEntry } from "@/features/matches/lib/predictionsByMatch";
import { getInitials } from "@/features/matches/lib/voterInfo";
import { formatMatchScore } from "@/shared/lib/formatMatchScore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MatchPredictionsBoardProps {
  match: Match;
  predictions: MatchPredictionEntry[];
  actualScorers: string[];
  actualScorerPlayerIds?: string[];
  currentUserId?: string | null;
}

function formatPrediction(entry: MatchPredictionEntry): string {
  const boost =
    entry.boost_multiplier > 1 ? ` x${entry.boost_multiplier}` : "";
  const scorer = entry.scorer_name ? ` · ${entry.scorer_name}` : "";
  return `${formatMatchScore(entry.home_score, entry.away_score)}${scorer}${boost}`;
}

export function MatchPredictionsBoard({
  match,
  predictions,
  actualScorers,
  actualScorerPlayerIds = [],
  currentUserId,
}: MatchPredictionsBoardProps) {
  const hasScore =
    match.home_score !== null &&
    match.away_score !== null &&
    (match.status === "live" || match.status === "finished");

  const ranked = [...predictions]
    .map((entry) => {
      const points = hasScore
        ? calculatePredictionPoints({
            predictedHome: entry.home_score,
            predictedAway: entry.away_score,
            actualHome: match.home_score!,
            actualAway: match.away_score!,
            predictedScorer: entry.scorer_name,
            predictedScorerPlayerId: entry.scorer_player_id,
            actualScorers,
            actualScorerPlayerIds,
            boostMultiplier: entry.boost_multiplier,
          }).totalPoints
        : null;

      return { entry, points };
    })
    .sort((a, b) => {
      if (a.points === null && b.points === null) return 0;
      if (a.points === null) return 1;
      if (b.points === null) return -1;
      return b.points - a.points;
    });

  if (ranked.length === 0) {
    return (
      <p className="text-center text-sm text-muted-foreground">
        No predictions yet.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-1">
      {ranked.map(({ entry, points }) => {
        const isCurrentUser = entry.user_id === currentUserId;

        return (
          <li
            key={entry.user_id}
            className={cn(
              "flex items-center gap-2.5 rounded-xl px-2.5 py-1.5",
              isCurrentUser ? "bg-white/[0.06]" : "bg-white/[0.03]",
            )}
          >
            <Avatar className="size-7 shrink-0">
              {entry.photo_url && (
                <AvatarImage src={entry.photo_url} alt={entry.display_name} />
              )}
              <AvatarFallback className="text-[10px]">
                {getInitials(entry.display_name)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-[13px] font-medium">
                  {entry.display_name}
                </p>
                {isCurrentUser && (
                  <Badge
                    variant="secondary"
                    className="h-4 shrink-0 rounded-md px-1.5 text-[10px]"
                  >
                    You
                  </Badge>
                )}
              </div>
              <p className="truncate text-[11px] text-white/45">
                {formatPrediction(entry)}
              </p>
            </div>

            <p className="shrink-0 text-sm font-bold tabular-nums">
              {points !== null ? points : "—"}
            </p>
          </li>
        );
      })}
    </ul>
  );
}
