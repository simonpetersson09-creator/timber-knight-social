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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      abuse_limits: {
        Row: {
          action: string
          blocked_until: string | null
          hits: number
          subject_hash: string
          window_started_at: string
        }
        Insert: {
          action: string
          blocked_until?: string | null
          hits?: number
          subject_hash: string
          window_started_at?: string
        }
        Update: {
          action?: string
          blocked_until?: string | null
          hits?: number
          subject_hash?: string
          window_started_at?: string
        }
        Relationships: []
      }
      app_days: {
        Row: {
          day: string
          platform: string
          player: string
        }
        Insert: {
          day: string
          platform: string
          player: string
        }
        Update: {
          day?: string
          platform?: string
          player?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_days_player_fkey"
            columns: ["player"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      client_events: {
        Row: {
          created_at: string
          detail: string | null
          event_id: string | null
          id: number
          kind: string
          name: string
          platform: string
          player: string | null
        }
        Insert: {
          created_at?: string
          detail?: string | null
          event_id?: string | null
          id?: never
          kind: string
          name: string
          platform: string
          player?: string | null
        }
        Update: {
          created_at?: string
          detail?: string | null
          event_id?: string | null
          id?: never
          kind?: string
          name?: string
          platform?: string
          player?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_events_player_fkey"
            columns: ["player"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      friendships: {
        Row: {
          addressee: string
          created_at: string
          id: string
          requester: string
          status: string
        }
        Insert: {
          addressee: string
          created_at?: string
          id?: string
          requester: string
          status?: string
        }
        Update: {
          addressee?: string
          created_at?: string
          id?: string
          requester?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "friendships_addressee_fkey"
            columns: ["addressee"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "friendships_requester_fkey"
            columns: ["requester"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      game_chat: {
        Row: {
          created_at: string
          game_id: string
          id: number
          phrase: number
          player: string
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: never
          phrase: number
          player: string
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: never
          phrase?: number
          player?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_chat_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_chat_player_fkey"
            columns: ["player"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          black: string | null
          code: string | null
          created_at: string
          draw_offer: string | null
          draw_offers_b: number
          draw_offers_w: number
          end_reason: string | null
          expires_at: string
          fen: string
          host: string
          id: string
          invitee: string | null
          kind: string
          last_move_at: string
          pgn: string
          reminded: boolean
          result: string | null
          status: string
          updated_at: string
          white: string | null
        }
        Insert: {
          black?: string | null
          code?: string | null
          created_at?: string
          draw_offer?: string | null
          draw_offers_b?: number
          draw_offers_w?: number
          end_reason?: string | null
          expires_at: string
          fen?: string
          host: string
          id?: string
          invitee?: string | null
          kind: string
          last_move_at?: string
          pgn?: string
          reminded?: boolean
          result?: string | null
          status?: string
          updated_at?: string
          white?: string | null
        }
        Update: {
          black?: string | null
          code?: string | null
          created_at?: string
          draw_offer?: string | null
          draw_offers_b?: number
          draw_offers_w?: number
          end_reason?: string | null
          expires_at?: string
          fen?: string
          host?: string
          id?: string
          invitee?: string | null
          kind?: string
          last_move_at?: string
          pgn?: string
          reminded?: boolean
          result?: string | null
          status?: string
          updated_at?: string
          white?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "games_black_fkey"
            columns: ["black"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_host_fkey"
            columns: ["host"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_invitee_fkey"
            columns: ["invitee"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "games_white_fkey"
            columns: ["white"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          black: string
          counts: boolean
          finished_at: string
          game_id: string | null
          id: string
          result: string
          white: string
        }
        Insert: {
          black: string
          counts?: boolean
          finished_at?: string
          game_id?: string | null
          id?: string
          result: string
          white: string
        }
        Update: {
          black?: string
          counts?: boolean
          finished_at?: string
          game_id?: string | null
          id?: string
          result?: string
          white?: string
        }
        Relationships: [
          {
            foreignKeyName: "matches_black_fkey"
            columns: ["black"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_white_fkey"
            columns: ["white"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          avatar: string
          country: string | null
          created_at: string
          friend_code: string
          id: string
          is_test: boolean
          lang: string
          last_played: string | null
          last_reminder: string | null
          last_seen: string
          name: string | null
          notify: boolean
          notify_play: boolean
          notify_reminders: boolean
          notify_turn: boolean
          platform: string
          player_number: number
          push_token: string | null
          secret_hash: string
          tz: string | null
        }
        Insert: {
          avatar?: string
          country?: string | null
          created_at?: string
          friend_code: string
          id?: string
          is_test?: boolean
          lang?: string
          last_played?: string | null
          last_reminder?: string | null
          last_seen?: string
          name?: string | null
          notify?: boolean
          notify_play?: boolean
          notify_reminders?: boolean
          notify_turn?: boolean
          platform?: string
          player_number?: never
          push_token?: string | null
          secret_hash: string
          tz?: string | null
        }
        Update: {
          avatar?: string
          country?: string | null
          created_at?: string
          friend_code?: string
          id?: string
          is_test?: boolean
          lang?: string
          last_played?: string | null
          last_reminder?: string | null
          last_seen?: string
          name?: string | null
          notify?: boolean
          notify_play?: boolean
          notify_reminders?: boolean
          notify_turn?: boolean
          platform?: string
          player_number?: never
          push_token?: string | null
          secret_hash?: string
          tz?: string | null
        }
        Relationships: []
      }
      push_outbox: {
        Row: {
          attempts: number
          available_at: string
          created_at: string
          data: Json
          event_key: string
          id: string
          message_key: string
          params: Json
          player: string
          sent_at: string | null
          status: string
        }
        Insert: {
          attempts?: number
          available_at?: string
          created_at?: string
          data?: Json
          event_key: string
          id?: string
          message_key: string
          params?: Json
          player: string
          sent_at?: string | null
          status?: string
        }
        Update: {
          attempts?: number
          available_at?: string
          created_at?: string
          data?: Json
          event_key?: string
          id?: string
          message_key?: string
          params?: Json
          player?: string
          sent_at?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_outbox_player_fkey"
            columns: ["player"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      chess_abuse_limit: {
        Args: {
          p_action: string
          p_block_seconds: number
          p_consume?: boolean
          p_limit: number
          p_subject: string
          p_window_seconds: number
        }
        Returns: boolean
      }
      claim_push_deliveries: {
        Args: { p_limit?: number }
        Returns: {
          attempts: number
          available_at: string
          created_at: string
          data: Json
          event_key: string
          id: string
          message_key: string
          params: Json
          player: string
          sent_at: string | null
          status: string
        }[]
        SetofOptions: {
          from: "*"
          to: "push_outbox"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      enqueue_push: {
        Args: {
          p_data?: Json
          p_event: string
          p_key: string
          p_params?: Json
          p_player: string
        }
        Returns: undefined
      }
      finish_push_delivery: {
        Args: {
          p_attempts: number
          p_id: string
          p_retry_seconds?: number
          p_success: boolean
        }
        Returns: undefined
      }
      ingest_chess_event: {
        Args: {
          p_detail: string
          p_event: string
          p_kind: string
          p_name: string
          p_player: string
        }
        Returns: boolean
      }
      invite_chess_friend: {
        Args: { p_friend: string; p_player: string }
        Returns: {
          event: string
          id: string
        }[]
      }
      leaderboard: {
        Args: { p_country: string; p_kind: string }
        Returns: {
          avatar: string
          country: string
          name: string
          player: string
          player_number: number
          score: number
        }[]
      }
      quick_match: {
        Args: { p_game?: string; p_player: string }
        Returns: {
          id: string
          status: string
        }[]
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
