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
      daft_price_events: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          id: string
          price: number
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          id?: string
          price: number
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          id?: string
          price?: number
        }
        Relationships: []
      }
      daft_quote: {
        Row: {
          baseline_at: string
          baseline_price: number
          price: number
          symbol: string
          trend: string
          trend_until: string | null
          updated_at: string
          version: number
        }
        Insert: {
          baseline_at?: string
          baseline_price: number
          price: number
          symbol: string
          trend?: string
          trend_until?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          baseline_at?: string
          baseline_price?: number
          price?: number
          symbol?: string
          trend?: string
          trend_until?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      deposit_submissions: {
        Row: {
          checked_at: string
          confirmations: number
          created_at: string
          detected_amount: number | null
          expected_amount: number
          id: string
          message: string
          network: string
          status: string
          tx_hash: string
          user_id: string
        }
        Insert: {
          checked_at?: string
          confirmations?: number
          created_at?: string
          detected_amount?: number | null
          expected_amount: number
          id?: string
          message?: string
          network: string
          status?: string
          tx_hash: string
          user_id: string
        }
        Update: {
          checked_at?: string
          confirmations?: number
          created_at?: string
          detected_amount?: number | null
          expected_amount?: number
          id?: string
          message?: string
          network?: string
          status?: string
          tx_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      founder_codes: {
        Row: {
          code: string
          created_at: string
          note: string | null
        }
        Insert: {
          code: string
          created_at?: string
          note?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          note?: string | null
        }
        Relationships: []
      }
      invite_codes: {
        Row: {
          code: string
          created_at: string
          invited_by: string | null
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          invited_by?: string | null
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          invited_by?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_balances: {
        Row: {
          balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      wallet_ledger: {
        Row: {
          amount: number
          created_at: string
          id: string
          kind: string
          note: string
          ref_id: string | null
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          kind: string
          note?: string
          ref_id?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          kind?: string
          note?: string
          ref_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      wallet_transfers: {
        Row: {
          amount: number
          created_at: string
          id: string
          note: string
          recipient_email: string
          recipient_id: string
          sender_email: string
          sender_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          note?: string
          recipient_email?: string
          recipient_id: string
          sender_email?: string
          sender_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          note?: string
          recipient_email?: string
          recipient_id?: string
          sender_email?: string
          sender_id?: string
        }
        Relationships: []
      }
      withdrawals: {
        Row: {
          address: string
          amount: number
          created_at: string
          id: string
          message: string
          network: string
          reviewed_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          address: string
          amount: number
          created_at?: string
          id?: string
          message?: string
          network: string
          reviewed_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          address?: string
          amount?: number
          created_at?: string
          id?: string
          message?: string
          network?: string
          reviewed_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_guard: { Args: never; Returns: undefined }
      admin_list_deposits: {
        Args: { _status?: string }
        Returns: {
          created_at: string
          detected_amount: number
          email: string
          expected_amount: number
          id: string
          message: string
          network: string
          status: string
          tx_hash: string
          user_id: string
        }[]
      }
      admin_list_users: {
        Args: never
        Returns: {
          balance: number
          created_at: string
          email: string
          full_name: string
          invite_code: string
          last_sign_in_at: string
          team_count: number
          user_id: string
        }[]
      }
      admin_list_withdrawals: {
        Args: { _status?: string }
        Returns: {
          address: string
          amount: number
          created_at: string
          email: string
          id: string
          message: string
          network: string
          reviewed_at: string
          status: string
          user_id: string
        }[]
      }
      admin_review_deposit: {
        Args: { _amount?: number; _approve: boolean; _id: string }
        Returns: boolean
      }
      admin_review_withdrawal: {
        Args: { _approve: boolean; _id: string; _note?: string }
        Returns: boolean
      }
      admin_stats: { Args: never; Returns: Json }
      cancel_withdrawal: { Args: { _id: string }; Returns: boolean }
      check_invite_code: { Args: { _code: string }; Returns: boolean }
      ensure_my_invite_code: { Args: never; Returns: string }
      ensure_my_wallet: { Args: never; Returns: number }
      gen_invite_code: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      my_team: {
        Args: never
        Returns: {
          code: string
          joined_at: string
          member: string
          user_id: string
        }[]
      }
      my_team_levels: {
        Args: { _day_start?: string }
        Returns: {
          code: string
          effective_amount: number
          funded: boolean
          joined_at: string
          member: string
          reward: number
          team_level: number
          today_reward: number
          user_id: string
        }[]
      }
      my_team_withdrawals: {
        Args: { _limit?: number }
        Returns: {
          amount: number
          created_at: string
          id: string
          member: string
          network: string
          status: string
          team_level: number
        }[]
      }
      profile_summary: { Args: never; Returns: Json }
      request_withdrawal: {
        Args: { _address: string; _amount: number; _network: string }
        Returns: string
      }
      transfer_funds: {
        Args: { _amount: number; _note?: string; _recipient_email: string }
        Returns: number
      }
      update_daft_quote: {
        Args: { _action: string; _price?: number; _trend?: string }
        Returns: {
          baseline_at: string
          baseline_price: number
          price: number
          symbol: string
          trend: string
          trend_until: string | null
          updated_at: string
          version: number
        }[]
        SetofOptions: {
          from: "*"
          to: "daft_quote"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
