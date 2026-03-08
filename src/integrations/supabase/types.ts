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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      agents: {
        Row: {
          agency: string | null
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          is_subscribed: boolean
          name: string
          phone: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          agency?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_subscribed?: boolean
          name: string
          phone?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          agency?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          is_subscribed?: boolean
          name?: string
          phone?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_expires_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      lead_events: {
        Row: {
          agent_id: string
          created_at: string
          event_type: string
          id: string
          property_id: string
          user_id: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string
          event_type: string
          id?: string
          property_id: string
          user_id?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string
          event_type?: string
          id?: string
          property_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_events_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          message: string | null
          pre_approval_status: string | null
          preferred_contact: string | null
          property_id: string
          score: number | null
          search_context: Json | null
          status: string | null
          urgency: string | null
          user_email: string
          user_id: string | null
          user_name: string
          user_phone: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          message?: string | null
          pre_approval_status?: string | null
          preferred_contact?: string | null
          property_id: string
          score?: number | null
          search_context?: Json | null
          status?: string | null
          urgency?: string | null
          user_email: string
          user_id?: string | null
          user_name: string
          user_phone?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          message?: string | null
          pre_approval_status?: string | null
          preferred_contact?: string | null
          property_id?: string
          score?: number | null
          search_context?: Json | null
          status?: string | null
          urgency?: string | null
          user_email?: string
          user_id?: string | null
          user_name?: string
          user_phone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          preferred_language: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          preferred_language?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          preferred_language?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          agent_id: string | null
          baths: number
          beds: number
          contact_clicks: number
          country: string
          created_at: string
          description: string | null
          estimated_value: string | null
          features: string[] | null
          id: string
          image_url: string | null
          images: string[] | null
          is_active: boolean
          listed_date: string | null
          parking: number
          price: number
          price_formatted: string
          property_type: string | null
          sqm: number
          state: string
          suburb: string
          title: string
          updated_at: string
          views: number
        }
        Insert: {
          address: string
          agent_id?: string | null
          baths?: number
          beds?: number
          contact_clicks?: number
          country?: string
          created_at?: string
          description?: string | null
          estimated_value?: string | null
          features?: string[] | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          is_active?: boolean
          listed_date?: string | null
          parking?: number
          price: number
          price_formatted: string
          property_type?: string | null
          sqm?: number
          state: string
          suburb: string
          title: string
          updated_at?: string
          views?: number
        }
        Update: {
          address?: string
          agent_id?: string | null
          baths?: number
          beds?: number
          contact_clicks?: number
          country?: string
          created_at?: string
          description?: string | null
          estimated_value?: string | null
          features?: string[] | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          is_active?: boolean
          listed_date?: string | null
          parking?: number
          price?: number
          price_formatted?: string
          property_type?: string | null
          sqm?: number
          state?: string
          suburb?: string
          title?: string
          updated_at?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "fk_properties_agent"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_properties: {
        Row: {
          created_at: string
          id: string
          property_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          property_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          property_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_properties_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      user_preferences: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          created_at: string
          id: string
          preferred_baths: number | null
          preferred_beds: number | null
          preferred_locations: string[] | null
          search_history: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          id?: string
          preferred_baths?: number | null
          preferred_beds?: number | null
          preferred_locations?: string[] | null
          search_history?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          id?: string
          preferred_baths?: number | null
          preferred_beds?: number | null
          preferred_locations?: string[] | null
          search_history?: Json | null
          updated_at?: string
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
      voice_searches: {
        Row: {
          audio_duration: number | null
          created_at: string
          detected_language: string | null
          id: string
          parsed_query: Json | null
          session_id: string | null
          status: string | null
          transcript: string
          user_id: string | null
          user_location: Json | null
        }
        Insert: {
          audio_duration?: number | null
          created_at?: string
          detected_language?: string | null
          id?: string
          parsed_query?: Json | null
          session_id?: string | null
          status?: string | null
          transcript: string
          user_id?: string | null
          user_location?: Json | null
        }
        Update: {
          audio_duration?: number | null
          created_at?: string
          detected_language?: string | null
          id?: string
          parsed_query?: Json | null
          session_id?: string | null
          status?: string | null
          transcript?: string
          user_id?: string | null
          user_location?: Json | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "user" | "agent" | "admin"
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
      app_role: ["user", "agent", "admin"],
    },
  },
} as const
