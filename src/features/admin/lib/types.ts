import type { Locale } from "@/shared/types/database";

export interface AdminProfile {
  id: string;
  display_name: string;
  photo_url: string | null;
  telegram_id: number | null;
  locale: Locale;
  timezone: string | null;
}

export interface AdminMatch {
  id: string;
  home_team_name: string;
  away_team_name: string;
  kickoff_at: string;
  home_score: number | null;
  away_score: number | null;
  status: string;
  highlights_youtube_id: string | null;
  highlights_source: string | null;
  round_display: string;
  group_name: string | null;
}

export interface AdminPrediction {
  id: string;
  user_id: string;
  match_id: string;
  home_score: number;
  away_score: number;
  scorer_player_id: string | null;
  scorer_name: string | null;
  boost_multiplier: number;
  round_key: string;
}

export interface AdminTeam {
  id: string;
  name: string;
  primary_color: string | null;
}

export interface AdminPlayer {
  id: string;
  team_id: string;
  name: string;
  position: string | null;
  shirt_number: number | null;
  photo_url: string | null;
}

export interface UserPickRow {
  matchId: string;
  homeTeamName: string;
  awayTeamName: string;
  kickoffAt: string;
  status: string;
  homeScore: number;
  awayScore: number;
  scorerName: string | null;
  boostMultiplier: number;
}

export interface UserWithPicks {
  profile: AdminProfile;
  isAdmin: boolean;
  picks: UserPickRow[];
}

export interface PickerUser {
  profile: AdminProfile;
}

export interface NextMatchPickers {
  match: AdminMatch;
  withPick: PickerUser[];
  withoutPick: PickerUser[];
}
