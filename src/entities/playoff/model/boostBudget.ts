import { isGroupRoundKey } from "@/entities/match/model/types";

export type PlayoffTier = 1 | 2 | 3 | 4;

// Cumulative ladder per spec: each tier inherits lower tiers and adds one more stage.
const TIER_BUDGET: Record<PlayoffTier, Record<string, number>> = {
  1: { round_of_32: 5, round_of_16: 3, quarter_final: 2, semi_final: 1 },
  2: { round_of_32: 5, round_of_16: 3, quarter_final: 2, semi_final: 0 },
  3: { round_of_32: 5, round_of_16: 3, quarter_final: 1, semi_final: 0 },
  4: { round_of_32: 5, round_of_16: 2, quarter_final: 1, semi_final: 0 },
};

export function getTierFromRank(rank: number): PlayoffTier {
  if (rank <= 3) return 1;
  if (rank <= 8) return 2;
  if (rank <= 14) return 3;
  return 4;
}

export function isBoostAllowedStage(roundKey: string): boolean {
  return !isGroupRoundKey(roundKey) && roundKey !== "third_place" && roundKey !== "final";
}

export function getStageBoostBudget(
  tier: PlayoffTier,
  roundKey: string,
): number {
  if (!isBoostAllowedStage(roundKey)) {
    return 0;
  }

  return TIER_BUDGET[tier][roundKey] ?? 0;
}

export function getBoostBudgetMatrix(): Record<
  PlayoffTier,
  Record<string, number>
> {
  const stages = [
    "round_of_32",
    "round_of_16",
    "quarter_final",
    "semi_final",
    "third_place",
    "final",
  ] as const;

  return {
    1: Object.fromEntries(
      stages.map((stage) => [stage, getStageBoostBudget(1, stage)]),
    ),
    2: Object.fromEntries(
      stages.map((stage) => [stage, getStageBoostBudget(2, stage)]),
    ),
    3: Object.fromEntries(
      stages.map((stage) => [stage, getStageBoostBudget(3, stage)]),
    ),
    4: Object.fromEntries(
      stages.map((stage) => [stage, getStageBoostBudget(4, stage)]),
    ),
  };
}
