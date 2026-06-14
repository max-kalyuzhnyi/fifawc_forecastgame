import type { BoostMultiplier } from "@/entities/prediction/model/types";

export interface PredictionDetail {
  round_key: string;
  home_score: number;
  away_score: number;
  boost_multiplier: number;
  boost_day: string | null;
  scorer_player_id: string | null;
  scorer_name: string | null;
}

export type BoostUsed = { x2: boolean };

export function getBoostUsedForDay(
  predictionMap: Record<string, PredictionDetail>,
  boostDay: string,
  currentMatchId: string,
): BoostUsed {
  const usedOnAnotherMatch = Object.entries(predictionMap).some(
    ([matchId, prediction]) =>
      matchId !== currentMatchId &&
      prediction.boost_multiplier === 2 &&
      prediction.boost_day === boostDay,
  );

  return { x2: usedOnAnotherMatch };
}

export function toPredictionFormInitial(prediction: PredictionDetail) {
  return {
    home_score: prediction.home_score,
    away_score: prediction.away_score,
    scorer_player_id: prediction.scorer_player_id,
    scorer_name: prediction.scorer_name,
    boost_multiplier: prediction.boost_multiplier as BoostMultiplier,
  };
}
