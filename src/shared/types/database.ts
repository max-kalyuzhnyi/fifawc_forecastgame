export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          telegram_id: number | null;
          photo_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          telegram_id?: number | null;
          photo_url?: string | null;
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
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["matches"]["Row"], "id" | "created_at" | "updated_at"> & {
          id?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["matches"]["Insert"]>;
        Relationships: [];
      };
      players: {
        Row: { id: string; team_id: string; name: string; created_at: string };
        Insert: { id?: string; team_id: string; name: string; created_at?: string };
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
