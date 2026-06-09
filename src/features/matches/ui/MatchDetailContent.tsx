"use client";

import type { Match } from "@/entities/match/model/types";
import type { BoostMultiplier } from "@/entities/prediction/model/types";
import type { MatchPlayerOption } from "@/features/matches/actions";
import {
  getBoostUsed,
  toPredictionFormInitial,
  type PredictionDetail,
} from "@/features/matches/lib/predictionDetail";
import { MatchVoters } from "@/features/matches/ui/MatchVoters";
import { PredictionForm } from "@/features/predictions/ui/PredictionForm";
import { formatMatchKickoffDate, formatMatchTime } from "@/shared/lib/formatDate";
import { TeamFlag } from "@/shared/ui/TeamFlag";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { MatchVoterInfo } from "@/features/matches/lib/voterInfo";

interface MatchDetailContentProps {
  match: Match;
  voters: MatchVoterInfo;
  prediction?: PredictionDetail;
  predictionMap: Record<string, PredictionDetail>;
  players: MatchPlayerOption[];
  playersLoading?: boolean;
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

export function MatchDetailContent({
  match,
  voters,
  prediction,
  predictionMap,
  players,
  playersLoading = false,
}: MatchDetailContentProps) {
  const locked = new Date(match.kickoff_at) <= new Date();
  const finished =
    match.status === "finished" &&
    match.home_score !== null &&
    match.away_score !== null;
  const boostUsed = getBoostUsed(predictionMap, match.round_key);
  const currentBoost = (prediction?.boost_multiplier ?? 1) as BoostMultiplier;

  return (
    <div className="flex flex-col gap-4 pb-6">
      <Card className="glass corner-squircle h-[252px] border-0 bg-transparent shadow-none ring-0">
        <CardContent className="flex h-full flex-col gap-3 pt-2">
          <p className="line-clamp-1 min-h-4 text-center text-[11px] uppercase tracking-wide text-muted-foreground">
            {formatMatchSubtitle(match)}
          </p>

          <div className="grid grid-cols-[1fr_auto_1fr] grid-rows-[auto_auto] items-center gap-x-3 gap-y-2">
            <div className="col-start-1 row-start-1 flex justify-center">
              <TeamFlag name={match.home_team_name} size={56} />
            </div>

            <div className="col-start-2 row-span-2 flex min-w-20 flex-col items-center justify-center gap-1 self-center">
              <p className="flex min-h-11 items-center justify-center text-4xl font-bold leading-none tabular-nums">
                {finished
                  ? `${match.home_score}–${match.away_score}`
                  : formatMatchTime(match.kickoff_at)}
              </p>
              <p className="text-center text-[11px] text-muted-foreground">
                {formatMatchKickoffDate(match.kickoff_at)}
              </p>
            </div>

            <div className="col-start-3 row-start-1 flex justify-center">
              <TeamFlag name={match.away_team_name} size={56} />
            </div>

            <p className="col-start-1 row-start-2 line-clamp-2 min-h-10 text-center text-sm font-semibold leading-tight">
              {match.home_team_name}
            </p>

            <p className="col-start-3 row-start-2 line-clamp-2 min-h-10 text-center text-sm font-semibold leading-tight">
              {match.away_team_name}
            </p>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <p className="line-clamp-1 min-h-4 text-center text-xs text-muted-foreground">
              {match.venue ?? "\u00a0"}
            </p>

            {finished ? (
              <Badge variant="secondary">
                Final: {match.home_score}–{match.away_score}
              </Badge>
            ) : null}

            <MatchVoters voters={voters} />
          </div>
        </CardContent>
      </Card>

      <Card className="glass corner-squircle border-0 bg-transparent shadow-none ring-0">
        <CardHeader>
          <CardTitle>Your prediction</CardTitle>
        </CardHeader>
        <CardContent>
          {playersLoading ? (
            <p className="text-sm text-muted-foreground">Loading players…</p>
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
              locked={locked}
              boostUsed={boostUsed}
              currentBoost={currentBoost}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
