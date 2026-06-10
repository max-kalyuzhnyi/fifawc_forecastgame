import type { BoostMultiplier } from "@/entities/prediction/model/types";

export interface PredictionDetail {
  round_key: string;
  home_score: number;
  away_score: number;
  boost_multiplier: number;
  scorer_player_id: string | null;
  scorer_name: string | null;
}

export type BoostUsed = { x2: boolean; x3: boolean };

export function getBoostUsed(
  predictionMap: Record<string, PredictionDetail>,
  roundKey: string,
): BoostUsed {
  const roundPredictions = Object.values(predictionMap).filter(
    (prediction) => prediction.round_key === roundKey,
  );

  return {
    x2: roundPredictions.some((prediction) => prediction.boost_multiplier === 2),
    x3: roundPredictions.some((prediction) => prediction.boost_multiplier === 3),
  };
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
