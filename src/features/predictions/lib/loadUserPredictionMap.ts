import type { SupabaseClient } from "@supabase/supabase-js";
import type { PredictionDetail } from "@/features/matches/lib/predictionDetail";
import type { Database } from "@/shared/types/database";

const PREDICTION_SELECT_WITH_DAY =
  "match_id, round_key, home_score, away_score, boost_multiplier, boost_day, scorer_player_id, scorer_name";

const PREDICTION_SELECT_LEGACY =
  "match_id, round_key, home_score, away_score, boost_multiplier, scorer_player_id, scorer_name";

type PredictionRow = {
  match_id: string;
  round_key: string;
  home_score: number;
  away_score: number;
  boost_multiplier: number;
  boost_day?: string | null;
  scorer_player_id: string | null;
  scorer_name: string | null;
};

function toPredictionMap(rows: PredictionRow[]): Record<string, PredictionDetail> {
  return Object.fromEntries(
    rows.map((row) => [
      row.match_id,
      {
        round_key: row.round_key,
        home_score: row.home_score,
        away_score: row.away_score,
        boost_multiplier: row.boost_multiplier,
        boost_day: row.boost_day ?? null,
        scorer_player_id: row.scorer_player_id,
        scorer_name: row.scorer_name,
      },
    ]),
  );
}

export async function loadUserPredictionMap(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<Record<string, PredictionDetail>> {
  const { data, error } = await supabase
    .from("predictions")
    .select(PREDICTION_SELECT_WITH_DAY)
    .eq("user_id", userId);

  if (!error && data) {
    return toPredictionMap(data);
  }

  const { data: legacyData, error: legacyError } = await supabase
    .from("predictions")
    .select(PREDICTION_SELECT_LEGACY)
    .eq("user_id", userId);

  if (legacyError || !legacyData) {
    console.error("Failed to load user predictions", error ?? legacyError);
    return {};
  }

  return toPredictionMap(legacyData);
}
