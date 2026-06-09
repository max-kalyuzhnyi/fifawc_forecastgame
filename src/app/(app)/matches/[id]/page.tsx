import Link from "next/link";
import { notFound } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import type { Match } from "@/entities/match/model/types";
import type { BoostMultiplier } from "@/entities/prediction/model/types";
import { buildVoterMap } from "@/features/matches/lib/voterInfo";
import { MatchVoters } from "@/features/matches/ui/MatchVoters";
import { PredictionForm } from "@/features/predictions/ui/PredictionForm";
import { createClient } from "@/shared/lib/supabase/server";
import { formatMatchKickoffDate, formatMatchTime } from "@/shared/lib/formatDate";
import { getCurrentUserId } from "@/shared/lib/auth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TeamFlag } from "@/shared/ui/TeamFlag";

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const userId = await getCurrentUserId();

  const { data: match } = await supabase
    .from("matches")
    .select("*")
    .eq("id", id)
    .single();

  if (!match) notFound();

  const typedMatch = match as Match;
  const locked = new Date(typedMatch.kickoff_at) <= new Date();

  const { data: prediction } = userId
    ? await supabase
        .from("predictions")
        .select("*")
        .eq("user_id", userId)
        .eq("match_id", id)
        .maybeSingle()
    : { data: null };

  const { data: roundPredictions } = userId
    ? await supabase
        .from("predictions")
        .select("boost_multiplier, match_id")
        .eq("user_id", userId)
        .eq("round_key", typedMatch.round_key)
    : { data: [] };

  const { data: matchPredictions } = await supabase
    .from("predictions")
    .select("match_id, user_id")
    .eq("match_id", id);

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, display_name");

  const voterInfo =
    buildVoterMap(matchPredictions ?? [], profiles ?? []).get(id) ?? {
      count: 0,
      voters: [],
    };

  const boostUsed = {
    x2: (roundPredictions ?? []).some((p) => p.boost_multiplier === 2),
    x3: (roundPredictions ?? []).some((p) => p.boost_multiplier === 3),
  };

  const teamIds = [typedMatch.home_team_id, typedMatch.away_team_id].filter(
    Boolean,
  ) as string[];

  const { data: players } =
    teamIds.length > 0
      ? await supabase
          .from("players")
          .select("id, name, team_id")
          .in("team_id", teamIds)
          .order("name")
      : { data: [] };

  const finished =
    typedMatch.status === "finished" &&
    typedMatch.home_score !== null &&
    typedMatch.away_score !== null;

  return (
    <div className="flex flex-col gap-4">
      <Button variant="ghost" size="icon-sm" className="w-fit" asChild>
        <Link href="/matches" aria-label="Back to matches">
          <HugeiconsIcon icon={ArrowLeft01Icon} />
        </Link>
      </Button>

      <Card className="glass corner-squircle border-0 bg-transparent shadow-none ring-0">
        <CardContent className="flex flex-col gap-4 pt-5">
          <p className="text-center text-[11px] uppercase tracking-wide text-muted-foreground">
            {typedMatch.round_display}
            {typedMatch.match_number != null &&
              ` · Match ${typedMatch.match_number}`}
          </p>

          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
            <div className="flex flex-col items-center gap-2">
              <TeamFlag name={typedMatch.home_team_name} size={56} />
              <p className="text-center text-sm font-semibold leading-tight">
                {typedMatch.home_team_name}
              </p>
            </div>

            <div className="flex min-w-20 flex-col items-center gap-1">
              {finished ? (
                <p className="text-3xl font-bold tabular-nums">
                  {typedMatch.home_score}–{typedMatch.away_score}
                </p>
              ) : (
                <p className="text-4xl font-bold tabular-nums">
                  {formatMatchTime(typedMatch.kickoff_at)}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                {formatMatchKickoffDate(typedMatch.kickoff_at)}
              </p>
            </div>

            <div className="flex flex-col items-center gap-2">
              <TeamFlag name={typedMatch.away_team_name} size={56} />
              <p className="text-center text-sm font-semibold leading-tight">
                {typedMatch.away_team_name}
              </p>
            </div>
          </div>

          {typedMatch.venue && (
            <p className="text-center text-xs text-muted-foreground">
              {typedMatch.venue}
            </p>
          )}

          {finished && (
            <div className="flex justify-center">
              <Badge variant="secondary">
                Final: {typedMatch.home_score}–{typedMatch.away_score}
              </Badge>
            </div>
          )}

          <div className="flex justify-center">
            <MatchVoters voters={voterInfo} />
          </div>
        </CardContent>
      </Card>

      <Card className="glass corner-squircle border-0 bg-transparent shadow-none ring-0">
        <CardHeader>
          <CardTitle>Your prediction</CardTitle>
        </CardHeader>
        <CardContent>
          <PredictionForm
            matchId={typedMatch.id}
            homeTeamName={typedMatch.home_team_name}
            awayTeamName={typedMatch.away_team_name}
            homeTeamId={typedMatch.home_team_id}
            awayTeamId={typedMatch.away_team_id}
            players={players ?? []}
            initial={
              prediction
                ? {
                    home_score: prediction.home_score,
                    away_score: prediction.away_score,
                    scorer_player_id: prediction.scorer_player_id,
                    scorer_name: prediction.scorer_name,
                    boost_multiplier:
                      prediction.boost_multiplier as BoostMultiplier,
                  }
                : undefined
            }
            locked={locked}
            boostUsed={boostUsed}
            currentBoost={(prediction?.boost_multiplier ?? 1) as BoostMultiplier}
          />
        </CardContent>
      </Card>
    </div>
  );
}
