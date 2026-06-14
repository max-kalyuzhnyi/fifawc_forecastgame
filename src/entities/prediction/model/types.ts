export type BoostMultiplier = 1 | 2;

export interface Prediction {
  id: string;
  user_id: string;
  match_id: string;
  round_key: string;
  home_score: number;
  away_score: number;
  scorer_player_id: string | null;
  scorer_name: string | null;
  boost_multiplier: BoostMultiplier;
}

export interface MatchResult {
  home_score: number;
  away_score: number;
}

export interface ScorerEntry {
  scorer_name: string;
}
