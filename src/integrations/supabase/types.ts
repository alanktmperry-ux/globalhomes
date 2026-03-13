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
          auto_renew: boolean | null
          created_at: string
          featured_remaining: number
          id: string
          listing_limit: number
          payment_method: Json | null
          plan_type: string
          subscription_end: string | null
          subscription_start: string
          updated_at: string
        }
        Insert: {
          agent_id: string
          auto_renew?: boolean | null
          created_at?: string
          featured_remaining?: number
          id?: string
          listing_limit?: number
          payment_method?: Json | null
          plan_type?: string
          subscription_end?: string | null
          subscription_start?: string
          updated_at?: string
        }
        Update: {
          agent_id?: string
          auto_renew?: boolean | null
          created_at?: string
          featured_remaining?: number
          id?: string
          listing_limit?: number
          payment_method?: Json | null
          plan_type?: string
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
          id: string
          is_approved: boolean | null
          is_subscribed: boolean
          languages_spoken: string[] | null
          license_number: string | null
          name: string
          office_address: string | null
          phone: string | null
          profile_photo_url: string | null
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
          id?: string
          is_approved?: boolean | null
          is_subscribed?: boolean
          languages_spoken?: string[] | null
          license_number?: string | null
          name: string
          office_address?: string | null
          phone?: string | null
          profile_photo_url?: string | null
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
          id?: string
          is_approved?: boolean | null
          is_subscribed?: boolean
          languages_spoken?: string[] | null
          license_number?: string | null
          name?: string
          office_address?: string | null
          phone?: string | null
          profile_photo_url?: string | null
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
          baths: number
          beds: number
          commission_rate: number | null
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
          land_size: number | null
          lat: number | null
          listed_date: string | null
          lng: number | null
          marketing_budget: number | null
          parking: number
          price: number
          price_formatted: string
          property_type: string | null
          sqm: number
          state: string
          status: string
          suburb: string
          title: string
          updated_at: string
          views: number
        }
        Insert: {
          address: string
          agency_authority?: string | null
          agent_id?: string | null
          agent_split_percent?: number | null
          baths?: number
          beds?: number
          commission_rate?: number | null
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
          land_size?: number | null
          lat?: number | null
          listed_date?: string | null
          lng?: number | null
          marketing_budget?: number | null
          parking?: number
          price: number
          price_formatted: string
          property_type?: string | null
          sqm?: number
          state: string
          status?: string
          suburb: string
          title: string
          updated_at?: string
          views?: number
        }
        Update: {
          address?: string
          agency_authority?: string | null
          agent_id?: string | null
          agent_split_percent?: number | null
          baths?: number
          beds?: number
          commission_rate?: number | null
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
          land_size?: number | null
          lat?: number | null
          listed_date?: string | null
          lng?: number | null
          marketing_budget?: number | null
          parking?: number
          price?: number
          price_formatted?: string
          property_type?: string | null
          sqm?: number
          state?: string
          status?: string
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
