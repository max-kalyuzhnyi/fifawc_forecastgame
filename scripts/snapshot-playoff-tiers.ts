import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { createClient } from "@supabase/supabase-js";
import {
  buildGroupStageTiersFromAnalytics,
  buildLeaderboardAnalytics,
} from "../src/features/leaderboard/lib/buildAnalytics";
import { fetchAllRows } from "../src/shared/lib/supabase/fetchAllRows";
import { buildMatchScorers } from "../src/shared/lib/scorers";
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

  const [
    { data: matches },
    predictions,
    { data: profiles },
    matchEvents,
    players,
  ] = await Promise.all([
    supabase
      .from("matches")
      .select("id, round_key, status, home_score, away_score"),
    fetchAllRows((from, to) =>
      supabase
        .from("predictions")
        .select(
          "match_id, user_id, home_score, away_score, scorer_name, scorer_player_id, boost_multiplier",
        )
        .order("id", { ascending: true })
        .range(from, to),
    ),
    supabase.from("profiles").select("id, display_name, photo_url"),
    fetchAllRows((from, to) =>
      supabase
        .from("match_events")
        .select("match_id, type, player_name")
        .in("type", ["goal", "penalty"])
        .order("id", { ascending: true })
        .range(from, to),
    ),
    fetchAllRows((from, to) =>
      supabase
        .from("players")
        .select("id, name")
        .order("id", { ascending: true })
        .range(from, to),
    ),
  ]);

  const { namesByMatch: scorersByMatch, playerIdsByMatch: scorerPlayerIdsByMatch } =
    buildMatchScorers(
      matchEvents.map((event) => ({
        matchId: event.match_id,
        type: event.type,
        playerName: event.player_name,
      })),
      players,
    );

  const analytics = buildLeaderboardAnalytics({
    matches: matches ?? [],
    predictions: predictions.map((prediction) => ({
      ...prediction,
      boost_multiplier: prediction.boost_multiplier as BoostMultiplier,
    })),
    profiles: profiles ?? [],
    scorersByMatch,
    scorerPlayerIdsByMatch,
  });

  const tiers = buildGroupStageTiersFromAnalytics(analytics);
  const rows = Object.entries(tiers).map(([user_id, tierInfo]) => ({
    user_id,
    ...tierInfo,
  }));

  if (rows.length === 0) {
    throw new Error("No group-stage leaderboard rows to snapshot");
  }

  const nameById = Object.fromEntries(
    (profiles ?? []).map((profile) => [profile.id, profile.display_name]),
  );
  const topRows = [...rows]
    .sort((a, b) => a.group_rank - b.group_rank)
    .slice(0, 12)
    .map((row) => ({
      rank: row.group_rank,
      tier: row.tier,
      points: row.group_points,
      name: nameById[row.user_id],
    }));

  const { error } = await supabase.from("playoff_tiers").upsert(rows, {
    onConflict: "user_id",
  });

  if (error) {
    throw error;
  }

  console.log(`Snapshotted ${rows.length} playoff tiers`);
  for (const row of topRows) {
    console.log(
      `#${row.rank} T${row.tier} ${row.points}pts ${row.name ?? row.rank}`,
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
