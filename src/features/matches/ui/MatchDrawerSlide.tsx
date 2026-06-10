"use client";

import { memo } from "react";
import type { Match } from "@/entities/match/model/types";
import type { BoostMultiplier } from "@/entities/prediction/model/types";
import type { MatchPlayerOption } from "@/features/matches/actions";
import type { BoostUsed } from "@/features/matches/lib/predictionDetail";
import type { PredictionDetail } from "@/features/matches/lib/predictionDetail";
import type { MatchPredictionEntry } from "@/features/matches/lib/predictionsByMatch";
import type { MatchVoterInfo } from "@/features/matches/lib/voterInfo";
import { MatchDetailContent } from "@/features/matches/ui/MatchDetailContent";
import { cn } from "@/lib/utils";

interface MatchDrawerSlideProps {
  match: Match;
  voters: MatchVoterInfo;
  prediction?: PredictionDetail;
  boostUsed: BoostUsed;
  players: MatchPlayerOption[];
  matchPredictions: MatchPredictionEntry[];
  matchScorers: string[];
  currentUserId: string | null;
  teamColors: Record<string, string>;
  isActive: boolean;
  isMounted: boolean;
  distanceFromActive: number;
}

export const MatchDrawerSlide = memo(function MatchDrawerSlide({
  match,
  voters,
  prediction,
  boostUsed,
  players,
  matchPredictions,
  matchScorers,
  currentUserId,
  teamColors,
  isActive,
  isMounted,
  distanceFromActive,
}: MatchDrawerSlideProps) {
  const currentBoost = (prediction?.boost_multiplier ?? 1) as BoostMultiplier;
  const isNeighbor = distanceFromActive === 1;

  return (
    <div
      className={cn(
        "h-full min-h-0 overflow-y-auto overscroll-contain px-0 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]",
        !isActive && "pointer-events-none",
        isNeighbor && "scale-[0.98] opacity-80",
      )}
      style={
        distanceFromActive > 1 ? { contentVisibility: "hidden" } : undefined
      }
      aria-hidden={!isActive}
    >
      {isMounted ? (
        <MatchDetailContent
          match={match}
          voters={voters}
          prediction={prediction}
          boostUsed={boostUsed}
          players={players}
          matchPredictions={matchPredictions}
          matchScorers={matchScorers}
          currentUserId={currentUserId}
          teamColors={teamColors}
          currentBoost={currentBoost}
          isActive={isActive}
        />
      ) : null}
    </div>
  );
});
