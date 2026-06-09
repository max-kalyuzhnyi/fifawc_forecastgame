import { Suspense } from "react";
import type { Match } from "@/entities/match/model/types";
import {
  buildPlayersByMatch,
  getMatchTeamIds,
} from "@/features/matches/lib/playersByMatch";
import { buildVoterMap } from "@/features/matches/lib/voterInfo";
import { MatchesView } from "@/features/matches/ui/MatchesView";
import { createClient } from "@/shared/lib/supabase/server";
import { getCurrentUserId } from "@/shared/lib/auth";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

export default async function MatchesPage() {
  const supabase = await createClient();
  const userId = await getCurrentUserId();

  const { data: matches } = await supabase
    .from("matches")
    .select("*")
    .order("kickoff_at", { ascending: true });

  const teamIds = getMatchTeamIds((matches ?? []) as Match[]);

  const [
    { data: predictions },
    { data: allPredictions },
    { data: profiles },
    { data: players },
  ] = await Promise.all([
    userId
      ? supabase
          .from("predictions")
          .select(
            "match_id, round_key, home_score, away_score, boost_multiplier, scorer_player_id, scorer_name",
          )
          .eq("user_id", userId)
      : Promise.resolve({ data: [] }),
    supabase.from("predictions").select("match_id, user_id"),
    supabase.from("profiles").select("id, display_name"),
    teamIds.length > 0
      ? supabase
          .from("players")
          .select("id, name, team_id")
          .in("team_id", teamIds)
          .order("name")
      : Promise.resolve({ data: [] }),
  ]);

  const predictionMap = Object.fromEntries(
    (predictions ?? []).map((p) => [
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

  const voterMap = Object.fromEntries(
    buildVoterMap(allPredictions ?? [], profiles ?? []),
  );

  const playersByMatch = buildPlayersByMatch(
    (matches ?? []) as Match[],
    players ?? [],
  );

  if (!matches || matches.length === 0) {
    return (
      <Empty className="glass corner-squircle mt-4 rounded-3xl border-0">
        <EmptyHeader>
          <EmptyTitle>No matches loaded yet</EmptyTitle>
          <EmptyDescription>
            An admin should run{" "}
            <code className="rounded-md bg-muted px-1.5 py-0.5 text-xs">
              npm run import:schedule
            </code>
            .
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <Suspense>
      <MatchesView
        matches={matches as Match[]}
        voterMap={voterMap}
        predictionMap={predictionMap}
        playersByMatch={playersByMatch}
      />
    </Suspense>
  );
}
