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
      activities: {
        Row: {
          action: string
          created_at: string
          description: string | null
          entity_id: string | null
          entity_type: string
          id: string
          metadata: Json | null
          office_id: string | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type: string
          id?: string
          metadata?: Json | null
          office_id?: string | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          description?: string | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          metadata?: Json | null
          office_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agencies: {
        Row: {
          address: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          logo_url: string | null
          name: string
          owner_user_id: string
          phone: string | null
          slug: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name: string
          owner_user_id: string
          phone?: string | null
          slug: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          owner_user_id?: string
          phone?: string | null
          slug?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      agency_invite_codes: {
        Row: {
          agency_id: string
          code: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          role: Database["public"]["Enums"]["agency_member_role"]
          uses: number
        }
        Insert: {
          agency_id: string
          code: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          role?: Database["public"]["Enums"]["agency_member_role"]
          uses?: number
        }
        Update: {
          agency_id?: string
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          role?: Database["public"]["Enums"]["agency_member_role"]
          uses?: number
        }
        Relationships: [
          {
            foreignKeyName: "agency_invite_codes_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_members: {
        Row: {
          access_level: string
          agency_id: string
          id: string
          joined_at: string
          role: Database["public"]["Enums"]["agency_member_role"]
          user_id: string
        }
        Insert: {
          access_level?: string
          agency_id: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["agency_member_role"]
          user_id: string
        }
        Update: {
          access_level?: string
          agency_id?: string
          id?: string
          joined_at?: string
          role?: Database["public"]["Enums"]["agency_member_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_members_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_credentials: {
        Row: {
          agent_id: string
          document_type: string
          document_url: string
          id: string
          uploaded_at: string
          verified_at: string | null
          verified_status: string
        }
        Insert: {
          agent_id: string
          document_type: string
          document_url: string
          id?: string
          uploaded_at?: string
          verified_at?: string | null
          verified_status?: string
        }
        Update: {
          agent_id?: string
          document_type?: string
          document_url?: string
          id?: string
          uploaded_at?: string
          verified_at?: string | null
          verified_status?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_credentials_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_locations: {
        Row: {
          address: string
          agent_id: string
          created_at: string
          email: string | null
          id: string
          lat: number
          lng: number
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address: string
          agent_id: string
          created_at?: string
          email?: string | null
          id?: string
          lat: number
          lng: number
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string
          agent_id?: string
          created_at?: string
          email?: string | null
          id?: string
          lat?: number
          lng?: number
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_locations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_subscriptions: {
        Row: {
          agent_id: string
          annual_billing: boolean
          auto_renew: boolean | null
          created_at: string
          featured_remaining: number
          founding_member: boolean
          id: string
          listing_limit: number
          monthly_price_aud: number
          payment_method: Json | null
          plan_type: string
          seat_limit: number
          subscription_end: string | null
          subscription_start: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          annual_billing?: boolean
          auto_renew?: boolean | null
          created_at?: string
          featured_remaining?: number
          founding_member?: boolean
          id?: string
          listing_limit?: number
          monthly_price_aud?: number
          payment_method?: Json | null
          plan_type?: string
          seat_limit?: number
          subscription_end?: string | null
          subscription_start?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          annual_billing?: boolean
          auto_renew?: boolean | null
          created_at?: string
          featured_remaining?: number
          founding_member?: boolean
          id?: string
          listing_limit?: number
          monthly_price_aud?: number
          payment_method?: Json | null
          plan_type?: string
          seat_limit?: number
          subscription_end?: string | null
          subscription_start?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_subscriptions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          agency: string | null
          agency_id: string | null
          avatar_url: string | null
          bio: string | null
          company_logo_url: string | null
          created_at: string
          email: string | null
          handles_trust_accounting: boolean | null
          id: string
          investment_niche: string | null
          is_approved: boolean | null
          is_demo: boolean
          is_subscribed: boolean
          languages_spoken: string[] | null
          license_number: string | null
          name: string
          office_address: string | null
          onboarding_complete: boolean | null
          phone: string | null
          profile_photo_url: string | null
          rating: number | null
          review_count: number | null
          service_areas: string[] | null
          social_links: Json | null
          specialization: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_expires_at: string | null
          title_position: string | null
          updated_at: string
          user_id: string
          verification_badge_level: string | null
          website_url: string | null
          years_experience: number | null
        }
        Insert: {
          agency?: string | null
          agency_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          company_logo_url?: string | null
          created_at?: string
          email?: string | null
          handles_trust_accounting?: boolean | null
          id?: string
          investment_niche?: string | null
          is_approved?: boolean | null
          is_demo?: boolean
          is_subscribed?: boolean
          languages_spoken?: string[] | null
          license_number?: string | null
          name: string
          office_address?: string | null
          onboarding_complete?: boolean | null
          phone?: string | null
          profile_photo_url?: string | null
          rating?: number | null
          review_count?: number | null
          service_areas?: string[] | null
          social_links?: Json | null
          specialization?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_expires_at?: string | null
          title_position?: string | null
          updated_at?: string
          user_id: string
          verification_badge_level?: string | null
          website_url?: string | null
          years_experience?: number | null
        }
        Update: {
          agency?: string | null
          agency_id?: string | null
          avatar_url?: string | null
          bio?: string | null
          company_logo_url?: string | null
          created_at?: string
          email?: string | null
          handles_trust_accounting?: boolean | null
          id?: string
          investment_niche?: string | null
          is_approved?: boolean | null
          is_demo?: boolean
          is_subscribed?: boolean
          languages_spoken?: string[] | null
          license_number?: string | null
          name?: string
          office_address?: string | null
          onboarding_complete?: boolean | null
          phone?: string | null
          profile_photo_url?: string | null
          rating?: number | null
          review_count?: number | null
          service_areas?: string[] | null
          social_links?: Json | null
          specialization?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_expires_at?: string | null
          title_position?: string | null
          updated_at?: string
          user_id?: string
          verification_badge_level?: string | null
          website_url?: string | null
          years_experience?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agents_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_briefs: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          is_active: boolean
          max_beds: number
          max_price: number
          min_beds: number
          min_price: number
          notes: string | null
          property_type: string
          suburbs: string[]
          updated_at: string
          urgency: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_beds?: number
          max_price?: number
          min_beds?: number
          min_price?: number
          notes?: string | null
          property_type?: string
          suburbs?: string[]
          updated_at?: string
          urgency?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          max_beds?: number
          max_price?: number
          min_beds?: number
          min_price?: number
          notes?: string | null
          property_type?: string
          suburbs?: string[]
          updated_at?: string
          urgency?: string
        }
        Relationships: [
          {
            foreignKeyName: "buyer_briefs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_profiles: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          created_at: string
          first_name: string | null
          id: string
          last_name: string | null
          preferred_countries: string[] | null
          preferred_property_types: string[] | null
          saved_searches: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          preferred_countries?: string[] | null
          preferred_property_types?: string[] | null
          saved_searches?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          created_at?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          preferred_countries?: string[] | null
          preferred_property_types?: string[] | null
          saved_searches?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      collab_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          property_id: string
          session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          property_id: string
          session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          property_id?: string
          session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collab_reactions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collab_reactions_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "collab_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      collab_sessions: {
        Row: {
          created_at: string
          created_by: string
          filters: Json
          id: string
          map_center_lat: number | null
          map_center_lng: number | null
          map_zoom: number | null
          search_query: string
          selected_property_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          filters?: Json
          id?: string
          map_center_lat?: number | null
          map_center_lng?: number | null
          map_zoom?: number | null
          search_query?: string
          selected_property_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          filters?: Json
          id?: string
          map_center_lat?: number | null
          map_center_lng?: number | null
          map_zoom?: number | null
          search_query?: string
          selected_property_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collab_sessions_selected_property_id_fkey"
            columns: ["selected_property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      collab_views: {
        Row: {
          id: string
          property_id: string
          session_id: string
          user_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          property_id: string
          session_id: string
          user_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          property_id?: string
          session_id?: string
          user_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "collab_views_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collab_views_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "collab_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_activities: {
        Row: {
          activity_type: string
          contact_id: string
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          activity_type: string
          contact_id: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          activity_type?: string
          contact_id?: string
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          address: string | null
          agency_id: string | null
          assigned_agent_id: string | null
          avatar_url: string | null
          budget_max: number | null
          budget_min: number | null
          buyer_pipeline_stage: string | null
          contact_type: string
          country: string | null
          created_at: string
          created_by: string
          email: string | null
          estimated_value: number | null
          first_name: string
          id: string
          last_name: string | null
          mobile: string | null
          notes: string | null
          phone: string | null
          postcode: string | null
          preferred_baths: number | null
          preferred_beds: number | null
          preferred_property_types: string[] | null
          preferred_suburbs: string[] | null
          property_address: string | null
          property_type: string | null
          ranking: string
          seller_pipeline_stage: string | null
          source: string | null
          state: string | null
          suburb: string | null
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          agency_id?: string | null
          assigned_agent_id?: string | null
          avatar_url?: string | null
          budget_max?: number | null
          budget_min?: number | null
          buyer_pipeline_stage?: string | null
          contact_type?: string
          country?: string | null
          created_at?: string
          created_by: string
          email?: string | null
          estimated_value?: number | null
          first_name: string
          id?: string
          last_name?: string | null
          mobile?: string | null
          notes?: string | null
          phone?: string | null
          postcode?: string | null
          preferred_baths?: number | null
          preferred_beds?: number | null
          preferred_property_types?: string[] | null
          preferred_suburbs?: string[] | null
          property_address?: string | null
          property_type?: string | null
          ranking?: string
          seller_pipeline_stage?: string | null
          source?: string | null
          state?: string | null
          suburb?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          agency_id?: string | null
          assigned_agent_id?: string | null
          avatar_url?: string | null
          budget_max?: number | null
          budget_min?: number | null
          buyer_pipeline_stage?: string | null
          contact_type?: string
          country?: string | null
          created_at?: string
          created_by?: string
          email?: string | null
          estimated_value?: number | null
          first_name?: string
          id?: string
          last_name?: string | null
          mobile?: string | null
          notes?: string | null
          phone?: string | null
          postcode?: string | null
          preferred_baths?: number | null
          preferred_beds?: number | null
          preferred_property_types?: string[] | null
          preferred_suburbs?: string[] | null
          property_address?: string | null
          property_type?: string | null
          ranking?: string
          seller_pipeline_stage?: string | null
          source?: string | null
          state?: string | null
          suburb?: string | null
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          archived_by: string[] | null
          created_at: string
          id: string
          last_message_at: string
          participant_1: string
          participant_2: string
          property_id: string | null
        }
        Insert: {
          archived_by?: string[] | null
          created_at?: string
          id?: string
          last_message_at?: string
          participant_1: string
          participant_2: string
          property_id?: string | null
        }
        Update: {
          archived_by?: string[] | null
          created_at?: string
          id?: string
          last_message_at?: string
          participant_1?: string
          participant_2?: string
          property_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_requests: {
        Row: {
          agency_name: string | null
          created_at: string
          demo_code: string | null
          demo_code_expires_at: string | null
          email: string
          full_name: string
          id: string
          message: string | null
          phone: string | null
          status: string
        }
        Insert: {
          agency_name?: string | null
          created_at?: string
          demo_code?: string | null
          demo_code_expires_at?: string | null
          email: string
          full_name: string
          id?: string
          message?: string | null
          phone?: string | null
          status?: string
        }
        Update: {
          agency_name?: string | null
          created_at?: string
          demo_code?: string | null
          demo_code_expires_at?: string | null
          email?: string
          full_name?: string
          id?: string
          message?: string | null
          phone?: string | null
          status?: string
        }
        Relationships: []
      }
      exchange_rate_cache: {
        Row: {
          base_currency: string
          created_at: string
          fetched_at: string
          id: string
          rates: Json
        }
        Insert: {
          base_currency?: string
          created_at?: string
          fetched_at?: string
          id?: string
          rates?: Json
        }
        Update: {
          base_currency?: string
          created_at?: string
          fetched_at?: string
          id?: string
          rates?: Json
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
          budget_range: string | null
          buying_purpose: string | null
          created_at: string
          id: string
          interests: string[] | null
          message: string | null
          pre_approval_status: string | null
          preferred_contact: string | null
          property_id: string
          score: number | null
          search_context: Json | null
          status: string | null
          timeframe: string | null
          urgency: string | null
          user_email: string
          user_id: string | null
          user_name: string
          user_phone: string | null
        }
        Insert: {
          agent_id: string
          budget_range?: string | null
          buying_purpose?: string | null
          created_at?: string
          id?: string
          interests?: string[] | null
          message?: string | null
          pre_approval_status?: string | null
          preferred_contact?: string | null
          property_id: string
          score?: number | null
          search_context?: Json | null
          status?: string | null
          timeframe?: string | null
          urgency?: string | null
          user_email: string
          user_id?: string | null
          user_name: string
          user_phone?: string | null
        }
        Update: {
          agent_id?: string
          budget_range?: string | null
          buying_purpose?: string | null
          created_at?: string
          id?: string
          interests?: string[] | null
          message?: string | null
          pre_approval_status?: string | null
          preferred_contact?: string | null
          property_id?: string
          score?: number | null
          search_context?: Json | null
          status?: string | null
          timeframe?: string | null
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
      listing_documents: {
        Row: {
          category: string
          created_at: string
          esign_sent_at: string | null
          esign_signed_at: string | null
          esign_status: string | null
          file_name: string
          file_size: number | null
          file_url: string
          id: string
          mime_type: string | null
          notes: string | null
          property_id: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          category?: string
          created_at?: string
          esign_sent_at?: string | null
          esign_signed_at?: string | null
          esign_status?: string | null
          file_name: string
          file_size?: number | null
          file_url: string
          id?: string
          mime_type?: string | null
          notes?: string | null
          property_id: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          category?: string
          created_at?: string
          esign_sent_at?: string | null
          esign_signed_at?: string | null
          esign_status?: string | null
          file_name?: string
          file_size?: number | null
          file_url?: string
          id?: string
          mime_type?: string | null
          notes?: string | null
          property_id?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      maintenance_jobs: {
        Row: {
          actual_cost: number | null
          agent_id: string
          assigned_phone: string | null
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          estimated_cost: number | null
          id: string
          priority: string
          property_id: string
          reported_by: string
          status: string
          tenancy_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          actual_cost?: number | null
          agent_id: string
          assigned_phone?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          estimated_cost?: number | null
          id?: string
          priority?: string
          property_id: string
          reported_by?: string
          status?: string
          tenancy_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          actual_cost?: number | null
          agent_id?: string
          assigned_phone?: string | null
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          estimated_cost?: number | null
          id?: string
          priority?: string
          property_id?: string
          reported_by?: string
          status?: string
          tenancy_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "maintenance_jobs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_jobs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_jobs_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancies"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          is_read: boolean
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          agent_id: string
          created_at: string
          id: string
          is_read: boolean
          lead_id: string | null
          message: string | null
          property_id: string | null
          title: string
          type: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          id?: string
          is_read?: boolean
          lead_id?: string | null
          message?: string | null
          property_id?: string | null
          title: string
          type?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          id?: string
          is_read?: boolean
          lead_id?: string | null
          message?: string | null
          property_id?: string | null
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      off_market_shares: {
        Row: {
          contacted_at: string | null
          created_at: string
          id: string
          is_network_wide: boolean
          property_id: string
          referral_split_pct: number
          shared_with_agent_id: string | null
          sharing_agent_id: string
          status: string
          trust_entry_id: string | null
          updated_at: string
        }
        Insert: {
          contacted_at?: string | null
          created_at?: string
          id?: string
          is_network_wide?: boolean
          property_id: string
          referral_split_pct?: number
          shared_with_agent_id?: string | null
          sharing_agent_id: string
          status?: string
          trust_entry_id?: string | null
          updated_at?: string
        }
        Update: {
          contacted_at?: string | null
          created_at?: string
          id?: string
          is_network_wide?: boolean
          property_id?: string
          referral_split_pct?: number
          shared_with_agent_id?: string | null
          sharing_agent_id?: string
          status?: string
          trust_entry_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "off_market_shares_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "off_market_shares_shared_with_agent_id_fkey"
            columns: ["shared_with_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "off_market_shares_sharing_agent_id_fkey"
            columns: ["sharing_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "off_market_shares_trust_entry_id_fkey"
            columns: ["trust_entry_id"]
            isOneToOne: false
            referencedRelation: "trust_transactions"
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
          phone: string | null
          preferred_language: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          preferred_language?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          phone?: string | null
          preferred_language?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          agency_authority: string | null
          agent_id: string | null
          agent_split_percent: number | null
          available_from: string | null
          baths: number
          beds: number
          bushfire_zone: boolean | null
          commission_rate: number | null
          contact_clicks: number
          council_rates_annual: number | null
          country: string
          created_at: string
          currency_code: string | null
          description: string | null
          estimated_value: string | null
          features: string[] | null
          flood_zone: boolean | null
          furnished: boolean | null
          id: string
          image_url: string | null
          images: string[] | null
          inspection_times: Json | null
          is_active: boolean
          land_size: number | null
          lat: number | null
          lease_term: string | null
          listed_date: string | null
          listing_type: string | null
          lng: number | null
          marketing_budget: number | null
          parking: number
          pets_allowed: boolean | null
          price: number
          price_formatted: string
          property_type: string | null
          rental_weekly: number | null
          rental_yield_pct: number | null
          sqm: number
          state: string
          status: string
          str_permitted: boolean | null
          strata_fees_quarterly: number | null
          suburb: string
          title: string
          updated_at: string
          vendor_email: string | null
          vendor_name: string | null
          views: number
          year_built: number | null
          zoning: string | null
        }
        Insert: {
          address: string
          agency_authority?: string | null
          agent_id?: string | null
          agent_split_percent?: number | null
          available_from?: string | null
          baths?: number
          beds?: number
          bushfire_zone?: boolean | null
          commission_rate?: number | null
          contact_clicks?: number
          council_rates_annual?: number | null
          country?: string
          created_at?: string
          currency_code?: string | null
          description?: string | null
          estimated_value?: string | null
          features?: string[] | null
          flood_zone?: boolean | null
          furnished?: boolean | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          inspection_times?: Json | null
          is_active?: boolean
          land_size?: number | null
          lat?: number | null
          lease_term?: string | null
          listed_date?: string | null
          listing_type?: string | null
          lng?: number | null
          marketing_budget?: number | null
          parking?: number
          pets_allowed?: boolean | null
          price: number
          price_formatted: string
          property_type?: string | null
          rental_weekly?: number | null
          rental_yield_pct?: number | null
          sqm?: number
          state: string
          status?: string
          str_permitted?: boolean | null
          strata_fees_quarterly?: number | null
          suburb: string
          title: string
          updated_at?: string
          vendor_email?: string | null
          vendor_name?: string | null
          views?: number
          year_built?: number | null
          zoning?: string | null
        }
        Update: {
          address?: string
          agency_authority?: string | null
          agent_id?: string | null
          agent_split_percent?: number | null
          available_from?: string | null
          baths?: number
          beds?: number
          bushfire_zone?: boolean | null
          commission_rate?: number | null
          contact_clicks?: number
          council_rates_annual?: number | null
          country?: string
          created_at?: string
          currency_code?: string | null
          description?: string | null
          estimated_value?: string | null
          features?: string[] | null
          flood_zone?: boolean | null
          furnished?: boolean | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          inspection_times?: Json | null
          is_active?: boolean
          land_size?: number | null
          lat?: number | null
          lease_term?: string | null
          listed_date?: string | null
          listing_type?: string | null
          lng?: number | null
          marketing_budget?: number | null
          parking?: number
          pets_allowed?: boolean | null
          price?: number
          price_formatted?: string
          property_type?: string | null
          rental_weekly?: number | null
          rental_yield_pct?: number | null
          sqm?: number
          state?: string
          status?: string
          str_permitted?: boolean | null
          strata_fees_quarterly?: number | null
          suburb?: string
          title?: string
          updated_at?: string
          vendor_email?: string | null
          vendor_name?: string | null
          views?: number
          year_built?: number | null
          zoning?: string | null
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
      rent_payments: {
        Row: {
          agent_id: string
          amount: number
          created_at: string
          id: string
          notes: string | null
          payment_date: string
          payment_method: string
          period_from: string
          period_to: string
          receipt_number: string
          status: string
          tenancy_id: string
        }
        Insert: {
          agent_id: string
          amount: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_date: string
          payment_method?: string
          period_from: string
          period_to: string
          receipt_number: string
          status?: string
          tenancy_id: string
        }
        Update: {
          agent_id?: string
          amount?: number
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string
          period_from?: string
          period_to?: string
          receipt_number?: string
          status?: string
          tenancy_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "rent_payments_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_payments_tenancy_id_fkey"
            columns: ["tenancy_id"]
            isOneToOne: false
            referencedRelation: "tenancies"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_applications: {
        Row: {
          agent_id: string | null
          annual_income: number | null
          created_at: string
          current_address: string
          date_of_birth: string
          email: string
          employer_name: string | null
          employment_length: string | null
          employment_status: string
          full_name: string
          id: string
          identity_document_type: string | null
          identity_document_url: string | null
          message_to_landlord: string | null
          phone: string
          previous_address: string | null
          previous_landlord_contact: string | null
          previous_landlord_name: string | null
          property_id: string
          reason_for_leaving: string | null
          reference_number: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          agent_id?: string | null
          annual_income?: number | null
          created_at?: string
          current_address: string
          date_of_birth: string
          email: string
          employer_name?: string | null
          employment_length?: string | null
          employment_status: string
          full_name: string
          id?: string
          identity_document_type?: string | null
          identity_document_url?: string | null
          message_to_landlord?: string | null
          phone: string
          previous_address?: string | null
          previous_landlord_contact?: string | null
          previous_landlord_name?: string | null
          property_id: string
          reason_for_leaving?: string | null
          reference_number: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          agent_id?: string | null
          annual_income?: number | null
          created_at?: string
          current_address?: string
          date_of_birth?: string
          email?: string
          employer_name?: string | null
          employment_length?: string | null
          employment_status?: string
          full_name?: string
          id?: string
          identity_document_type?: string | null
          identity_document_url?: string | null
          message_to_landlord?: string | null
          phone?: string
          previous_address?: string | null
          previous_landlord_contact?: string | null
          previous_landlord_name?: string | null
          property_id?: string
          reason_for_leaving?: string | null
          reference_number?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "rental_applications_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_applications_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
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
      saved_search_alerts: {
        Row: {
          center_lat: number | null
          center_lng: number | null
          created_at: string
          filters: Json
          id: string
          is_active: boolean
          label: string
          last_alerted_at: string | null
          radius: number | null
          search_query: string
          updated_at: string
          user_id: string
        }
        Insert: {
          center_lat?: number | null
          center_lng?: number | null
          created_at?: string
          filters?: Json
          id?: string
          is_active?: boolean
          label?: string
          last_alerted_at?: string | null
          radius?: number | null
          search_query?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          center_lat?: number | null
          center_lng?: number | null
          created_at?: string
          filters?: Json
          id?: string
          is_active?: boolean
          label?: string
          last_alerted_at?: string | null
          radius?: number | null
          search_query?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      suburb_price_history: {
        Row: {
          beds: number
          created_at: string
          id: string
          median_rent_weekly: number | null
          median_sale_price: number | null
          month: string
          property_type: string
          sample_size: number | null
          state: string
          suburb: string
        }
        Insert: {
          beds?: number
          created_at?: string
          id?: string
          median_rent_weekly?: number | null
          median_sale_price?: number | null
          month: string
          property_type?: string
          sample_size?: number | null
          state: string
          suburb: string
        }
        Update: {
          beds?: number
          created_at?: string
          id?: string
          median_rent_weekly?: number | null
          median_sale_price?: number | null
          month?: string
          property_type?: string
          sample_size?: number | null
          state?: string
          suburb?: string
        }
        Relationships: []
      }
      suburb_stats: {
        Row: {
          beds: number
          created_at: string
          id: string
          median_rent_weekly: number | null
          median_sale_price: number | null
          period: string
          property_type: string
          recorded_at: string
          rent_trend_pct: number | null
          sale_trend_pct: number | null
          sample_size: number | null
          state: string
          suburb: string
          updated_at: string
        }
        Insert: {
          beds?: number
          created_at?: string
          id?: string
          median_rent_weekly?: number | null
          median_sale_price?: number | null
          period?: string
          property_type?: string
          recorded_at?: string
          rent_trend_pct?: number | null
          sale_trend_pct?: number | null
          sample_size?: number | null
          state: string
          suburb: string
          updated_at?: string
        }
        Update: {
          beds?: number
          created_at?: string
          id?: string
          median_rent_weekly?: number | null
          median_sale_price?: number | null
          period?: string
          property_type?: string
          recorded_at?: string
          rent_trend_pct?: number | null
          sale_trend_pct?: number | null
          sample_size?: number | null
          state?: string
          suburb?: string
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          description: string | null
          due_date: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          office_id: string | null
          priority: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          office_id?: string | null
          priority?: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          description?: string | null
          due_date?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          office_id?: string | null
          priority?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      tenancies: {
        Row: {
          agent_id: string
          bond_amount: number
          bond_authority: string | null
          bond_lodgement_number: string | null
          created_at: string
          id: string
          lease_end: string
          lease_start: string
          management_fee_percent: number
          notes: string | null
          owner_account_number: string | null
          owner_bsb: string | null
          owner_email: string | null
          owner_name: string | null
          property_id: string
          rent_amount: number
          rent_frequency: string
          status: string
          tenant_contact_id: string | null
          tenant_email: string | null
          tenant_name: string
          tenant_phone: string | null
          updated_at: string
        }
        Insert: {
          agent_id: string
          bond_amount: number
          bond_authority?: string | null
          bond_lodgement_number?: string | null
          created_at?: string
          id?: string
          lease_end: string
          lease_start: string
          management_fee_percent?: number
          notes?: string | null
          owner_account_number?: string | null
          owner_bsb?: string | null
          owner_email?: string | null
          owner_name?: string | null
          property_id: string
          rent_amount: number
          rent_frequency?: string
          status?: string
          tenant_contact_id?: string | null
          tenant_email?: string | null
          tenant_name: string
          tenant_phone?: string | null
          updated_at?: string
        }
        Update: {
          agent_id?: string
          bond_amount?: number
          bond_authority?: string | null
          bond_lodgement_number?: string | null
          created_at?: string
          id?: string
          lease_end?: string
          lease_start?: string
          management_fee_percent?: number
          notes?: string | null
          owner_account_number?: string | null
          owner_bsb?: string | null
          owner_email?: string | null
          owner_name?: string | null
          property_id?: string
          rent_amount?: number
          rent_frequency?: string
          status?: string
          tenant_contact_id?: string | null
          tenant_email?: string | null
          tenant_name?: string
          tenant_phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenancies_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancies_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancies_tenant_contact_id_fkey"
            columns: ["tenant_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          agent_id: string | null
          amount: number
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          gst_amount: number
          id: string
          office_id: string | null
          property_id: string | null
          reference: string | null
          status: string
          transaction_date: string
          type: string
          updated_at: string
        }
        Insert: {
          agent_id?: string | null
          amount?: number
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          gst_amount?: number
          id?: string
          office_id?: string | null
          property_id?: string | null
          reference?: string | null
          status?: string
          transaction_date?: string
          type?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string | null
          amount?: number
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          gst_amount?: number
          id?: string
          office_id?: string | null
          property_id?: string | null
          reference?: string | null
          status?: string
          transaction_date?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_office_id_fkey"
            columns: ["office_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_account_balances: {
        Row: {
          agent_id: string
          created_at: string
          current_balance: number
          id: string
          last_reconciled_date: string | null
          opening_balance: number
          updated_at: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          current_balance?: number
          id?: string
          last_reconciled_date?: string | null
          opening_balance?: number
          updated_at?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          current_balance?: number
          id?: string
          last_reconciled_date?: string | null
          opening_balance?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trust_account_balances_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_accounts: {
        Row: {
          account_name: string
          account_number: string | null
          account_type: string
          agency_id: string | null
          agent_id: string | null
          balance: number
          bank_name: string | null
          bsb: string | null
          created_at: string
          id: string
          is_active: boolean
          updated_at: string
        }
        Insert: {
          account_name: string
          account_number?: string | null
          account_type?: string
          agency_id?: string | null
          agent_id?: string | null
          balance?: number
          bank_name?: string | null
          bsb?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Update: {
          account_name?: string
          account_number?: string | null
          account_type?: string
          agency_id?: string | null
          agent_id?: string | null
          balance?: number
          bank_name?: string | null
          bsb?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trust_accounts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_accounts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_payments: {
        Row: {
          account_number: string | null
          agent_id: string
          amount: number
          bsb: string | null
          client_name: string
          created_at: string
          date_paid: string
          id: string
          payee_name: string | null
          payment_method: string
          payment_number: string
          property_address: string
          purpose: string
          reference: string | null
          status: string
        }
        Insert: {
          account_number?: string | null
          agent_id: string
          amount?: number
          bsb?: string | null
          client_name: string
          created_at?: string
          date_paid?: string
          id?: string
          payee_name?: string | null
          payment_method?: string
          payment_number: string
          property_address: string
          purpose?: string
          reference?: string | null
          status?: string
        }
        Update: {
          account_number?: string | null
          agent_id?: string
          amount?: number
          bsb?: string | null
          client_name?: string
          created_at?: string
          date_paid?: string
          id?: string
          payee_name?: string | null
          payment_method?: string
          payment_number?: string
          property_address?: string
          purpose?: string
          reference?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "trust_payments_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_receipts: {
        Row: {
          agent_id: string
          amount: number
          client_name: string
          created_at: string
          date_deposited: string | null
          date_received: string
          id: string
          ledger_account: string | null
          payment_method: string
          property_address: string
          purpose: string
          receipt_number: string
          status: string
        }
        Insert: {
          agent_id: string
          amount?: number
          client_name: string
          created_at?: string
          date_deposited?: string | null
          date_received?: string
          id?: string
          ledger_account?: string | null
          payment_method?: string
          property_address: string
          purpose?: string
          receipt_number: string
          status?: string
        }
        Update: {
          agent_id?: string
          amount?: number
          client_name?: string
          created_at?: string
          date_deposited?: string | null
          date_received?: string
          id?: string
          ledger_account?: string | null
          payment_method?: string
          property_address?: string
          purpose?: string
          receipt_number?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "trust_receipts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_reconciliations: {
        Row: {
          agent_id: string
          amount: number
          bank_balance: number
          bank_date: string
          created_at: string
          description: string | null
          id: string
          matched_payment_id: string | null
          matched_receipt_id: string | null
          status: string
        }
        Insert: {
          agent_id: string
          amount?: number
          bank_balance?: number
          bank_date: string
          created_at?: string
          description?: string | null
          id?: string
          matched_payment_id?: string | null
          matched_receipt_id?: string | null
          status?: string
        }
        Update: {
          agent_id?: string
          amount?: number
          bank_balance?: number
          bank_date?: string
          created_at?: string
          description?: string | null
          id?: string
          matched_payment_id?: string | null
          matched_receipt_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "trust_reconciliations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_reconciliations_matched_payment_id_fkey"
            columns: ["matched_payment_id"]
            isOneToOne: false
            referencedRelation: "trust_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_reconciliations_matched_receipt_id_fkey"
            columns: ["matched_receipt_id"]
            isOneToOne: false
            referencedRelation: "trust_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_transactions: {
        Row: {
          aba_exported: boolean
          aba_exported_at: string | null
          amount: number
          category: string
          contact_id: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          gst_amount: number
          id: string
          invoice_number: string | null
          payee_name: string | null
          property_id: string | null
          receipt_number: string | null
          reconciled_at: string | null
          reconciled_by: string | null
          reference: string | null
          status: string
          transaction_date: string
          transaction_type: string
          trust_account_id: string
          updated_at: string
        }
        Insert: {
          aba_exported?: boolean
          aba_exported_at?: string | null
          amount?: number
          category?: string
          contact_id?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          gst_amount?: number
          id?: string
          invoice_number?: string | null
          payee_name?: string | null
          property_id?: string | null
          receipt_number?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reference?: string | null
          status?: string
          transaction_date?: string
          transaction_type?: string
          trust_account_id: string
          updated_at?: string
        }
        Update: {
          aba_exported?: boolean
          aba_exported_at?: string | null
          amount?: number
          category?: string
          contact_id?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          gst_amount?: number
          id?: string
          invoice_number?: string | null
          payee_name?: string | null
          property_id?: string | null
          receipt_number?: string | null
          reconciled_at?: string | null
          reconciled_by?: string | null
          reference?: string | null
          status?: string
          transaction_date?: string
          transaction_type?: string
          trust_account_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trust_transactions_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_transactions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_transactions_trust_account_id_fkey"
            columns: ["trust_account_id"]
            isOneToOne: false
            referencedRelation: "trust_accounts"
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
      vendor_reports: {
        Row: {
          agent_id: string
          days_on_market_at_send: number
          enquiries_at_send: number
          hot_leads_at_send: number
          id: string
          property_id: string
          sent_at: string
          vendor_email: string
          vendor_name: string
          views_at_send: number
        }
        Insert: {
          agent_id: string
          days_on_market_at_send?: number
          enquiries_at_send?: number
          hot_leads_at_send?: number
          id?: string
          property_id: string
          sent_at?: string
          vendor_email: string
          vendor_name: string
          views_at_send?: number
        }
        Update: {
          agent_id?: string
          days_on_market_at_send?: number
          enquiries_at_send?: number
          hot_leads_at_send?: number
          id?: string
          property_id?: string
          sent_at?: string
          vendor_email?: string
          vendor_name?: string
          views_at_send?: number
        }
        Relationships: [
          {
            foreignKeyName: "vendor_reports_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_reports_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
        ]
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
      get_suburb_rental_stats: {
        Args: {
          _beds?: number
          _property_type?: string
          _state: string
          _suburb: string
        }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_agency_member: {
        Args: { _agency_id: string; _user_id: string }
        Returns: boolean
      }
      is_agency_owner_or_admin: {
        Args: { _agency_id: string; _user_id: string }
        Returns: boolean
      }
      is_agency_principal: {
        Args: { _agency_id: string; _user_id: string }
        Returns: boolean
      }
      nearby_properties: {
        Args: {
          _lat: number
          _limit?: number
          _lng: number
          _radius_km?: number
        }
        Returns: {
          address: string
          agency_authority: string | null
          agent_id: string | null
          agent_split_percent: number | null
          available_from: string | null
          baths: number
          beds: number
          bushfire_zone: boolean | null
          commission_rate: number | null
          contact_clicks: number
          council_rates_annual: number | null
          country: string
          created_at: string
          currency_code: string | null
          description: string | null
          estimated_value: string | null
          features: string[] | null
          flood_zone: boolean | null
          furnished: boolean | null
          id: string
          image_url: string | null
          images: string[] | null
          inspection_times: Json | null
          is_active: boolean
          land_size: number | null
          lat: number | null
          lease_term: string | null
          listed_date: string | null
          listing_type: string | null
          lng: number | null
          marketing_budget: number | null
          parking: number
          pets_allowed: boolean | null
          price: number
          price_formatted: string
          property_type: string | null
          rental_weekly: number | null
          rental_yield_pct: number | null
          sqm: number
          state: string
          status: string
          str_permitted: boolean | null
          strata_fees_quarterly: number | null
          suburb: string
          title: string
          updated_at: string
          vendor_email: string | null
          vendor_name: string | null
          views: number
          year_built: number | null
          zoning: string | null
        }[]
        SetofOptions: {
          from: "*"
          to: "properties"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      agency_member_role: "owner" | "admin" | "agent" | "principal"
      app_role: "user" | "agent" | "admin" | "principal" | "property_manager"
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
      agency_member_role: ["owner", "admin", "agent", "principal"],
      app_role: ["user", "agent", "admin", "principal", "property_manager"],
    },
  },
} as const
