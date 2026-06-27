import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { createClient } from "@supabase/supabase-js";
import { buildLeaderboardAnalytics } from "../src/features/leaderboard/lib/buildAnalytics";
import { getTierFromRank } from "../src/entities/playoff/model/boostBudget";
import { isGroupRoundKey } from "../src/entities/match/model/types";
import type { BoostMultiplier } from "../src/entities/prediction/model/types";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local",
    );
  }

  const supabase = createClient(url, serviceKey);

  const [{ data: matches }, predictions, { data: profiles }, matchEvents, players] =
    await Promise.all([
      supabase
        .from("matches")
        .select("id, round_key, status, home_score, away_score"),
      supabase
        .from("predictions")
        .select(
          "match_id, user_id, home_score, away_score, scorer_name, scorer_player_id, boost_multiplier",
        ),
      supabase.from("profiles").select("id, display_name, photo_url"),
      supabase
        .from("match_events")
        .select("match_id, type, player_name")
        .in("type", ["goal", "penalty"]),
      supabase.from("players").select("id, name"),
    ]);

  const groupMatches = (matches ?? []).filter((match) =>
    isGroupRoundKey(match.round_key),
  );
  const groupMatchIds = new Set(groupMatches.map((match) => match.id));
  const groupPredictions = (predictions ?? []).filter((prediction) =>
    groupMatchIds.has(prediction.match_id),
  );

  const scorersByMatch: Record<string, string[]> = {};
  for (const event of matchEvents ?? []) {
    const list = scorersByMatch[event.match_id] ?? [];
    list.push(event.player_name);
    scorersByMatch[event.match_id] = list;
  }

  const analytics = buildLeaderboardAnalytics({
    matches: groupMatches,
    predictions: groupPredictions.map((prediction) => ({
      ...prediction,
      boost_multiplier: prediction.boost_multiplier as BoostMultiplier,
    })),
    profiles: profiles ?? [],
    scorersByMatch,
  });

  const rows = analytics.overall.map((entry) => ({
    user_id: entry.user_id,
    group_rank: entry.rank,
    tier: getTierFromRank(entry.rank),
    group_points: entry.total_points,
  }));

  if (rows.length === 0) {
    throw new Error("No group-stage leaderboard rows to snapshot");
  }

  const { error } = await supabase.from("playoff_tiers").upsert(rows, {
    onConflict: "user_id",
  });

  if (error) {
    throw error;
  }

  console.log(`Snapshotted ${rows.length} playoff tiers`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
