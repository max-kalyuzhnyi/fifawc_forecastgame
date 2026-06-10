import type { BoostMultiplier } from "@/entities/prediction/model/types";

export interface MatchPredictionEntry {
  user_id: string;
  display_name: string;
  photo_url: string | null;
  home_score: number;
  away_score: number;
  scorer_name: string | null;
  boost_multiplier: BoostMultiplier;
}

export function buildPredictionsByMatch(
  predictions: {
    match_id: string;
    user_id: string;
    home_score: number;
    away_score: number;
    scorer_name: string | null;
    boost_multiplier: number;
  }[],
  profiles: { id: string; display_name: string; photo_url?: string | null }[],
): Record<string, MatchPredictionEntry[]> {
  const profileMap = new Map(
    profiles.map((p) => [
      p.id,
      { name: p.display_name, photoUrl: p.photo_url ?? null },
    ]),
  );
  const result: Record<string, MatchPredictionEntry[]> = {};

  for (const prediction of predictions) {
    const profile = profileMap.get(prediction.user_id);
    const entry: MatchPredictionEntry = {
      user_id: prediction.user_id,
      display_name: profile?.name ?? "Unknown player",
      photo_url: profile?.photoUrl ?? null,
      home_score: prediction.home_score,
      away_score: prediction.away_score,
      scorer_name: prediction.scorer_name,
      boost_multiplier: prediction.boost_multiplier as BoostMultiplier,
    };

    if (!result[prediction.match_id]) {
      result[prediction.match_id] = [];
    }
    result[prediction.match_id].push(entry);
  }

  return result;
}

export function buildScorersByMatch(
  scorers: { match_id: string; scorer_name: string }[],
): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const scorer of scorers) {
    if (!result[scorer.match_id]) {
      result[scorer.match_id] = [];
    }
    result[scorer.match_id].push(scorer.scorer_name);
  }

  return result;
}
