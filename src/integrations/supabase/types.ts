export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          read: boolean
          related_id: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          read?: boolean
          related_id?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          read?: boolean
          related_id?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      organizer_blacklist: {
        Row: {
          created_at: string
          expires_at: string | null
          id: string
          organizer_id: string
          reason: string | null
          team_tag: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          id?: string
          organizer_id: string
          reason?: string | null
          team_tag: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          id?: string
          organizer_id?: string
          reason?: string | null
          team_tag?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          banner_url: string | null
          created_at: string
          discord_contact: string | null
          full_name: string
          id: string
          preferred_games: string[] | null
          role: Database["public"]["Enums"]["user_role"]
          tracker_url: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          banner_url?: string | null
          created_at?: string
          discord_contact?: string | null
          full_name: string
          id: string
          preferred_games?: string[] | null
          role?: Database["public"]["Enums"]["user_role"]
          tracker_url?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          banner_url?: string | null
          created_at?: string
          discord_contact?: string | null
          full_name?: string
          id?: string
          preferred_games?: string[] | null
          role?: Database["public"]["Enums"]["user_role"]
          tracker_url?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      team_badges: {
        Row: {
          badge_count: number
          badge_type: string
          earned_at: string
          id: string
          team_id: string
        }
        Insert: {
          badge_count?: number
          badge_type: string
          earned_at?: string
          id?: string
          team_id: string
        }
        Update: {
          badge_count?: number
          badge_type?: string
          earned_at?: string
          id?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_badges_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_bans: {
        Row: {
          banned_until: string
          created_at: string
          id: string
          reason: string | null
          team_tag: string
        }
        Insert: {
          banned_until: string
          created_at?: string
          id?: string
          reason?: string | null
          team_tag: string
        }
        Update: {
          banned_until?: string
          created_at?: string
          id?: string
          reason?: string | null
          team_tag?: string
        }
        Relationships: []
      }
      team_invites: {
        Row: {
          created_at: string
          external_discord: string | null
          external_game_id: string | null
          external_player_name: string | null
          id: string
          invited_user_id: string | null
          invited_username: string | null
          is_external: boolean
          permission: string
          status: string
          team_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          external_discord?: string | null
          external_game_id?: string | null
          external_player_name?: string | null
          id?: string
          invited_user_id?: string | null
          invited_username?: string | null
          is_external?: boolean
          permission?: string
          status?: string
          team_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          external_discord?: string | null
          external_game_id?: string | null
          external_player_name?: string | null
          id?: string
          invited_user_id?: string | null
          invited_username?: string | null
          is_external?: boolean
          permission?: string
          status?: string
          team_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_invites_invited_user_id_fkey"
            columns: ["invited_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_invites_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          discord: string
          function: Database["public"]["Enums"]["player_function"]
          game_id: string
          id: string
          player_name: string
          team_id: string
        }
        Insert: {
          created_at?: string
          discord: string
          function: Database["public"]["Enums"]["player_function"]
          game_id: string
          id?: string
          player_name: string
          team_id: string
        }
        Update: {
          created_at?: string
          discord?: string
          function?: Database["public"]["Enums"]["player_function"]
          game_id?: string
          id?: string
          player_name?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_reports: {
        Row: {
          created_at: string
          id: string
          organizer_id: string
          reason: string
          team_id: string
          team_tag: string
          training_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          organizer_id: string
          reason: string
          team_id: string
          team_tag: string
          training_id: string
        }
        Update: {
          created_at?: string
          id?: string
          organizer_id?: string
          reason?: string
          team_id?: string
          team_tag?: string
          training_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_reports_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "team_reports_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          banner_url: string | null
          bio: string | null
          created_at: string
          description: string | null
          discord_url: string | null
          id: string
          instagram_url: string | null
          is_external: boolean
          is_recruiting: boolean | null
          is_verified: boolean | null
          logo_url: string | null
          name: string
          owner_id: string
          platform: string | null
          primary_color: string | null
          rating: number | null
          region: string | null
          secondary_color: string | null
          tag: string
          twitter_url: string | null
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          description?: string | null
          discord_url?: string | null
          id?: string
          instagram_url?: string | null
          is_external?: boolean
          is_recruiting?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          name: string
          owner_id: string
          platform?: string | null
          primary_color?: string | null
          rating?: number | null
          region?: string | null
          secondary_color?: string | null
          tag: string
          twitter_url?: string | null
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          bio?: string | null
          created_at?: string
          description?: string | null
          discord_url?: string | null
          id?: string
          instagram_url?: string | null
          is_external?: boolean
          is_recruiting?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          name?: string
          owner_id?: string
          platform?: string | null
          primary_color?: string | null
          rating?: number | null
          region?: string | null
          secondary_color?: string | null
          tag?: string
          twitter_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_event_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          team_id: string
          team_name: string
          team_tag: string
          training_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          team_id: string
          team_name: string
          team_tag: string
          training_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          team_id?: string
          team_name?: string
          team_tag?: string
          training_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_event_logs_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_event_logs_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      training_match_scores: {
        Row: {
          created_at: string
          id: string
          kill_points: number
          kills: number
          match_id: string
          position: number
          position_points: number
          team_id: string
          total_points: number
        }
        Insert: {
          created_at?: string
          id?: string
          kill_points?: number
          kills?: number
          match_id: string
          position: number
          position_points?: number
          team_id: string
          total_points?: number
        }
        Update: {
          created_at?: string
          id?: string
          kill_points?: number
          kills?: number
          match_id?: string
          position?: number
          position_points?: number
          team_id?: string
          total_points?: number
        }
        Relationships: [
          {
            foreignKeyName: "training_match_scores_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "training_matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_match_scores_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      training_matches: {
        Row: {
          created_at: string
          id: string
          map_name: string | null
          match_number: number
          match_time: string | null
          name: string
          round_id: string
          status: string
          training_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          map_name?: string | null
          match_number?: number
          match_time?: string | null
          name: string
          round_id: string
          status?: string
          training_id: string
        }
        Update: {
          created_at?: string
          id?: string
          map_name?: string | null
          match_number?: number
          match_time?: string | null
          name?: string
          round_id?: string
          status?: string
          training_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_matches_round_id_fkey"
            columns: ["round_id"]
            isOneToOne: false
            referencedRelation: "training_rounds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_matches_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      training_messages: {
        Row: {
          created_at: string
          id: string
          message: string
          sender_id: string
          training_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          sender_id: string
          training_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          sender_id?: string
          training_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_messages_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      training_registrations: {
        Row: {
          id: string
          registered_at: string
          slot_number: number | null
          team_id: string
          training_id: string
        }
        Insert: {
          id?: string
          registered_at?: string
          slot_number?: number | null
          team_id: string
          training_id: string
        }
        Update: {
          id?: string
          registered_at?: string
          slot_number?: number | null
          team_id?: string
          training_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_registrations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_registrations_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      training_rounds: {
        Row: {
          created_at: string
          id: string
          name: string
          round_number: number
          training_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          round_number?: number
          training_id: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          round_number?: number
          training_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_rounds_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      training_templates: {
        Row: {
          created_at: string
          discord_link: string | null
          game: Database["public"]["Enums"]["game_type"]
          id: string
          important_info: string | null
          max_slots: number
          mode: Database["public"]["Enums"]["mode_type"]
          name: string
          organizer_id: string
          platform: Database["public"]["Enums"]["platform_type"]
          points_per_kill: number
          points_per_position: Json
          points_per_position_text: string | null
          primary_color: string | null
          prize: string | null
          rounds: number
          rules: string | null
          secondary_color: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          discord_link?: string | null
          game?: Database["public"]["Enums"]["game_type"]
          id?: string
          important_info?: string | null
          max_slots?: number
          mode: Database["public"]["Enums"]["mode_type"]
          name: string
          organizer_id: string
          platform: Database["public"]["Enums"]["platform_type"]
          points_per_kill?: number
          points_per_position?: Json
          points_per_position_text?: string | null
          primary_color?: string | null
          prize?: string | null
          rounds?: number
          rules?: string | null
          secondary_color?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          discord_link?: string | null
          game?: Database["public"]["Enums"]["game_type"]
          id?: string
          important_info?: string | null
          max_slots?: number
          mode?: Database["public"]["Enums"]["mode_type"]
          name?: string
          organizer_id?: string
          platform?: Database["public"]["Enums"]["platform_type"]
          points_per_kill?: number
          points_per_position?: Json
          points_per_position_text?: string | null
          primary_color?: string | null
          prize?: string | null
          rounds?: number
          rules?: string | null
          secondary_color?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_templates_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trainings: {
        Row: {
          banner_url: string | null
          created_at: string
          datetime: string
          discord_link: string | null
          game: Database["public"]["Enums"]["game_type"]
          id: string
          important_info: string | null
          invited_tags: string[] | null
          is_live: boolean
          is_private: boolean
          live_link: string | null
          max_slots: number
          mode: Database["public"]["Enums"]["mode_type"]
          name: string
          organizer_id: string
          platform: Database["public"]["Enums"]["platform_type"]
          points_per_kill: number
          points_per_position: Json
          points_per_position_text: string | null
          primary_color: string | null
          prize: string | null
          rounds: number
          rules: string | null
          secondary_color: string | null
          status: string | null
          table_image_url: string | null
          updated_at: string
        }
        Insert: {
          banner_url?: string | null
          created_at?: string
          datetime: string
          discord_link?: string | null
          game?: Database["public"]["Enums"]["game_type"]
          id?: string
          important_info?: string | null
          invited_tags?: string[] | null
          is_live?: boolean
          is_private?: boolean
          live_link?: string | null
          max_slots?: number
          mode: Database["public"]["Enums"]["mode_type"]
          name: string
          organizer_id: string
          platform: Database["public"]["Enums"]["platform_type"]
          points_per_kill?: number
          points_per_position?: Json
          points_per_position_text?: string | null
          primary_color?: string | null
          prize?: string | null
          rounds?: number
          rules?: string | null
          secondary_color?: string | null
          status?: string | null
          table_image_url?: string | null
          updated_at?: string
        }
        Update: {
          banner_url?: string | null
          created_at?: string
          datetime?: string
          discord_link?: string | null
          game?: Database["public"]["Enums"]["game_type"]
          id?: string
          important_info?: string | null
          invited_tags?: string[] | null
          is_live?: boolean
          is_private?: boolean
          live_link?: string | null
          max_slots?: number
          mode?: Database["public"]["Enums"]["mode_type"]
          name?: string
          organizer_id?: string
          platform?: Database["public"]["Enums"]["platform_type"]
          points_per_kill?: number
          points_per_position?: Json
          points_per_position_text?: string | null
          primary_color?: string | null
          prize?: string | null
          rounds?: number
          rules?: string | null
          secondary_color?: string | null
          status?: string | null
          table_image_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainings_organizer_id_fkey"
            columns: ["organizer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      count_active_blacklists_from_different_organizers: {
        Args: { _team_tag: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
      notify_blacklist_expired: { Args: never; Returns: undefined }
    }
    Enums: {
      game_type:
        | "free_fire"
        | "blood_strike"
        | "farlight_84"
        | "prime_rush"
        | "battlefield_6"
      mode_type: "Solo" | "Duo" | "Squad"
      platform_type: "PC" | "Mobile" | "Misto" | "console"
      player_function: "RUSH" | "SUPORTE" | "CAPITÃO"
      user_role: "player" | "organizer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      game_type: [
        "free_fire",
        "blood_strike",
        "farlight_84",
        "prime_rush",
        "battlefield_6",
      ],
      mode_type: ["Solo", "Duo", "Squad"],
      platform_type: ["PC", "Mobile", "Misto", "console"],
      player_function: ["RUSH", "SUPORTE", "CAPITÃO"],
      user_role: ["player", "organizer"],
    },
  },
} as const
