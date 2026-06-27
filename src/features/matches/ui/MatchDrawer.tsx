"use client";

import { useCallback, useEffect, useState } from "react";
import type {
  GroupStanding,
  LiveScoreByTeam,
} from "@/entities/match/lib/standings";
import type { Match, MatchEvent } from "@/entities/match/model/types";
import type { MatchPlayerOption } from "@/features/matches/actions";
import type { PreviousMatchesByTeam } from "@/features/matches/lib/previousMatches";
import type { MatchPredictionEntry } from "@/features/matches/lib/predictionsByMatch";
import type { PredictionDetail } from "@/features/matches/lib/predictionDetail";
import type { MatchVoterInfo } from "@/features/matches/lib/voterInfo";
import type { PlayerPhotosByTeam } from "@/features/matches/lib/playerPhotos";
import { MatchDetailContent } from "@/features/matches/ui/MatchDetailContent";
import { isMatchUpsetWatch } from "@/shared/lib/onside/upsets";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";

interface MatchDrawerProps {
  matches: Match[];
  matchId: string | null;
  voterMap: Record<string, MatchVoterInfo>;
  predictionMap: Record<string, PredictionDetail>;
  playersByMatch: Record<string, MatchPlayerOption[]>;
  predictionsByMatch: Record<string, MatchPredictionEntry[]>;
  scorersByMatch: Record<string, string[]>;
  scorerPlayerIdsByMatch: Record<string, string[]>;
  eventsByMatch: Record<string, MatchEvent[]>;
  currentUserId: string | null;
  teamColors: Record<string, string>;
  playerPhotosByTeam: PlayerPhotosByTeam;
  groupStandingsByName: Record<string, GroupStanding>;
  liveScoreByTeam: LiveScoreByTeam;
  previousMatchesByMatch: Record<string, PreviousMatchesByTeam>;
  upsetMatchIds?: string[];
  userTier?: number;
  onClose: () => void;
  onPredictionSaved?: (matchId: string, prediction: PredictionDetail) => void;
}

export function MatchDrawer({
  matches,
  matchId,
  voterMap,
  predictionMap,
  playersByMatch,
  predictionsByMatch,
  scorersByMatch,
  scorerPlayerIdsByMatch,
  eventsByMatch,
  currentUserId,
  teamColors,
  playerPhotosByTeam,
  groupStandingsByName,
  liveScoreByTeam,
  previousMatchesByMatch,
  upsetMatchIds = [],
  userTier = 4,
  onClose,
  onPredictionSaved,
}: MatchDrawerProps) {
  const open = Boolean(matchId);
  const [contentMounted, setContentMounted] = useState(() => Boolean(matchId));

  const activeMatch = matchId
    ? matches.find((match) => match.id === matchId)
    : undefined;

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- lazy-mount drawer content after first open
      setContentMounted(true);
    }
  }, [open]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (!nextOpen) {
        onClose();
      }
    },
    [onClose],
  );

  if (matches.length === 0) {
    return null;
  }

  return (
    <Drawer
      open={open}
      onOpenChange={handleOpenChange}
      modal
      shouldScaleBackground={false}
    >
      <DrawerContent
        fullscreen
        hideHandle
        overlayClassName="z-[60] bg-black/80"
        className="z-[60] border-0 bg-transparent p-0 shadow-none before:hidden"
      >
        <DrawerTitle className="sr-only">Match details</DrawerTitle>

        {contentMounted && activeMatch ? (
          <div className="flex h-full min-h-0 flex-col">
            <MatchDetailContent
              match={activeMatch}
              voters={voterMap[activeMatch.id] ?? { count: 0 }}
              prediction={predictionMap[activeMatch.id]}
              predictionMap={predictionMap}
              players={playersByMatch[activeMatch.id] ?? []}
              matchPredictions={predictionsByMatch[activeMatch.id] ?? []}
              matchScorers={scorersByMatch[activeMatch.id] ?? []}
              matchScorerPlayerIds={scorerPlayerIdsByMatch[activeMatch.id] ?? []}
              matchEvents={eventsByMatch[activeMatch.id] ?? []}
              currentUserId={currentUserId}
              teamColors={teamColors}
              playerPhotosByTeam={playerPhotosByTeam}
              groupStanding={
                activeMatch.group_name
                  ? groupStandingsByName[activeMatch.group_name]
                  : undefined
              }
              liveScoreByTeam={liveScoreByTeam}
              previousMatches={previousMatchesByMatch[activeMatch.id]}
              isUpsetWatch={isMatchUpsetWatch(activeMatch, upsetMatchIds)}
              userTier={userTier}
              onPredictionSaved={
                onPredictionSaved
                  ? (prediction) => onPredictionSaved(activeMatch.id, prediction)
                  : undefined
              }
            />
          </div>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
