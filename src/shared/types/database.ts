export type Locale = "en" | "ru" | "pl";
export type CardRarity = "common" | "rare" | "legendary";
export type CardPackReason =
  | "welcome"
  | "daily_picks"
  | "exact_score"
  | "goalscorer"
  | "scored"
  | "boost_scorer"
  | "exchange_3"
  | "exchange_5";
export type CardPackStatus = "unopened" | "opened";
export type CardGiftRequestStatus = "open" | "fulfilled" | "cancelled";
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
      player_photo_sources: {
        Row: {
          id: string;
          player_id: string;
          card_id: string | null;
          source_provider: string;
          file_title: string;
          source_url: string;
          thumb_url: string | null;
          license_url: string | null;
          author_credit: string | null;
          width: number | null;
          height: number | null;
          score: number;
          reason_tags: string[];
          status: "pending" | "accepted" | "rejected";
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          player_id: string;
          card_id?: string | null;
          source_provider: string;
          file_title: string;
          source_url: string;
          thumb_url?: string | null;
          license_url?: string | null;
          author_credit?: string | null;
          width?: number | null;
          height?: number | null;
          score?: number;
          reason_tags?: string[];
          status?: "pending" | "accepted" | "rejected";
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<
          Database["public"]["Tables"]["player_photo_sources"]["Insert"]
        >;
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
      cards: {
        Row: {
          id: string;
          player_id: string | null;
          team_id: string | null;
          is_legend: boolean;
          display_name: string;
          image_url: string | null;
          rarity: CardRarity;
          sort_order: number;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          player_id?: string | null;
          team_id?: string | null;
          is_legend?: boolean;
          display_name: string;
          image_url?: string | null;
          rarity?: CardRarity;
          sort_order?: number;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["cards"]["Insert"]>;
        Relationships: [];
      };
      user_cards: {
        Row: {
          user_id: string;
          card_id: string;
          count: number;
          first_obtained_at: string;
          last_obtained_at: string;
        };
        Insert: {
          user_id: string;
          card_id: string;
          count?: number;
          first_obtained_at?: string;
          last_obtained_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["user_cards"]["Insert"]>;
        Relationships: [];
      };
      card_packs: {
        Row: {
          id: string;
          user_id: string;
          reason: CardPackReason;
          size: number;
          status: CardPackStatus;
          source_day: string | null;
          source_match_id: string | null;
          created_at: string;
          opened_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          reason: CardPackReason;
          size: number;
          status?: CardPackStatus;
          source_day?: string | null;
          source_match_id?: string | null;
          created_at?: string;
          opened_at?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["card_packs"]["Insert"]>;
        Relationships: [];
      };
      card_gift_requests: {
        Row: {
          id: string;
          requester_user_id: string;
          card_id: string;
          status: CardGiftRequestStatus;
          fulfilled_by: string | null;
          created_at: string;
          fulfilled_at: string | null;
        };
        Insert: {
          id?: string;
          requester_user_id: string;
          card_id: string;
          status?: CardGiftRequestStatus;
          fulfilled_by?: string | null;
          created_at?: string;
          fulfilled_at?: string | null;
        };
        Update: Partial<
          Database["public"]["Tables"]["card_gift_requests"]["Insert"]
        >;
        Relationships: [];
      };
      card_gifts: {
        Row: {
          id: string;
          from_user_id: string;
          to_user_id: string;
          card_id: string;
          request_id: string | null;
          seen_by_recipient: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          from_user_id: string;
          to_user_id: string;
          card_id: string;
          request_id?: string | null;
          seen_by_recipient?: boolean;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["card_gifts"]["Insert"]>;
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
