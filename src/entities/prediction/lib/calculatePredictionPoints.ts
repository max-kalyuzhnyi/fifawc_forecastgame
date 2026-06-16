import type { BoostMultiplier } from "../model/types";
import { normalizeScorerName } from "./normalizeScorerName";

export interface ScoreInput {
  predictedHome: number;
  predictedAway: number;
  actualHome: number;
  actualAway: number;
  predictedScorer: string | null;
  predictedScorerPlayerId?: string | null;
  actualScorers: string[];
  actualScorerPlayerIds?: string[];
  boostMultiplier: BoostMultiplier;
}

export interface ScoreBreakdown {
  basePoints: number;
  scorerBonus: number;
  boostMultiplier: BoostMultiplier;
  totalPoints: number;
}

function getResult(home: number, away: number): "home" | "away" | "draw" {
  if (home > away) return "home";
  if (away > home) return "away";
  return "draw";
}

// 3 exact, 2 goal diff, 1 result; +2 scorer; then boost multiplier
export function calculatePredictionPoints(input: ScoreInput): ScoreBreakdown {
  const { predictedHome, predictedAway, actualHome, actualAway } = input;

  let basePoints = 0;
  if (predictedHome === actualHome && predictedAway === actualAway) {
    basePoints = 3;
  } else if (
    predictedHome - predictedAway === actualHome - actualAway
  ) {
    basePoints = 2;
  } else if (
    getResult(predictedHome, predictedAway) ===
    getResult(actualHome, actualAway)
  ) {
    basePoints = 1;
  }

  let scorerBonus = 0;
  if (input.predictedScorerPlayerId && input.actualScorerPlayerIds?.length) {
    if (input.actualScorerPlayerIds.includes(input.predictedScorerPlayerId)) {
      scorerBonus = 2;
    }
  } else if (input.predictedScorer) {
    const normalized = normalizeScorerName(input.predictedScorer);
    const matched = input.actualScorers.some(
      (s) => normalizeScorerName(s) === normalized,
    );
    if (matched) scorerBonus = 2;
  }

  const subtotal = basePoints + scorerBonus;
  const totalPoints = subtotal * input.boostMultiplier;

  return {
    basePoints,
    scorerBonus,
    boostMultiplier: input.boostMultiplier,
    totalPoints,
  };
}
