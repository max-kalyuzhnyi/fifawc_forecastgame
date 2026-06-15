export type Locale = "en" | "ru" | "pl";
export type MatchEventType =
  | "goal"
  | "penalty"
  | "own_goal"
  | "yellow_card"
  | "red_card"
  | "yellow_red_card"
  | "substitution";
export type MatchEventSide = "home" | "away";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          telegram_id: number | null;
          photo_url: string | null;
          timezone: string | null;
          notify_goals: boolean;
          locale: Locale;
          locale_custom: boolean;
          display_name_custom: boolean;
          avatar_custom: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          telegram_id?: number | null;
          photo_url?: string | null;
          timezone?: string | null;
          notify_goals?: boolean;
          locale?: Locale;
          locale_custom?: boolean;
          display_name_custom?: boolean;
          avatar_custom?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      admin_users: {
        Row: { user_id: string; created_at: string };
        Insert: { user_id: string; created_at?: string };
        Update: Partial<Database["public"]["Tables"]["admin_users"]["Insert"]>;
        Relationships: [];
      };
      teams: {
        Row: {
          id: string;
          name: string;
          primary_color: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          primary_color?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["teams"]["Insert"]>;
        Relationships: [];
      };
      matches: {
        Row: {
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
          status: string;
          home_score: number | null;
          away_score: number | null;
          fd_match_id: number | null;
          minute: number | null;
          injury_time: number | null;
          fd_status: string | null;
          fd_last_updated: string | null;
          home_lineup: Record<string, unknown> | null;
          away_lineup: Record<string, unknown> | null;
          highlights_youtube_id: string | null;
          highlights_source: string | null;
          pick_reminder_sent_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<
          Database["public"]["Tables"]["matches"]["Row"],
          "id" | "created_at" | "updated_at"
        > & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["matches"]["Insert"]>;
        Relationships: [];
      };
      match_events: {
        Row: {
          id: string;
          match_id: string;
          event_key: string;
          type: MatchEventType;
          minute: number;
          injury_time: number | null;
          side: MatchEventSide;
          player_name: string;
          secondary_player_name: string | null;
          score_home: number | null;
          score_away: number | null;
          payload: Record<string, unknown> | null;
          notified_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          event_key: string;
          type: MatchEventType;
          minute: number;
          injury_time?: number | null;
          side: MatchEventSide;
          player_name: string;
          secondary_player_name?: string | null;
          score_home?: number | null;
          score_away?: number | null;
          payload?: Record<string, unknown> | null;
          notified_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["match_events"]["Insert"]>;
        Relationships: [];
      };
      players: {
        Row: {
          id: string;
          team_id: string;
          name: string;
          position: "GK" | "DF" | "MF" | "FW" | null;
          shirt_number: number | null;
          photo_url: string | null;
          wiki_title: string | null;
          api_football_id: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          team_id: string;
          name: string;
          position?: "GK" | "DF" | "MF" | "FW" | null;
          shirt_number?: number | null;
          photo_url?: string | null;
          wiki_title?: string | null;
          api_football_id?: number | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["players"]["Insert"]>;
        Relationships: [];
      };
      predictions: {
        Row: {
          id: string;
          user_id: string;
          match_id: string;
          round_key: string;
          home_score: number;
          away_score: number;
          scorer_player_id: string | null;
          scorer_name: string | null;
          boost_multiplier: number;
          boost_day: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          match_id: string;
          round_key: string;
          home_score: number;
          away_score: number;
          scorer_player_id?: string | null;
          scorer_name?: string | null;
          boost_multiplier?: number;
          boost_day?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["predictions"]["Insert"]>;
        Relationships: [];
      };
      match_scorers: {
        Row: {
          id: string;
          match_id: string;
          player_id: string | null;
          scorer_name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          match_id: string;
          player_id?: string | null;
          scorer_name: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["match_scorers"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      leaderboard_base: {
        Row: {
          user_id: string;
          display_name: string;
          predictions_count: number;
        };
        Relationships: [];
      };
    };
    Functions: {
      is_admin: { Args: Record<string, never>; Returns: boolean };
    };
  };
}
