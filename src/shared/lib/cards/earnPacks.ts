import { calculatePredictionPoints } from "@/entities/prediction/lib/calculatePredictionPoints";
import { getDateGroupKey } from "@/shared/lib/formatDate";
import { PACK_SIZES } from "@/shared/lib/cards/config";
import { buildScorersByMatch } from "@/shared/lib/scorers";
import type { CardPackReason } from "@/shared/types/database";

export { buildScorersByMatch };

export interface EarnMatch {
  id: string;
  kickoffAt: string;
  status: string;
  homeScore: number | null;
  awayScore: number | null;
}

export interface EarnPrediction {
  matchId: string;
  homeScore: number;
  awayScore: number;
  scorerName: string | null;
  scorerPlayerId?: string | null;
  boostMultiplier: number;
}

export type EarnablePackReason = Exclude<
  CardPackReason,
  "exchange_3" | "exchange_5" | "scored" | "boost_scorer"
>;

export interface EarnPackGrant {
  reason: EarnablePackReason;
  size: number;
  sourceDay?: string;
  sourceMatchId?: string;
}

export function evaluateDailyPackGrants(input: {
  matches: EarnMatch[];
  predictions: EarnPrediction[];
  scorersByMatch: Record<string, string[]>;
  scorerPlayerIdsByMatch?: Record<string, string[]>;
  eligibleFrom?: string;
  todayKey?: string;
}): EarnPackGrant[] {
  const todayKey = input.todayKey ?? getDateGroupKey(new Date().toISOString());
  const eligibleFromMs = input.eligibleFrom
    ? new Date(input.eligibleFrom).getTime()
    : null;
  const matchesByDay = new Map<string, EarnMatch[]>();

  for (const match of input.matches) {
    if (eligibleFromMs != null && new Date(match.kickoffAt).getTime() < eligibleFromMs) {
      continue;
    }

    const day = getDateGroupKey(match.kickoffAt);
    const list = matchesByDay.get(day) ?? [];
    list.push(match);
    matchesByDay.set(day, list);
  }

  const predictionsByMatch = new Map(
    input.predictions.map((prediction) => [prediction.matchId, prediction]),
  );

  const grants: EarnPackGrant[] = [];

  for (const [day, dayMatches] of matchesByDay) {
    if (day > todayKey) {
      continue;
    }

    if (dayMatches.length === 0) {
      continue;
    }

    const allPicked = dayMatches.every((match) =>
      predictionsByMatch.has(match.id),
    );

    if (allPicked) {
      grants.push({
        reason: "daily_picks",
        sourceDay: day,
        size: PACK_SIZES.daily_picks,
      });
    }

    for (const match of dayMatches) {
      if (match.status !== "finished") {
        continue;
      }

      if (match.homeScore == null || match.awayScore == null) {
        continue;
      }

      const prediction = predictionsByMatch.get(match.id);
      if (!prediction) {
        continue;
      }

      const breakdown = calculatePredictionPoints({
        predictedHome: prediction.homeScore,
        predictedAway: prediction.awayScore,
        actualHome: match.homeScore,
        actualAway: match.awayScore,
        predictedScorer: prediction.scorerName,
        predictedScorerPlayerId: prediction.scorerPlayerId,
        actualScorers: input.scorersByMatch[match.id] ?? [],
        actualScorerPlayerIds: input.scorerPlayerIdsByMatch?.[match.id] ?? [],
        boostMultiplier: prediction.boostMultiplier as 1 | 2,
      });

      // Exact score and goalscorer are separate per-match packs; both can apply.
      if (breakdown.basePoints === 3) {
        grants.push({
          reason: "exact_score",
          sourceMatchId: match.id,
          size: PACK_SIZES.exact_score,
        });
      }

      if (breakdown.scorerBonus > 0) {
        grants.push({
          reason: "goalscorer",
          sourceMatchId: match.id,
          size: PACK_SIZES.goalscorer,
        });
      }
    }
  }

  return grants;
}

export function selectSyncPackGrants(
  grants: EarnPackGrant[],
  options: { hasUnopenedDaily: boolean },
): EarnPackGrant[] {
  const nonDailyGrants = grants.filter((grant) => grant.reason !== "daily_picks");
  if (options.hasUnopenedDaily) {
    return nonDailyGrants;
  }

  const nextDailyGrant = grants
    .filter((grant) => grant.reason === "daily_picks")
    .sort((a, b) => (a.sourceDay ?? "").localeCompare(b.sourceDay ?? ""))[0];

  return nextDailyGrant ? [...nonDailyGrants, nextDailyGrant] : nonDailyGrants;
}

export function countTotalDuplicates(
  inventory: { cardId?: string; card_id?: string; count: number }[],
): number {
  return inventory.reduce(
    (sum, entry) => sum + Math.max(0, entry.count - 1),
    0,
  );
}
