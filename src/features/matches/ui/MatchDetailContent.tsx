"use client";

import { memo } from "react";
import type { Match } from "@/entities/match/model/types";
import type { BoostMultiplier } from "@/entities/prediction/model/types";
import type { MatchPlayerOption } from "@/features/matches/actions";
import {
  getBoostUsed,
  toPredictionFormInitial,
  type BoostUsed,
  type PredictionDetail,
} from "@/features/matches/lib/predictionDetail";
import type { MatchPredictionEntry } from "@/features/matches/lib/predictionsByMatch";
import { MatchPredictionsBoard } from "@/features/matches/ui/MatchPredictionsBoard";
import { MatchTeamBackground } from "@/features/matches/ui/MatchTeamBackground";
import { MatchVoters } from "@/features/matches/ui/MatchVoters";
import { PredictionForm } from "@/features/predictions/ui/PredictionForm";
import { formatMatchKickoffDate, formatMatchTime } from "@/shared/lib/formatDate";
import { formatMatchScore } from "@/shared/lib/formatMatchScore";
import { TeamFlag } from "@/shared/ui/TeamFlag";
import { Badge } from "@/components/ui/badge";
import type { MatchVoterInfo } from "@/features/matches/lib/voterInfo";

interface MatchDetailContentProps {
  match: Match;
  voters: MatchVoterInfo;
  prediction?: PredictionDetail;
  predictionMap?: Record<string, PredictionDetail>;
  boostUsed?: BoostUsed;
  players: MatchPlayerOption[];
  playersLoading?: boolean;
  matchPredictions?: MatchPredictionEntry[];
  matchScorers?: string[];
  currentUserId?: string | null;
  teamColors?: Record<string, string>;
  currentBoost?: BoostMultiplier;
  isActive?: boolean;
}

function MatchDetailCenterFocus({
  prediction,
  locked,
  showScore,
  live,
  homeScore,
  awayScore,
  kickoffAt,
}: {
  prediction: PredictionDetail | undefined;
  locked: boolean;
  showScore: boolean;
  live: boolean;
  homeScore: number;
  awayScore: number;
  kickoffAt: string;
}) {
  return (
    <div className="col-start-2 row-span-2 flex min-w-20 flex-col items-center justify-center gap-1 self-center">
      {prediction ? (
        <p className="text-3xl font-bold leading-none tabular-nums text-white">
          {formatMatchScore(prediction.home_score, prediction.away_score)}
          {prediction.boost_multiplier > 1 && (
            <span className="ml-1 text-base font-semibold text-white/60">
              x{prediction.boost_multiplier}
            </span>
          )}
        </p>
      ) : locked ? (
        <p className="text-lg font-medium text-white/60">Missed</p>
      ) : (
        <p className="text-lg font-medium text-red-300">No pick</p>
      )}

      {showScore && (
        <div className="flex items-center gap-1.5">
          <p className="text-sm font-medium leading-none tabular-nums text-white/70">
            {formatMatchScore(homeScore, awayScore)}
          </p>
          {live && (
            <Badge
              variant="destructive"
              className="h-5 rounded-md border-0 bg-red-500/20 px-2 text-[10px] font-semibold text-red-300"
            >
              LIVE
            </Badge>
          )}
        </div>
      )}

      <p className="text-center text-[11px] text-white/70">
        {formatMatchTime(kickoffAt)}
        <span className="mx-1 text-white/35">·</span>
        {formatMatchKickoffDate(kickoffAt)}
      </p>
    </div>
  );
}

function formatMatchSubtitle(match: Match): string {
  if (match.round_key.startsWith("group_")) {
    return match.match_number != null
      ? `Group Stage · Match ${match.match_number}`
      : "Group Stage";
  }

  if (match.match_number != null) {
    return `${match.round_display} · Match ${match.match_number}`;
  }

  return match.round_display;
}

export const MatchDetailContent = memo(function MatchDetailContent({
  match,
  voters,
  prediction,
  predictionMap,
  boostUsed,
  players,
  playersLoading = false,
  matchPredictions = [],
  matchScorers = [],
  currentUserId,
  teamColors = {},
  currentBoost: currentBoostProp,
  isActive = true,
}: MatchDetailContentProps) {
  const locked = new Date(match.kickoff_at) <= new Date();
  const live =
    match.status === "live" &&
    match.home_score !== null &&
    match.away_score !== null;
  const finished =
    match.status === "finished" &&
    match.home_score !== null &&
    match.away_score !== null;
  const showScore = live || finished;
  const resolvedBoostUsed =
    boostUsed ?? getBoostUsed(predictionMap ?? {}, match.round_key);
  const currentBoost =
    currentBoostProp ?? ((prediction?.boost_multiplier ?? 1) as BoostMultiplier);

  return (
    <div className="match-drawer-card relative flex h-full w-full flex-col overflow-hidden">
      <MatchTeamBackground
        homeTeamName={match.home_team_name}
        awayTeamName={match.away_team_name}
        teamColors={teamColors}
        animate={isActive}
      />

      <div className="relative flex min-h-0 flex-1 flex-col px-4 pb-4 pt-2">
        <section className="flex shrink-0 flex-col gap-2 pb-4">
          <p className="line-clamp-1 text-center text-[11px] uppercase tracking-wide text-white/70">
            {formatMatchSubtitle(match)}
          </p>

          <div className="grid grid-cols-[1fr_auto_1fr] grid-rows-[auto_auto] items-center gap-x-3 gap-y-1.5">
            <div className="col-start-1 row-start-1 flex justify-center">
              <TeamFlag name={match.home_team_name} size={44} />
            </div>

            <MatchDetailCenterFocus
              prediction={prediction}
              locked={locked}
              showScore={showScore}
              live={live}
              homeScore={match.home_score ?? 0}
              awayScore={match.away_score ?? 0}
              kickoffAt={match.kickoff_at}
            />

            <div className="col-start-3 row-start-1 flex justify-center">
              <TeamFlag name={match.away_team_name} size={44} />
            </div>

            <p className="col-start-1 row-start-2 line-clamp-2 text-center text-sm font-semibold leading-tight text-white">
              {match.home_team_name}
            </p>

            <p className="col-start-3 row-start-2 line-clamp-2 text-center text-sm font-semibold leading-tight text-white">
              {match.away_team_name}
            </p>
          </div>

          <div className="flex flex-col items-center gap-1">
            <p className="line-clamp-1 text-center text-xs text-white/65">
              {match.venue ?? "\u00a0"}
            </p>

            <MatchVoters voters={voters} />
          </div>
        </section>

        <section className="flex min-h-0 flex-1 flex-col border-t border-white/10 pt-4">
          <h2 className="mb-3 shrink-0 font-heading text-base font-medium text-white">
            {locked ? "Predictions" : "Your prediction"}
          </h2>

          <div className="flex min-h-0 flex-1 flex-col">
            {locked ? (
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <MatchPredictionsBoard
                  match={match}
                  predictions={matchPredictions}
                  actualScorers={matchScorers}
                  currentUserId={currentUserId}
                />
              </div>
            ) : playersLoading ? (
              <p className="text-sm text-white/70">Loading players…</p>
            ) : (
              <PredictionForm
                matchId={match.id}
                homeTeamName={match.home_team_name}
                awayTeamName={match.away_team_name}
                homeTeamId={match.home_team_id}
                awayTeamId={match.away_team_id}
                players={players}
                initial={
                  prediction ? toPredictionFormInitial(prediction) : undefined
                }
                locked={false}
                boostUsed={resolvedBoostUsed}
                currentBoost={currentBoost}
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
});
