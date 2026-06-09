export type MatchStatus = "scheduled" | "live" | "finished";

export interface Match {
  id: string;
  external_key: string;
  round_key: string;
  round_display: string;
  group_name: string | null;
  match_number: number | null;
  kickoff_at: string;
  home_team_id: string | null;
  away_team_id: string | null;
  home_team_name: string;
  away_team_name: string;
  venue: string | null;
  status: MatchStatus;
  home_score: number | null;
  away_score: number | null;
}

export const ROUND_LABELS: Record<string, string> = {
  group_1: "Group Stage — Round 1",
  group_2: "Group Stage — Round 2",
  group_3: "Group Stage — Round 3",
  round_of_32: "Round of 32",
  round_of_16: "Round of 16",
  quarter_final: "Quarter-finals",
  semi_final: "Semi-finals",
  third_place: "Third Place",
  final: "Final",
};
