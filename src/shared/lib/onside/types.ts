export interface OnsideAttribution {
  source: string;
  url: string;
  model_version?: string;
  api_version?: string;
}

export interface OnsideTeamSummary {
  code: string;
  name: string;
  rank: number;
  confederation: string;
  group?: string;
}

export interface OnsideMatchPrediction {
  home: OnsideTeamSummary;
  away: OnsideTeamSummary;
  probability: { home: number; draw: number; away: number };
  favourite: string;
  underdog: string;
  upset_watch: boolean;
  confidence: string;
  deep_link?: string;
  attribution?: OnsideAttribution;
}

export interface OnsidePlPlayer {
  name: string;
  club: string;
}

export interface OnsideTeamInfo {
  team: OnsideTeamSummary & { color?: string };
  group_context?: {
    letter: string;
    teams: OnsideTeamSummary[];
  };
  group_fixtures?: Array<{
    id: string;
    matchday: number;
    kickoff_utc: string;
    venue_city: string;
    opponent_code: string;
    opponent_name: string;
    is_home: boolean;
    probability_win: number;
    probability_draw: number;
    probability_loss: number;
    deep_link: string;
  }>;
  pl_stars?: {
    count: number;
    players: OnsidePlPlayer[];
  };
  heuristic_avg_match_win_probability?: number;
  deep_link?: string;
  attribution?: OnsideAttribution;
}

export interface OnsideUpset {
  fixture_id: string;
  group: string;
  matchday: number;
  kickoff_utc: string;
  venue_city: string;
  home: { code: string; name: string; rank: number };
  away: { code: string; name: string; rank: number };
  favourite: { code: string; name: string; confidence: string };
  underdog: { code: string; name: string };
  probability: { home: number; draw: number; away: number };
  upset_combined_pct: number;
  deep_link: string;
}

export interface OnsideUpsetsResponse {
  count: number;
  threshold_pct: number;
  upsets: OnsideUpset[];
}

export interface TeamCompare {
  home: OnsideTeamInfo;
  away: OnsideTeamInfo;
  prediction: OnsideMatchPrediction;
}
