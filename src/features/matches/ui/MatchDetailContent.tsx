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
    <div className="relative min-h-full overflow-hidden rounded-t-[24px]">
      <MatchTeamBackground
        homeTeamName={match.home_team_name}
        awayTeamName={match.away_team_name}
        teamColors={teamColors}
        animate={isActive}
      />

      <div className="relative flex flex-col px-4 pb-4 pt-2">
        <section className="flex flex-col gap-2 pb-4">
          <p className="line-clamp-1 text-center text-[11px] uppercase tracking-wide text-white/70">
            {formatMatchSubtitle(match)}
          </p>

          <div className="grid grid-cols-[1fr_auto_1fr] grid-rows-[auto_auto] items-center gap-x-3 gap-y-1.5">
            <div className="col-start-1 row-start-1 flex justify-center">
              <TeamFlag name={match.home_team_name} size={44} />
            </div>

            <div className="col-start-2 row-span-2 flex min-w-20 flex-col items-center justify-center gap-0.5 self-center">
              <p className="flex items-center justify-center text-3xl font-bold leading-none tabular-nums text-white">
                {showScore
                  ? `${match.home_score}–${match.away_score}`
                  : formatMatchTime(match.kickoff_at)}
              </p>
              <p className="text-center text-[11px] text-white/70">
                {showScore ? (
                  live ? (
                    <Badge
                      variant="destructive"
                      className="h-5 rounded-md border-0 bg-red-500/20 px-2 text-[10px] font-semibold text-red-300"
                    >
                      LIVE
                    </Badge>
                  ) : (
                    formatMatchKickoffDate(match.kickoff_at)
                  )
                ) : (
                  formatMatchKickoffDate(match.kickoff_at)
                )}
              </p>
            </div>

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

            {finished ? (
              <Badge variant="secondary">
                Final: {match.home_score}–{match.away_score}
              </Badge>
            ) : null}

            <MatchVoters voters={voters} />
          </div>
        </section>

        <section className="flex flex-col gap-3 border-t border-white/10 pt-4">
          <h2 className="font-heading text-base font-medium text-white">
            {locked ? "Predictions" : "Your prediction"}
          </h2>

          {locked ? (
            <MatchPredictionsBoard
              match={match}
              predictions={matchPredictions}
              actualScorers={matchScorers}
              currentUserId={currentUserId}
            />
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
        </section>
      </div>
    </div>
  );
});
