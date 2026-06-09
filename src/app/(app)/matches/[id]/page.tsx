import Link from "next/link";
import { notFound } from "next/navigation";
import type { Match } from "@/entities/match/model/types";
import type { BoostMultiplier } from "@/entities/prediction/model/types";
import { PredictionForm } from "@/features/predictions/ui/PredictionForm";
import { createClient } from "@/shared/lib/supabase/server";
import { formatKickoff } from "@/shared/lib/formatDate";
import { getCurrentUserId } from "@/shared/lib/auth";

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

  return (
    <div>
      <Link href="/matches" className="mb-4 inline-block text-sm text-emerald-600 hover:underline">
        ← Back to matches
      </Link>

      <h1 className="text-2xl font-bold">
        {typedMatch.home_team_name} vs {typedMatch.away_team_name}
      </h1>
      <p className="mt-1 text-sm text-zinc-500">
        {typedMatch.round_display} · {formatKickoff(typedMatch.kickoff_at)}
        {typedMatch.venue && ` · ${typedMatch.venue}`}
      </p>

      {typedMatch.status === "finished" &&
        typedMatch.home_score !== null &&
        typedMatch.away_score !== null && (
          <p className="mt-4 text-lg font-semibold">
            Final: {typedMatch.home_score}–{typedMatch.away_score}
          </p>
        )}

      <div className="mt-6 max-w-md">
        <h2 className="mb-3 text-lg font-medium">Your prediction</h2>
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
                  boost_multiplier: prediction.boost_multiplier as BoostMultiplier,
                }
              : undefined
          }
          locked={locked}
          boostUsed={boostUsed}
          currentBoost={(prediction?.boost_multiplier ?? 1) as BoostMultiplier}
        />
      </div>
    </div>
  );
}
