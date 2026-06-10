import { calculatePredictionPoints } from "@/entities/prediction/lib/calculatePredictionPoints";
import type { BoostMultiplier } from "@/entities/prediction/model/types";

export interface LeaderboardPrediction {
  user_id: string;
  display_name: string;
  home_score: number;
  away_score: number;
  scorer_name: string | null;
  boost_multiplier: BoostMultiplier;
}

export interface LeaderboardMatch {
  home_score: number | null;
  away_score: number | null;
  scorers: string[];
}

export interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  photo_url: string | null;
  total_points: number;
  predictions_scored: number;
}

export function calculateLeaderboard(
  profiles: { id: string; display_name: string; photo_url?: string | null }[],
  predictions: (LeaderboardPrediction & { match_id: string })[],
  matches: Record<string, LeaderboardMatch>,
): LeaderboardEntry[] {
  const totals = new Map<string, LeaderboardEntry>();

  for (const profile of profiles) {
    totals.set(profile.id, {
      user_id: profile.id,
      display_name: profile.display_name,
      photo_url: profile.photo_url ?? null,
      total_points: 0,
      predictions_scored: 0,
    });
  }

  for (const pred of predictions) {
    const match = matches[pred.match_id];
    if (!match || match.home_score === null || match.away_score === null) {
      continue;
    }

    const entry = totals.get(pred.user_id);
    if (!entry) continue;

    const result = calculatePredictionPoints({
      predictedHome: pred.home_score,
      predictedAway: pred.away_score,
      actualHome: match.home_score,
      actualAway: match.away_score,
      predictedScorer: pred.scorer_name,
      actualScorers: match.scorers,
      boostMultiplier: pred.boost_multiplier,
    });

    entry.total_points += result.totalPoints;
    entry.predictions_scored += 1;
  }

  return Array.from(totals.values()).sort(
    (a, b) => b.total_points - a.total_points || a.display_name.localeCompare(b.display_name),
  );
}
