import Link from "next/link";
import { notFound } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import {
  buildGroupStandings,
  buildLiveScoreByTeam,
} from "@/entities/match/lib/standings";
import type { Match, MatchEvent } from "@/entities/match/model/types";
import {
  buildPredictionsByMatch,
  buildScorersByMatch,
} from "@/features/matches/lib/predictionsByMatch";
import { MatchDetailContent } from "@/features/matches/ui/MatchDetailContent";
import { buildVoterMap } from "@/features/matches/lib/voterInfo";
import { buildPlayersByMatch } from "@/features/matches/lib/playersByMatch";
import { buildTeamColorsMap } from "@/features/matches/lib/teamColors";
import { createClient } from "@/shared/lib/supabase/server";
import { getUpsets } from "@/shared/lib/onside/client";
import {
  buildUpsetMatchIds,
  isMatchUpsetWatch,
} from "@/shared/lib/onside/upsets";
import { getCurrentUserId } from "@/shared/lib/auth";
import { Button } from "@/components/ui/button";

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

  const [
    { data: userPredictions },
    { data: allPredictions },
    { data: profiles },
    { data: players },
    { data: matchScorers },
    { data: teams },
    { data: matchEvents },
    { data: liveMatches },
  ] = await Promise.all([
    userId
      ? supabase
          .from("predictions")
          .select(
            "match_id, round_key, home_score, away_score, boost_multiplier, scorer_player_id, scorer_name",
          )
          .eq("user_id", userId)
      : Promise.resolve({ data: [] }),
    supabase
      .from("predictions")
      .select(
        "match_id, user_id, home_score, away_score, scorer_name, boost_multiplier, round_key",
      )
      .eq("match_id", id),
    supabase.from("profiles").select("id, display_name, photo_url"),
    supabase
      .from("players")
      .select("id, name, team_id, position, shirt_number")
      .in(
        "team_id",
        [typedMatch.home_team_id, typedMatch.away_team_id].filter(
          Boolean,
        ) as string[],
      ),
    supabase.from("match_scorers").select("match_id, scorer_name").eq("match_id", id),
    supabase.from("teams").select("name, primary_color"),
    supabase
      .from("match_events")
      .select("*")
      .eq("match_id", id)
      .order("minute", { ascending: true }),
    supabase
      .from("matches")
      .select("home_team_name, away_team_name, home_score, away_score, status")
      .eq("status", "live"),
  ]);

  const groupStanding = buildGroupStandings([typedMatch]).find(
    (group) => group.groupName === typedMatch.group_name,
  );

  const predictionMap = Object.fromEntries(
    (userPredictions ?? []).map((p) => [
      p.match_id,
      {
        round_key: p.round_key,
        home_score: p.home_score,
        away_score: p.away_score,
        boost_multiplier: p.boost_multiplier,
        scorer_player_id: p.scorer_player_id,
        scorer_name: p.scorer_name,
      },
    ]),
  );

  const voterMap = buildVoterMap(allPredictions ?? [], profiles ?? []);
  const voters = voterMap.get(id) ?? { count: 0, voters: [] };
  const playersByMatch = buildPlayersByMatch([typedMatch], players ?? []);
  const predictionsByMatch = buildPredictionsByMatch(
    allPredictions ?? [],
    profiles ?? [],
  );
  const scorersByMatch = buildScorersByMatch(matchScorers ?? []);
  const teamColors = buildTeamColorsMap(teams ?? []);
  const liveScoreByTeam = buildLiveScoreByTeam((liveMatches ?? []) as Match[]);

  const upsetsResponse = await getUpsets();
  const upsetMatchIds = upsetsResponse
    ? [...buildUpsetMatchIds([typedMatch], upsetsResponse.upsets)]
    : [];

  return (
    <div className="flex flex-col gap-4">
      <Button variant="ghost" size="icon-sm" className="w-fit" asChild>
        <Link href="/matches" aria-label="Back to matches">
          <HugeiconsIcon icon={ArrowLeft01Icon} />
        </Link>
      </Button>

      <MatchDetailContent
        match={typedMatch}
        voters={voters}
        prediction={predictionMap[id]}
        predictionMap={predictionMap}
        players={playersByMatch[id] ?? []}
        matchPredictions={predictionsByMatch[id] ?? []}
        matchScorers={scorersByMatch[id] ?? []}
        matchEvents={(matchEvents ?? []) as MatchEvent[]}
        groupStanding={groupStanding}
        liveScoreByTeam={liveScoreByTeam}
        currentUserId={userId}
        teamColors={teamColors}
        expanded
        isUpsetWatch={isMatchUpsetWatch(typedMatch, upsetMatchIds)}
      />
    </div>
  );
}
