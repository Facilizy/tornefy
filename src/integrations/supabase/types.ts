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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          audience: string
          code: string
          created_at: string
          description: string | null
          id: string
          metric: string
          name: string
          target_value: number
        }
        Insert: {
          audience: string
          code: string
          created_at?: string
          description?: string | null
          id?: string
          metric: string
          name: string
          target_value?: number
        }
        Update: {
          audience?: string
          code?: string
          created_at?: string
          description?: string | null
          id?: string
          metric?: string
          name?: string
          target_value?: number
        }
        Relationships: []
      }
      admin_audit_logs: {
        Row: {
          action: string
          actor_id: string
          after: Json | null
          before: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          method: string
          path: string
          request: Json | null
          response_count: number | null
        }
        Insert: {
          action: string
          actor_id: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          method: string
          path: string
          request?: Json | null
          response_count?: number | null
        }
        Update: {
          action?: string
          actor_id?: string
          after?: Json | null
          before?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          method?: string
          path?: string
          request?: Json | null
          response_count?: number | null
        }
        Relationships: []
      }
      bug_reports: {
        Row: {
          created_at: string
          description: string
          id: string
          meta: Json | null
          page_path: string
          title: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          description: string
          id?: string
          meta?: Json | null
          page_path: string
          title: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          meta?: Json | null
          page_path?: string
          title?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      educational_popups: {
        Row: {
          active: boolean
          audience: string
          created_at: string
          cta_label: string
          description: string | null
          ends_at: string | null
          id: string
          kind: string
          starts_at: string | null
          svg_markup: string | null
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          audience?: string
          created_at?: string
          cta_label?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          kind?: string
          starts_at?: string | null
          svg_markup?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          audience?: string
          created_at?: string
          cta_label?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          kind?: string
          starts_at?: string | null
          svg_markup?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string | null
          id: string | null
          message: string | null
          read: boolean | null
          related_id: string | null
          title: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          message?: string | null
          read?: boolean | null
          related_id?: string | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          message?: string | null
          read?: boolean | null
          related_id?: string | null
          title?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      oauth_states: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          provider: string
          redirect_to: string | null
          state: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          provider: string
          redirect_to?: string | null
          state: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          provider?: string
          redirect_to?: string | null
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      organizer_blacklist: {
        Row: {
          created_at: string | null
          expires_at: string | null
          id: string | null
          organizer_id: string | null
          reason: string | null
          team_tag: string | null
        }
        Insert: {
          created_at?: string | null
          expires_at?: string | null
          id?: string | null
          organizer_id?: string | null
          reason?: string | null
          team_tag?: string | null
        }
        Update: {
          created_at?: string | null
          expires_at?: string | null
          id?: string | null
          organizer_id?: string | null
          reason?: string | null
          team_tag?: string | null
        }
        Relationships: []
      }
      organizer_follows: {
        Row: {
          created_at: string
          follower_id: string
          id: string
          organizer_id: string
        }
        Insert: {
          created_at?: string
          follower_id: string
          id?: string
          organizer_id: string
        }
        Update: {
          created_at?: string
          follower_id?: string
          id?: string
          organizer_id?: string
        }
        Relationships: []
      }
      player_card_frames: {
        Row: {
          accent_hsl: string | null
          background_hsl: string | null
          border_hsl: string | null
          created_at: string
          id: string
          meta: Json | null
          name: string
          rarity: string
          slug: string
          updated_at: string
        }
        Insert: {
          accent_hsl?: string | null
          background_hsl?: string | null
          border_hsl?: string | null
          created_at?: string
          id?: string
          meta?: Json | null
          name: string
          rarity?: string
          slug: string
          updated_at?: string
        }
        Update: {
          accent_hsl?: string | null
          background_hsl?: string | null
          border_hsl?: string | null
          created_at?: string
          id?: string
          meta?: Json | null
          name?: string
          rarity?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      player_rank_adjustments: {
        Row: {
          created_at: string
          created_by: string
          game_id: string
          id: string
          match_id: string | null
          points: number
          reason: string
          season_id: string
          target_user_id: string
          training_id: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          game_id: string
          id?: string
          match_id?: string | null
          points: number
          reason: string
          season_id: string
          target_user_id: string
          training_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          game_id?: string
          id?: string
          match_id?: string | null
          points?: number
          reason?: string
          season_id?: string
          target_user_id?: string
          training_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "player_rank_adjustments_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "ranking_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      player_rank_events: {
        Row: {
          breakdown: Json | null
          created_at: string
          created_by: string | null
          game_id: string
          id: string
          match_id: string | null
          points: number
          season_id: string
          source: string
          training_id: string | null
          user_id: string
        }
        Insert: {
          breakdown?: Json | null
          created_at?: string
          created_by?: string | null
          game_id: string
          id?: string
          match_id?: string | null
          points: number
          season_id: string
          source?: string
          training_id?: string | null
          user_id: string
        }
        Update: {
          breakdown?: Json | null
          created_at?: string
          created_by?: string | null
          game_id?: string
          id?: string
          match_id?: string | null
          points?: number
          season_id?: string
          source?: string
          training_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_rank_events_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "ranking_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      player_season_points: {
        Row: {
          game_id: string
          points: number
          season_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          game_id: string
          points?: number
          season_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          game_id?: string
          points?: number
          season_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_season_points_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "ranking_seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          available_for_team: boolean
          avatar_url: string | null
          banner_url: string | null
          created_at: string | null
          discord_contact: string | null
          discord_url: string | null
          full_name: string | null
          id: string
          instagram_url: string | null
          player_card_frame_id: string | null
          player_function: string | null
          preferred_games: Json | null
          preferred_language: string
          role: string | null
          tracker_url: string | null
          twitter_url: string | null
          updated_at: string | null
          username: string | null
          youtube_url: string | null
        }
        Insert: {
          available_for_team?: boolean
          avatar_url?: string | null
          banner_url?: string | null
          created_at?: string | null
          discord_contact?: string | null
          discord_url?: string | null
          full_name?: string | null
          id: string
          instagram_url?: string | null
          player_card_frame_id?: string | null
          player_function?: string | null
          preferred_games?: Json | null
          preferred_language?: string
          role?: string | null
          tracker_url?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          username?: string | null
          youtube_url?: string | null
        }
        Update: {
          available_for_team?: boolean
          avatar_url?: string | null
          banner_url?: string | null
          created_at?: string | null
          discord_contact?: string | null
          discord_url?: string | null
          full_name?: string | null
          id?: string
          instagram_url?: string | null
          player_card_frame_id?: string | null
          player_function?: string | null
          preferred_games?: Json | null
          preferred_language?: string
          role?: string | null
          tracker_url?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          username?: string | null
          youtube_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_player_card_frame_id_fkey"
            columns: ["player_card_frame_id"]
            isOneToOne: false
            referencedRelation: "player_card_frames"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string | null
          created_at: string
          endpoint: string
          expiration_time: number | null
          id: string
          p256dh: string | null
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth?: string | null
          created_at?: string
          endpoint: string
          expiration_time?: number | null
          id?: string
          p256dh?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string | null
          created_at?: string
          endpoint?: string
          expiration_time?: number | null
          id?: string
          p256dh?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      ranking_seasons: {
        Row: {
          created_at: string
          end_at: string | null
          id: string
          name: string
          start_at: string
        }
        Insert: {
          created_at?: string
          end_at?: string | null
          id?: string
          name: string
          start_at: string
        }
        Update: {
          created_at?: string
          end_at?: string | null
          id?: string
          name?: string
          start_at?: string
        }
        Relationships: []
      }
      team_badges: {
        Row: {
          badge_count: number | null
          badge_type: string | null
          earned_at: string | null
          id: string | null
          team_id: string | null
        }
        Insert: {
          badge_count?: number | null
          badge_type?: string | null
          earned_at?: string | null
          id?: string | null
          team_id?: string | null
        }
        Update: {
          badge_count?: number | null
          badge_type?: string | null
          earned_at?: string | null
          id?: string | null
          team_id?: string | null
        }
        Relationships: []
      }
      team_bans: {
        Row: {
          banned_until: string | null
          created_at: string | null
          id: string | null
          reason: string | null
          team_tag: string | null
        }
        Insert: {
          banned_until?: string | null
          created_at?: string | null
          id?: string | null
          reason?: string | null
          team_tag?: string | null
        }
        Update: {
          banned_until?: string | null
          created_at?: string | null
          id?: string | null
          reason?: string | null
          team_tag?: string | null
        }
        Relationships: []
      }
      team_invites: {
        Row: {
          created_at: string
          expires_at: string | null
          external_discord: string | null
          external_game_id: string | null
          external_player_name: string | null
          id: string
          invited_user_id: string | null
          invited_username: string | null
          is_external: string | null
          permission: string | null
          status: string | null
          team_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          external_discord?: string | null
          external_game_id?: string | null
          external_player_name?: string | null
          id?: string
          invited_user_id?: string | null
          invited_username?: string | null
          is_external?: string | null
          permission?: string | null
          status?: string | null
          team_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          external_discord?: string | null
          external_game_id?: string | null
          external_player_name?: string | null
          id?: string
          invited_user_id?: string | null
          invited_username?: string | null
          is_external?: string | null
          permission?: string | null
          status?: string | null
          team_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      team_lines: {
        Row: {
          created_at: string
          game_id: string | null
          id: string
          name: string
          team_id: string
        }
        Insert: {
          created_at?: string
          game_id?: string | null
          id?: string
          name: string
          team_id: string
        }
        Update: {
          created_at?: string
          game_id?: string | null
          id?: string
          name?: string
          team_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_lines_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string | null
          discord: string | null
          function: string | null
          game_id: string | null
          id: string | null
          line_id: string | null
          player_name: string | null
          team_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          discord?: string | null
          function?: string | null
          game_id?: string | null
          id?: string | null
          line_id?: string | null
          player_name?: string | null
          team_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          discord?: string | null
          function?: string | null
          game_id?: string | null
          id?: string | null
          line_id?: string | null
          player_name?: string | null
          team_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "team_members_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "team_lines"
            referencedColumns: ["id"]
          },
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
          created_at: string | null
          id: string | null
          organizer_id: string | null
          reason: string | null
          team_id: string | null
          team_tag: string | null
          training_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          organizer_id?: string | null
          reason?: string | null
          team_id?: string | null
          team_tag?: string | null
          training_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          organizer_id?: string | null
          reason?: string | null
          team_id?: string | null
          team_tag?: string | null
          training_id?: string | null
        }
        Relationships: []
      }
      teams: {
        Row: {
          banner_url: string | null
          bio: string | null
          created_at: string | null
          deleted_at: string | null
          deleted_by: string | null
          description: string | null
          discord_url: string | null
          id: string
          instagram_url: string | null
          integrated_games: Json | null
          is_external: boolean | null
          is_recruiting: boolean | null
          is_verified: boolean | null
          logo_url: string | null
          name: string | null
          owner_id: string | null
          platform: string | null
          primary_color: string | null
          rating: string | null
          region: string | null
          secondary_color: string | null
          tag: string | null
          twitter_url: string | null
          updated_at: string | null
          youtube_url: string | null
        }
        Insert: {
          banner_url?: string | null
          bio?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          discord_url?: string | null
          id?: string
          instagram_url?: string | null
          integrated_games?: Json | null
          is_external?: boolean | null
          is_recruiting?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          name?: string | null
          owner_id?: string | null
          platform?: string | null
          primary_color?: string | null
          rating?: string | null
          region?: string | null
          secondary_color?: string | null
          tag?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          youtube_url?: string | null
        }
        Update: {
          banner_url?: string | null
          bio?: string | null
          created_at?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          description?: string | null
          discord_url?: string | null
          id?: string
          instagram_url?: string | null
          integrated_games?: Json | null
          is_external?: boolean | null
          is_recruiting?: boolean | null
          is_verified?: boolean | null
          logo_url?: string | null
          name?: string | null
          owner_id?: string | null
          platform?: string | null
          primary_color?: string | null
          rating?: string | null
          region?: string | null
          secondary_color?: string | null
          tag?: string | null
          twitter_url?: string | null
          updated_at?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      training_checkins: {
        Row: {
          checked_in_at: string
          checked_in_by: string
          id: string
          team_id: string
          training_id: string
        }
        Insert: {
          checked_in_at?: string
          checked_in_by: string
          id?: string
          team_id: string
          training_id: string
        }
        Update: {
          checked_in_at?: string
          checked_in_by?: string
          id?: string
          team_id?: string
          training_id?: string
        }
        Relationships: []
      }
      training_event_logs: {
        Row: {
          action: string | null
          created_at: string | null
          id: string | null
          team_id: string | null
          team_name: string | null
          team_tag: string | null
          training_id: string | null
        }
        Insert: {
          action?: string | null
          created_at?: string | null
          id?: string | null
          team_id?: string | null
          team_name?: string | null
          team_tag?: string | null
          training_id?: string | null
        }
        Update: {
          action?: string | null
          created_at?: string | null
          id?: string | null
          team_id?: string | null
          team_name?: string | null
          team_tag?: string | null
          training_id?: string | null
        }
        Relationships: []
      }
      training_match_scores: {
        Row: {
          bonus_points: string | null
          created_at: string | null
          id: string | null
          kill_points: number | null
          kills: number | null
          match_id: string | null
          position: number | null
          position_points: number | null
          team_id: string | null
          total_points: number | null
        }
        Insert: {
          bonus_points?: string | null
          created_at?: string | null
          id?: string | null
          kill_points?: number | null
          kills?: number | null
          match_id?: string | null
          position?: number | null
          position_points?: number | null
          team_id?: string | null
          total_points?: number | null
        }
        Update: {
          bonus_points?: string | null
          created_at?: string | null
          id?: string | null
          kill_points?: number | null
          kills?: number | null
          match_id?: string | null
          position?: number | null
          position_points?: number | null
          team_id?: string | null
          total_points?: number | null
        }
        Relationships: []
      }
      training_matches: {
        Row: {
          created_at: string
          id: string
          map_name: string | null
          match_number: number | null
          match_time: string | null
          name: string | null
          round_id: string | null
          status: string | null
          training_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          map_name?: string | null
          match_number?: number | null
          match_time?: string | null
          name?: string | null
          round_id?: string | null
          status?: string | null
          training_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          map_name?: string | null
          match_number?: number | null
          match_time?: string | null
          name?: string | null
          round_id?: string | null
          status?: string | null
          training_id?: string | null
        }
        Relationships: []
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
        Relationships: []
      }
      training_notifications: {
        Row: {
          id: string
          sent_at: string
          training_id: string
          type: string
        }
        Insert: {
          id?: string
          sent_at?: string
          training_id: string
          type: string
        }
        Update: {
          id?: string
          sent_at?: string
          training_id?: string
          type?: string
        }
        Relationships: []
      }
      training_player_stats: {
        Row: {
          created_at: string
          id: string
          is_mvp: boolean
          kills: number
          line_id: string | null
          match_id: string
          player_name: string
          team_id: string
          team_member_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_mvp?: boolean
          kills?: number
          line_id?: string | null
          match_id: string
          player_name: string
          team_id: string
          team_member_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_mvp?: boolean
          kills?: number
          line_id?: string | null
          match_id?: string
          player_name?: string
          team_id?: string
          team_member_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_player_stats_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "team_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_player_stats_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      training_registrations: {
        Row: {
          id: string
          line_id: string | null
          registered_at: string
          slot_number: number | null
          team_id: string
          training_id: string
        }
        Insert: {
          id?: string
          line_id?: string | null
          registered_at?: string
          slot_number?: number | null
          team_id: string
          training_id: string
        }
        Update: {
          id?: string
          line_id?: string | null
          registered_at?: string
          slot_number?: number | null
          team_id?: string
          training_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_registrations_line_id_fkey"
            columns: ["line_id"]
            isOneToOne: false
            referencedRelation: "team_lines"
            referencedColumns: ["id"]
          },
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
          name: string | null
          round_number: number | null
          training_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          round_number?: number | null
          training_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          round_number?: number | null
          training_id?: string | null
        }
        Relationships: []
      }
      training_slot_state: {
        Row: {
          last_is_full: boolean
          training_id: string
          updated_at: string
        }
        Insert: {
          last_is_full?: boolean
          training_id: string
          updated_at?: string
        }
        Update: {
          last_is_full?: boolean
          training_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      training_templates: {
        Row: {
          created_at: string | null
          discord_link: string | null
          game: string | null
          id: string | null
          important_info: string | null
          max_slots: number | null
          mode: string | null
          name: string | null
          organizer_id: string | null
          platform: string | null
          points_per_kill: number | null
          points_per_position: Json | null
          points_per_position_text: string | null
          primary_color: string | null
          prize: string | null
          rounds: number | null
          rules: string | null
          secondary_color: string | null
          updated_at: string | null
          whatsapp_link: string | null
        }
        Insert: {
          created_at?: string | null
          discord_link?: string | null
          game?: string | null
          id?: string | null
          important_info?: string | null
          max_slots?: number | null
          mode?: string | null
          name?: string | null
          organizer_id?: string | null
          platform?: string | null
          points_per_kill?: number | null
          points_per_position?: Json | null
          points_per_position_text?: string | null
          primary_color?: string | null
          prize?: string | null
          rounds?: number | null
          rules?: string | null
          secondary_color?: string | null
          updated_at?: string | null
          whatsapp_link?: string | null
        }
        Update: {
          created_at?: string | null
          discord_link?: string | null
          game?: string | null
          id?: string | null
          important_info?: string | null
          max_slots?: number | null
          mode?: string | null
          name?: string | null
          organizer_id?: string | null
          platform?: string | null
          points_per_kill?: number | null
          points_per_position?: Json | null
          points_per_position_text?: string | null
          primary_color?: string | null
          prize?: string | null
          rounds?: number | null
          rules?: string | null
          secondary_color?: string | null
          updated_at?: string | null
          whatsapp_link?: string | null
        }
        Relationships: []
      }
      training_waitlist: {
        Row: {
          created_at: string
          id: string
          status: string
          team_id: string
          training_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          status?: string
          team_id: string
          training_id: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: string
          team_id?: string
          training_id?: string
        }
        Relationships: []
      }
      trainings: {
        Row: {
          banner_url: string | null
          created_at: string | null
          datetime: string | null
          deleted_at: string | null
          deleted_by: string | null
          discord_link: string | null
          game: string | null
          id: string
          important_info: string | null
          invited_tags: Json | null
          is_live: boolean | null
          is_private: boolean | null
          live_link: string | null
          max_slots: number | null
          mode: string | null
          name: string | null
          organizer_id: string | null
          platform: string | null
          points_per_kill: number | null
          points_per_position: Json | null
          points_per_position_text: string | null
          primary_color: string | null
          prize: string | null
          rounds: number | null
          rules: string | null
          secondary_color: string | null
          status: string | null
          table_image_url: string | null
          updated_at: string | null
          whatsapp_link: string | null
        }
        Insert: {
          banner_url?: string | null
          created_at?: string | null
          datetime?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          discord_link?: string | null
          game?: string | null
          id: string
          important_info?: string | null
          invited_tags?: Json | null
          is_live?: boolean | null
          is_private?: boolean | null
          live_link?: string | null
          max_slots?: number | null
          mode?: string | null
          name?: string | null
          organizer_id?: string | null
          platform?: string | null
          points_per_kill?: number | null
          points_per_position?: Json | null
          points_per_position_text?: string | null
          primary_color?: string | null
          prize?: string | null
          rounds?: number | null
          rules?: string | null
          secondary_color?: string | null
          status?: string | null
          table_image_url?: string | null
          updated_at?: string | null
          whatsapp_link?: string | null
        }
        Update: {
          banner_url?: string | null
          created_at?: string | null
          datetime?: string | null
          deleted_at?: string | null
          deleted_by?: string | null
          discord_link?: string | null
          game?: string | null
          id?: string
          important_info?: string | null
          invited_tags?: Json | null
          is_live?: boolean | null
          is_private?: boolean | null
          live_link?: string | null
          max_slots?: number | null
          mode?: string | null
          name?: string | null
          organizer_id?: string | null
          platform?: string | null
          points_per_kill?: number | null
          points_per_position?: Json | null
          points_per_position_text?: string | null
          primary_color?: string | null
          prize?: string | null
          rounds?: number | null
          rules?: string | null
          secondary_color?: string | null
          status?: string | null
          table_image_url?: string | null
          updated_at?: string | null
          whatsapp_link?: string | null
        }
        Relationships: []
      }
      tutorial_video_progress: {
        Row: {
          created_at: string
          current_time_seconds: number
          duration_seconds: number
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          created_at?: string
          current_time_seconds?: number
          duration_seconds?: number
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          created_at?: string
          current_time_seconds?: number
          duration_seconds?: number
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: []
      }
      twitch_connections: {
        Row: {
          access_token: string
          created_at: string
          expires_at: string | null
          refresh_token: string
          scope: string | null
          token_type: string | null
          twitch_display_name: string | null
          twitch_login: string
          twitch_user_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          expires_at?: string | null
          refresh_token: string
          scope?: string | null
          token_type?: string | null
          twitch_display_name?: string | null
          twitch_login: string
          twitch_user_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          expires_at?: string | null
          refresh_token?: string
          scope?: string | null
          token_type?: string | null
          twitch_display_name?: string | null
          twitch_login?: string
          twitch_user_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      twitch_live_status: {
        Row: {
          game_name: string | null
          is_live: boolean
          started_at: string | null
          thumbnail_url: string | null
          title: string | null
          twitch_login: string
          updated_at: string
          user_id: string
          viewer_count: number | null
        }
        Insert: {
          game_name?: string | null
          is_live?: boolean
          started_at?: string | null
          thumbnail_url?: string | null
          title?: string | null
          twitch_login: string
          updated_at?: string
          user_id: string
          viewer_count?: number | null
        }
        Update: {
          game_name?: string | null
          is_live?: boolean
          started_at?: string | null
          thumbnail_url?: string | null
          title?: string | null
          twitch_login?: string
          updated_at?: string
          user_id?: string
          viewer_count?: number | null
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          created_at: string
          id: string
          progress: number
          unlocked_at: string | null
          user_id: string
        }
        Insert: {
          achievement_id: string
          created_at?: string
          id?: string
          progress?: number
          unlocked_at?: string | null
          user_id: string
        }
        Update: {
          achievement_id?: string
          created_at?: string
          id?: string
          progress?: number
          unlocked_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_popup_dismissals: {
        Row: {
          created_at: string
          dismissed_at: string
          id: string
          popup_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          dismissed_at?: string
          id?: string
          popup_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          dismissed_at?: string
          id?: string
          popup_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_popup_dismissals_popup_id_fkey"
            columns: ["popup_id"]
            isOneToOne: false
            referencedRelation: "educational_popups"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string | null
          id: string
          role: string | null
          user_id: string | null
        }
        Insert: {
          assigned_at?: string | null
          id?: string
          role?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_at?: string | null
          id?: string
          role?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      verified_entities: {
        Row: {
          created_at: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["verified_entity_type"]
          id: string
          notes: string | null
          updated_at: string
          verified: boolean
          verified_at: string
          verified_by: string | null
        }
        Insert: {
          created_at?: string
          entity_id: string
          entity_type: Database["public"]["Enums"]["verified_entity_type"]
          id?: string
          notes?: string | null
          updated_at?: string
          verified?: boolean
          verified_at?: string
          verified_by?: string | null
        }
        Update: {
          created_at?: string
          entity_id?: string
          entity_type?: Database["public"]["Enums"]["verified_entity_type"]
          id?: string
          notes?: string | null
          updated_at?: string
          verified?: boolean
          verified_at?: string
          verified_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      verified_entities_public: {
        Row: {
          entity_id: string | null
          entity_type:
            | Database["public"]["Enums"]["verified_entity_type"]
            | null
          verified: boolean | null
        }
        Insert: {
          entity_id?: string | null
          entity_type?:
            | Database["public"]["Enums"]["verified_entity_type"]
            | null
          verified?: boolean | null
        }
        Update: {
          entity_id?: string | null
          entity_type?:
            | Database["public"]["Enums"]["verified_entity_type"]
            | null
          verified?: boolean | null
        }
        Relationships: []
      }
      vw_organizer_follow_counts: {
        Row: {
          followers_count: number | null
          organizer_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_team_invite: { Args: { _invite_id: string }; Returns: Json }
      apply_rank_adjustment: {
        Args: { _adjustment_id: string }
        Returns: undefined
      }
      apply_rank_points_for_match: {
        Args: { _match_id: string }
        Returns: undefined
      }
      claim_waitlist_slot: {
        Args: { _line_id?: string; _team_id: string; _training_id: string }
        Returns: Json
      }
      get_organizer_follow_count: {
        Args: { _organizer_id: string }
        Returns: number
      }
      get_public_player_stats: { Args: { _user_id: string }; Returns: Json }
      get_ranking_season_id: { Args: { at_time: string }; Returns: string }
      get_verified_entities: {
        Args: {
          _entity_ids: string[]
          _entity_type: Database["public"]["Enums"]["verified_entity_type"]
        }
        Returns: {
          entity_id: string
          verified: boolean
        }[]
      }
      is_entity_verified: {
        Args: {
          _entity_id: string
          _entity_type: Database["public"]["Enums"]["verified_entity_type"]
        }
        Returns: boolean
      }
      is_organizer: { Args: { _user_id: string }; Returns: boolean }
      is_organizer_verified: { Args: { _user_id: string }; Returns: boolean }
      is_team_admin: {
        Args: { _team_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      verified_entity_type: "user" | "team"
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
      verified_entity_type: ["user", "team"],
    },
  },
} as const
