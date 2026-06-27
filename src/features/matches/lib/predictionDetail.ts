import type { BoostMultiplier } from "@/entities/prediction/model/types";
import {
  getStageBoostBudget,
  isBoostAllowedStage,
  type PlayoffTier,
} from "@/entities/playoff/model/boostBudget";

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

export interface StageBoostBudget {
  used: number;
  budget: number;
  remaining: number;
}

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

export function countBoostsUsedInStage(
  predictionMap: Record<string, PredictionDetail>,
  roundKey: string,
  currentMatchId: string,
): number {
  return Object.entries(predictionMap).filter(
    ([matchId, prediction]) =>
      matchId !== currentMatchId &&
      prediction.round_key === roundKey &&
      prediction.boost_multiplier === 2,
  ).length;
}

export function getStageBoostBudgetStatus(
  predictionMap: Record<string, PredictionDetail>,
  roundKey: string,
  tier: PlayoffTier,
  currentMatchId: string,
): StageBoostBudget {
  const budget = getStageBoostBudget(tier, roundKey);
  const used = countBoostsUsedInStage(predictionMap, roundKey, currentMatchId);
  return {
    used,
    budget,
    remaining: Math.max(0, budget - used),
  };
}

export function isStageBoostVisible(
  roundKey: string,
  stageBoostBudget?: StageBoostBudget,
  currentBoost: BoostMultiplier = 1,
): boolean {
  if (!isBoostAllowedStage(roundKey)) {
    return false;
  }

  if (!stageBoostBudget) {
    return true;
  }

  return stageBoostBudget.remaining > 0 || currentBoost === 2;
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
