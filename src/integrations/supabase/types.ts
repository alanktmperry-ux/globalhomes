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
          abn: string | null
          address: string | null
          banner_url: string | null
          created_at: string
          description: string | null
          email: string | null
          founded_year: number | null
          id: string
          license_number: string | null
          logo_url: string | null
          name: string
          owner_user_id: string
          phone: string | null
          postcode: string | null
          slug: string
          social_facebook: string | null
          social_instagram: string | null
          social_linkedin: string | null
          state: string | null
          suburb: string | null
          updated_at: string
          verified: boolean | null
          website: string | null
        }
        Insert: {
          abn?: string | null
          address?: string | null
          banner_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          founded_year?: number | null
          id?: string
          license_number?: string | null
          logo_url?: string | null
          name: string
          owner_user_id: string
          phone?: string | null
          postcode?: string | null
          slug: string
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          state?: string | null
          suburb?: string | null
          updated_at?: string
          verified?: boolean | null
          website?: string | null
        }
        Update: {
          abn?: string | null
          address?: string | null
          banner_url?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          founded_year?: number | null
          id?: string
          license_number?: string | null
          logo_url?: string | null
          name?: string
          owner_user_id?: string
          phone?: string | null
          postcode?: string | null
          slug?: string
          social_facebook?: string | null
          social_instagram?: string | null
          social_linkedin?: string | null
          state?: string | null
          suburb?: string | null
          updated_at?: string
          verified?: boolean | null
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
          {
            foreignKeyName: "agent_credentials_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_credentials_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_lifecycle_notes: {
        Row: {
          agent_id: string
          author_name: string
          created_at: string
          id: string
          note: string
        }
        Insert: {
          agent_id: string
          author_name?: string
          created_at?: string
          id?: string
          note: string
        }
        Update: {
          agent_id?: string
          author_name?: string
          created_at?: string
          id?: string
          note?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_lifecycle_notes_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_lifecycle_notes_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_lifecycle_notes_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
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
          {
            foreignKeyName: "agent_locations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_locations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_performance_stats: {
        Row: {
          active_listings: number | null
          agent_id: string
          avg_days_to_sale: number | null
          avg_rating: number | null
          avg_response_hours: number | null
          avg_sale_vs_guide: number | null
          calculated_at: string | null
          enquiry_to_inspection: number | null
          inspection_to_offer: number | null
          responded_count: number | null
          response_rate: number | null
          review_count: number | null
          sold_listings: number | null
          total_enquiries: number | null
          total_listings: number | null
        }
        Insert: {
          active_listings?: number | null
          agent_id: string
          avg_days_to_sale?: number | null
          avg_rating?: number | null
          avg_response_hours?: number | null
          avg_sale_vs_guide?: number | null
          calculated_at?: string | null
          enquiry_to_inspection?: number | null
          inspection_to_offer?: number | null
          responded_count?: number | null
          response_rate?: number | null
          review_count?: number | null
          sold_listings?: number | null
          total_enquiries?: number | null
          total_listings?: number | null
        }
        Update: {
          active_listings?: number | null
          agent_id?: string
          avg_days_to_sale?: number | null
          avg_rating?: number | null
          avg_response_hours?: number | null
          avg_sale_vs_guide?: number | null
          calculated_at?: string | null
          enquiry_to_inspection?: number | null
          inspection_to_offer?: number | null
          responded_count?: number | null
          response_rate?: number | null
          review_count?: number | null
          sold_listings?: number | null
          total_enquiries?: number | null
          total_listings?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_performance_stats_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_performance_stats_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_performance_stats_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "agents_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_reviews: {
        Row: {
          agent_id: string
          created_at: string
          helpful_count: number | null
          id: string
          rating: number
          relationship: string
          replied_at: string | null
          reply_text: string | null
          review_text: string
          review_type: string | null
          reviewer_email: string | null
          reviewer_name: string
          status: string
          submitted_by: string | null
          suburb: string | null
          title: string | null
          verified: boolean | null
          year_of_service: number | null
        }
        Insert: {
          agent_id: string
          created_at?: string
          helpful_count?: number | null
          id?: string
          rating: number
          relationship?: string
          replied_at?: string | null
          reply_text?: string | null
          review_text: string
          review_type?: string | null
          reviewer_email?: string | null
          reviewer_name: string
          status?: string
          submitted_by?: string | null
          suburb?: string | null
          title?: string | null
          verified?: boolean | null
          year_of_service?: number | null
        }
        Update: {
          agent_id?: string
          created_at?: string
          helpful_count?: number | null
          id?: string
          rating?: number
          relationship?: string
          replied_at?: string | null
          reply_text?: string | null
          review_text?: string
          review_type?: string | null
          reviewer_email?: string | null
          reviewer_name?: string
          status?: string
          submitted_by?: string | null
          suburb?: string | null
          title?: string | null
          verified?: boolean | null
          year_of_service?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agent_reviews_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_reviews_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_reviews_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
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
          {
            foreignKeyName: "agent_subscriptions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_subscriptions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: true
            referencedRelation: "agents_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      agent_suppliers: {
        Row: {
          agent_id: string
          company_name: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          service_type: string
          supplier_name: string
        }
        Insert: {
          agent_id: string
          company_name?: string | null
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          service_type?: string
          supplier_name: string
        }
        Update: {
          agent_id?: string
          company_name?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          service_type?: string
          supplier_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_suppliers_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_suppliers_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_suppliers_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          agency: string | null
          agency_id: string | null
          aml_ctf_acknowledged: boolean | null
          avatar_url: string | null
          avg_rating: number | null
          bio: string | null
          company_logo_url: string | null
          created_at: string
          email: string | null
          founding_member: boolean | null
          handles_trust_accounting: boolean | null
          headline: string | null
          id: string
          instagram_url: string | null
          investment_niche: string | null
          is_approved: boolean | null
          is_demo: boolean
          is_public_profile: boolean | null
          is_subscribed: boolean
          languages_spoken: string[] | null
          last_compliance_check_at: string | null
          lead_source: string | null
          licence_expiry_date: string | null
          license_number: string | null
          lifecycle_stage: string | null
          linkedin_url: string | null
          name: string
          office_address: string | null
          onboarding_complete: boolean | null
          phone: string | null
          profile_banner_url: string | null
          profile_photo_url: string | null
          profile_views: number | null
          rating: number | null
          review_count: number | null
          service_areas: string[] | null
          slug: string | null
          social_links: Json | null
          specialization: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_expires_at: string | null
          support_pin: string | null
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
          aml_ctf_acknowledged?: boolean | null
          avatar_url?: string | null
          avg_rating?: number | null
          bio?: string | null
          company_logo_url?: string | null
          created_at?: string
          email?: string | null
          founding_member?: boolean | null
          handles_trust_accounting?: boolean | null
          headline?: string | null
          id?: string
          instagram_url?: string | null
          investment_niche?: string | null
          is_approved?: boolean | null
          is_demo?: boolean
          is_public_profile?: boolean | null
          is_subscribed?: boolean
          languages_spoken?: string[] | null
          last_compliance_check_at?: string | null
          lead_source?: string | null
          licence_expiry_date?: string | null
          license_number?: string | null
          lifecycle_stage?: string | null
          linkedin_url?: string | null
          name: string
          office_address?: string | null
          onboarding_complete?: boolean | null
          phone?: string | null
          profile_banner_url?: string | null
          profile_photo_url?: string | null
          profile_views?: number | null
          rating?: number | null
          review_count?: number | null
          service_areas?: string[] | null
          slug?: string | null
          social_links?: Json | null
          specialization?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_expires_at?: string | null
          support_pin?: string | null
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
          aml_ctf_acknowledged?: boolean | null
          avatar_url?: string | null
          avg_rating?: number | null
          bio?: string | null
          company_logo_url?: string | null
          created_at?: string
          email?: string | null
          founding_member?: boolean | null
          handles_trust_accounting?: boolean | null
          headline?: string | null
          id?: string
          instagram_url?: string | null
          investment_niche?: string | null
          is_approved?: boolean | null
          is_demo?: boolean
          is_public_profile?: boolean | null
          is_subscribed?: boolean
          languages_spoken?: string[] | null
          last_compliance_check_at?: string | null
          lead_source?: string | null
          licence_expiry_date?: string | null
          license_number?: string | null
          lifecycle_stage?: string | null
          linkedin_url?: string | null
          name?: string
          office_address?: string | null
          onboarding_complete?: boolean | null
          phone?: string | null
          profile_banner_url?: string | null
          profile_photo_url?: string | null
          profile_views?: number | null
          rating?: number | null
          review_count?: number | null
          service_areas?: string[] | null
          slug?: string | null
          social_links?: Json | null
          specialization?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_expires_at?: string | null
          support_pin?: string | null
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
      alert_sends: {
        Row: {
          alert_type: string
          id: string
          property_id: string
          saved_search_id: string | null
          sent_at: string
        }
        Insert: {
          alert_type: string
          id?: string
          property_id: string
          saved_search_id?: string | null
          sent_at?: string
        }
        Update: {
          alert_type?: string
          id?: string
          property_id?: string
          saved_search_id?: string | null
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alert_sends_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "listings_translation_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_sends_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_sends_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alert_sends_saved_search_id_fkey"
            columns: ["saved_search_id"]
            isOneToOne: false
            referencedRelation: "saved_searches"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          agent_id: string | null
          created_at: string
          event_name: string
          id: string
          listing_id: string | null
          properties: Json | null
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          event_name: string
          id?: string
          listing_id?: string | null
          properties?: Json | null
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          event_name?: string
          id?: string
          listing_id?: string | null
          properties?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings_translation_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "properties_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      auction_bidder_registrations: {
        Row: {
          address: string | null
          approved_at: string | null
          approved_by: string | null
          attended: boolean | null
          attending_online: boolean
          auction_id: string
          company_name: string | null
          created_at: string
          deposit_ready: boolean
          email: string
          full_name: string
          has_finance_approval: boolean
          id: string
          id_expiry: string | null
          id_number: string
          id_type: Database["public"]["Enums"]["id_type"]
          id_verified: boolean
          id_verified_at: string | null
          id_verified_by: string | null
          is_approved: boolean
          is_buying_for_self: boolean
          paddle_number: number
          phone: string
          profile_id: string | null
          registration_notes: string | null
          solicitor_firm: string | null
          solicitor_name: string | null
          solicitor_phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          approved_at?: string | null
          approved_by?: string | null
          attended?: boolean | null
          attending_online?: boolean
          auction_id: string
          company_name?: string | null
          created_at?: string
          deposit_ready?: boolean
          email: string
          full_name: string
          has_finance_approval?: boolean
          id?: string
          id_expiry?: string | null
          id_number?: string
          id_type?: Database["public"]["Enums"]["id_type"]
          id_verified?: boolean
          id_verified_at?: string | null
          id_verified_by?: string | null
          is_approved?: boolean
          is_buying_for_self?: boolean
          paddle_number?: number
          phone: string
          profile_id?: string | null
          registration_notes?: string | null
          solicitor_firm?: string | null
          solicitor_name?: string | null
          solicitor_phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          approved_at?: string | null
          approved_by?: string | null
          attended?: boolean | null
          attending_online?: boolean
          auction_id?: string
          company_name?: string | null
          created_at?: string
          deposit_ready?: boolean
          email?: string
          full_name?: string
          has_finance_approval?: boolean
          id?: string
          id_expiry?: string | null
          id_number?: string
          id_type?: Database["public"]["Enums"]["id_type"]
          id_verified?: boolean
          id_verified_at?: string | null
          id_verified_by?: string | null
          is_approved?: boolean
          is_buying_for_self?: boolean
          paddle_number?: number
          phone?: string
          profile_id?: string | null
          registration_notes?: string | null
          solicitor_firm?: string | null
          solicitor_name?: string | null
          solicitor_phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "auction_bidder_registrations_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_bidder_registrations_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_bidder_registrations_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_bidder_registrations_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_bidder_registrations_id_verified_by_fkey"
            columns: ["id_verified_by"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_bidder_registrations_id_verified_by_fkey"
            columns: ["id_verified_by"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_bidder_registrations_id_verified_by_fkey"
            columns: ["id_verified_by"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      auction_bids: {
        Row: {
          auction_id: string
          bid_amount: number
          bid_number: number
          bid_source: string
          bid_time: string
          bid_type: Database["public"]["Enums"]["bid_type"]
          created_at: string
          id: string
          is_winning: boolean
          notes: string | null
          recorded_by: string | null
          registration_id: string | null
          reserve_met_at_this_bid: boolean
        }
        Insert: {
          auction_id: string
          bid_amount: number
          bid_number: number
          bid_source?: string
          bid_time?: string
          bid_type?: Database["public"]["Enums"]["bid_type"]
          created_at?: string
          id?: string
          is_winning?: boolean
          notes?: string | null
          recorded_by?: string | null
          registration_id?: string | null
          reserve_met_at_this_bid?: boolean
        }
        Update: {
          auction_id?: string
          bid_amount?: number
          bid_number?: number
          bid_source?: string
          bid_time?: string
          bid_type?: Database["public"]["Enums"]["bid_type"]
          created_at?: string
          id?: string
          is_winning?: boolean
          notes?: string | null
          recorded_by?: string | null
          registration_id?: string | null
          reserve_met_at_this_bid?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "auction_bids_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_bids_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_bids_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_bids_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_bids_registration_id_fkey"
            columns: ["registration_id"]
            isOneToOne: false
            referencedRelation: "auction_bidder_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      auction_registrations: {
        Row: {
          attended: boolean | null
          bid_amount: number | null
          email: string
          id: string
          name: string
          phone: string | null
          property_id: string | null
          registered_at: string | null
          user_id: string | null
        }
        Insert: {
          attended?: boolean | null
          bid_amount?: number | null
          email: string
          id?: string
          name: string
          phone?: string | null
          property_id?: string | null
          registered_at?: string | null
          user_id?: string | null
        }
        Update: {
          attended?: boolean | null
          bid_amount?: number | null
          email?: string
          id?: string
          name?: string
          phone?: string | null
          property_id?: string | null
          registered_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auction_registrations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "listings_translation_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_registrations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_registrations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      auction_result_records: {
        Row: {
          active_bidders: number
          auction_id: string
          auctioneer_notes: string | null
          cooling_off_waived: boolean
          deposit_paid: boolean | null
          id: string
          opening_bid: number | null
          outcome: Database["public"]["Enums"]["auction_status"]
          passed_in_price: number | null
          property_id: string
          published_to_portal: boolean
          recorded_at: string
          recorded_by: string | null
          registered_bidders: number
          reserve_price: number | null
          settlement_date: string | null
          sold_price: number | null
          sold_under_hammer: boolean | null
          total_bids: number
          vendor_first_right_buyer_id: string | null
          winning_registration_id: string | null
        }
        Insert: {
          active_bidders?: number
          auction_id: string
          auctioneer_notes?: string | null
          cooling_off_waived?: boolean
          deposit_paid?: boolean | null
          id?: string
          opening_bid?: number | null
          outcome: Database["public"]["Enums"]["auction_status"]
          passed_in_price?: number | null
          property_id: string
          published_to_portal?: boolean
          recorded_at?: string
          recorded_by?: string | null
          registered_bidders?: number
          reserve_price?: number | null
          settlement_date?: string | null
          sold_price?: number | null
          sold_under_hammer?: boolean | null
          total_bids?: number
          vendor_first_right_buyer_id?: string | null
          winning_registration_id?: string | null
        }
        Update: {
          active_bidders?: number
          auction_id?: string
          auctioneer_notes?: string | null
          cooling_off_waived?: boolean
          deposit_paid?: boolean | null
          id?: string
          opening_bid?: number | null
          outcome?: Database["public"]["Enums"]["auction_status"]
          passed_in_price?: number | null
          property_id?: string
          published_to_portal?: boolean
          recorded_at?: string
          recorded_by?: string | null
          registered_bidders?: number
          reserve_price?: number | null
          settlement_date?: string | null
          sold_price?: number | null
          sold_under_hammer?: boolean | null
          total_bids?: number
          vendor_first_right_buyer_id?: string | null
          winning_registration_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auction_result_records_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: true
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_result_records_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "listings_translation_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_result_records_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_result_records_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_result_records_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_result_records_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_result_records_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_result_records_vendor_first_right_buyer_id_fkey"
            columns: ["vendor_first_right_buyer_id"]
            isOneToOne: false
            referencedRelation: "auction_bidder_registrations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_result_records_winning_registration_id_fkey"
            columns: ["winning_registration_id"]
            isOneToOne: false
            referencedRelation: "auction_bidder_registrations"
            referencedColumns: ["id"]
          },
        ]
      }
      auction_results: {
        Row: {
          auction_date: string | null
          id: string
          num_bidders: number | null
          property_id: string | null
          recorded_at: string | null
          recorded_by: string | null
          reserve_met: boolean | null
          result: string
          sold_price: number | null
        }
        Insert: {
          auction_date?: string | null
          id?: string
          num_bidders?: number | null
          property_id?: string | null
          recorded_at?: string | null
          recorded_by?: string | null
          reserve_met?: boolean | null
          result: string
          sold_price?: number | null
        }
        Update: {
          auction_date?: string | null
          id?: string
          num_bidders?: number | null
          property_id?: string | null
          recorded_at?: string | null
          recorded_by?: string | null
          reserve_met?: boolean | null
          result?: string
          sold_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "auction_results_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "listings_translation_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_results_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_results_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      auction_updates: {
        Row: {
          auction_id: string
          bid_amount: number | null
          created_at: string
          id: string
          message: string
          paddle_number: number | null
          recorded_by: string | null
          update_type: string
        }
        Insert: {
          auction_id: string
          bid_amount?: number | null
          created_at?: string
          id?: string
          message: string
          paddle_number?: number | null
          recorded_by?: string | null
          update_type: string
        }
        Update: {
          auction_id?: string
          bid_amount?: number | null
          created_at?: string
          id?: string
          message?: string
          paddle_number?: number | null
          recorded_by?: string | null
          update_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "auction_updates_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_updates_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_updates_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_updates_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      auctions: {
        Row: {
          agent_id: string
          auction_date: string
          auction_location: string
          auction_time: string
          auction_timezone: string
          auctioneer_firm: string | null
          auctioneer_licence: string | null
          auctioneer_name: string | null
          cooling_off_waived: boolean
          created_at: string
          id: string
          is_online: boolean
          last_bid_amount: number | null
          notes: string | null
          online_platform_url: string | null
          opening_bid: number | null
          passed_in_price: number | null
          property_id: string
          reserve_met: boolean | null
          reserve_price: number | null
          sold_at: string | null
          sold_price: number | null
          status: Database["public"]["Enums"]["auction_status"]
          total_active_bidders: number
          total_bids: number
          total_registered: number
          updated_at: string
          vendor_bid_limit: number | null
        }
        Insert: {
          agent_id: string
          auction_date: string
          auction_location?: string
          auction_time?: string
          auction_timezone?: string
          auctioneer_firm?: string | null
          auctioneer_licence?: string | null
          auctioneer_name?: string | null
          cooling_off_waived?: boolean
          created_at?: string
          id?: string
          is_online?: boolean
          last_bid_amount?: number | null
          notes?: string | null
          online_platform_url?: string | null
          opening_bid?: number | null
          passed_in_price?: number | null
          property_id: string
          reserve_met?: boolean | null
          reserve_price?: number | null
          sold_at?: string | null
          sold_price?: number | null
          status?: Database["public"]["Enums"]["auction_status"]
          total_active_bidders?: number
          total_bids?: number
          total_registered?: number
          updated_at?: string
          vendor_bid_limit?: number | null
        }
        Update: {
          agent_id?: string
          auction_date?: string
          auction_location?: string
          auction_time?: string
          auction_timezone?: string
          auctioneer_firm?: string | null
          auctioneer_licence?: string | null
          auctioneer_name?: string | null
          cooling_off_waived?: boolean
          created_at?: string
          id?: string
          is_online?: boolean
          last_bid_amount?: number | null
          notes?: string | null
          online_platform_url?: string | null
          opening_bid?: number | null
          passed_in_price?: number | null
          property_id?: string
          reserve_met?: boolean | null
          reserve_price?: number | null
          sold_at?: string | null
          sold_price?: number | null
          status?: Database["public"]["Enums"]["auction_status"]
          total_active_bidders?: number
          total_bids?: number
          total_registered?: number
          updated_at?: string
          vendor_bid_limit?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "auctions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auctions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auctions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auctions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "listings_translation_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auctions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auctions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      broadcast_campaigns: {
        Row: {
          audience: string
          body: string
          created_at: string
          created_by: string | null
          id: string
          recipient_count: number | null
          send_method: string
          sent_at: string | null
          sent_count: number | null
          status: string
          subject: string
          title: string
        }
        Insert: {
          audience: string
          body: string
          created_at?: string
          created_by?: string | null
          id?: string
          recipient_count?: number | null
          send_method: string
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          subject: string
          title: string
        }
        Update: {
          audience?: string
          body?: string
          created_at?: string
          created_by?: string | null
          id?: string
          recipient_count?: number | null
          send_method?: string
          sent_at?: string | null
          sent_count?: number | null
          status?: string
          subject?: string
          title?: string
        }
        Relationships: []
      }
      broker_leads: {
        Row: {
          broker_email: string
          broker_id: string | null
          broker_name: string
          buyer_email: string
          buyer_message: string | null
          buyer_name: string
          buyer_phone: string | null
          created_at: string
          id: string
          invoice_amount: number | null
          invoice_month: string | null
          invoiced_at: string | null
          is_duplicate: boolean
          is_qualified: boolean
          property_address: string | null
          property_id: string | null
          property_price: string | null
        }
        Insert: {
          broker_email?: string
          broker_id?: string | null
          broker_name?: string
          buyer_email: string
          buyer_message?: string | null
          buyer_name: string
          buyer_phone?: string | null
          created_at?: string
          id?: string
          invoice_amount?: number | null
          invoice_month?: string | null
          invoiced_at?: string | null
          is_duplicate?: boolean
          is_qualified?: boolean
          property_address?: string | null
          property_id?: string | null
          property_price?: string | null
        }
        Update: {
          broker_email?: string
          broker_id?: string | null
          broker_name?: string
          buyer_email?: string
          buyer_message?: string | null
          buyer_name?: string
          buyer_phone?: string | null
          created_at?: string
          id?: string
          invoice_amount?: number | null
          invoice_month?: string | null
          invoiced_at?: string | null
          is_duplicate?: boolean
          is_qualified?: boolean
          property_address?: string | null
          property_id?: string | null
          property_price?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "broker_leads_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broker_leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "listings_translation_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broker_leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "broker_leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      brokers: {
        Row: {
          acl_number: string
          auth_user_id: string | null
          calendar_url: string | null
          cap_expires_at: string | null
          company: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          is_founding_partner: boolean
          languages: string[]
          lead_fee_aud: number
          monthly_cap_aud: number | null
          name: string
          phone: string | null
          photo_url: string | null
          tagline: string | null
        }
        Insert: {
          acl_number: string
          auth_user_id?: string | null
          calendar_url?: string | null
          cap_expires_at?: string | null
          company?: string | null
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          is_founding_partner?: boolean
          languages?: string[]
          lead_fee_aud?: number
          monthly_cap_aud?: number | null
          name: string
          phone?: string | null
          photo_url?: string | null
          tagline?: string | null
        }
        Update: {
          acl_number?: string
          auth_user_id?: string | null
          calendar_url?: string | null
          cap_expires_at?: string | null
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          is_founding_partner?: boolean
          languages?: string[]
          lead_fee_aud?: number
          monthly_cap_aud?: number | null
          name?: string
          phone?: string | null
          photo_url?: string | null
          tagline?: string | null
        }
        Relationships: []
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
          {
            foreignKeyName: "buyer_briefs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "buyer_briefs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      buyer_language_preferences: {
        Row: {
          created_at: string
          id: string
          preferred_language: string | null
          session_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          preferred_language?: string | null
          session_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          preferred_language?: string | null
          session_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      buyer_pre_approvals: {
        Row: {
          approved_amount: number | null
          document_type: string
          document_url: string
          expiry_date: string | null
          id: string
          issue_date: string | null
          lender_name: string | null
          rejection_reason: string | null
          reviewer_note: string | null
          status: string
          submitted_at: string | null
          updated_at: string | null
          user_id: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          approved_amount?: number | null
          document_type?: string
          document_url: string
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          lender_name?: string | null
          rejection_reason?: string | null
          reviewer_note?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string | null
          user_id: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          approved_amount?: number | null
          document_type?: string
          document_url?: string
          expiry_date?: string | null
          id?: string
          issue_date?: string | null
          lender_name?: string | null
          rejection_reason?: string | null
          reviewer_note?: string | null
          status?: string
          submitted_at?: string | null
          updated_at?: string | null
          user_id?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: []
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
      cma_reports: {
        Row: {
          agent_commentary: string | null
          agent_id: string
          agent_recommended_method: string | null
          agent_recommended_price: number | null
          created_at: string
          estimated_price_high: number | null
          estimated_price_low: number | null
          estimated_price_mid: number | null
          id: string
          is_shared: boolean
          months_back: number
          prepared_for_email: string | null
          property_id: string | null
          radius_km: number
          report_title: string
          selected_comparable_ids: string[]
          share_token: string | null
          shared_at: string | null
          subject_address: string
          subject_bathrooms: number | null
          subject_bedrooms: number | null
          subject_car_spaces: number | null
          subject_land_sqm: number | null
          subject_postcode: string
          subject_property_type: string
          subject_state: string
          subject_suburb: string
          updated_at: string
          vendor_name: string | null
          view_count: number
          viewed_at: string | null
        }
        Insert: {
          agent_commentary?: string | null
          agent_id: string
          agent_recommended_method?: string | null
          agent_recommended_price?: number | null
          created_at?: string
          estimated_price_high?: number | null
          estimated_price_low?: number | null
          estimated_price_mid?: number | null
          id?: string
          is_shared?: boolean
          months_back?: number
          prepared_for_email?: string | null
          property_id?: string | null
          radius_km?: number
          report_title?: string
          selected_comparable_ids?: string[]
          share_token?: string | null
          shared_at?: string | null
          subject_address: string
          subject_bathrooms?: number | null
          subject_bedrooms?: number | null
          subject_car_spaces?: number | null
          subject_land_sqm?: number | null
          subject_postcode?: string
          subject_property_type?: string
          subject_state: string
          subject_suburb: string
          updated_at?: string
          vendor_name?: string | null
          view_count?: number
          viewed_at?: string | null
        }
        Update: {
          agent_commentary?: string | null
          agent_id?: string
          agent_recommended_method?: string | null
          agent_recommended_price?: number | null
          created_at?: string
          estimated_price_high?: number | null
          estimated_price_low?: number | null
          estimated_price_mid?: number | null
          id?: string
          is_shared?: boolean
          months_back?: number
          prepared_for_email?: string | null
          property_id?: string | null
          radius_km?: number
          report_title?: string
          selected_comparable_ids?: string[]
          share_token?: string | null
          shared_at?: string | null
          subject_address?: string
          subject_bathrooms?: number | null
          subject_bedrooms?: number | null
          subject_car_spaces?: number | null
          subject_land_sqm?: number | null
          subject_postcode?: string
          subject_property_type?: string
          subject_state?: string
          subject_suburb?: string
          updated_at?: string
          vendor_name?: string | null
          view_count?: number
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cma_reports_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cma_reports_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cma_reports_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cma_reports_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "listings_translation_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cma_reports_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cma_reports_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public_safe"
            referencedColumns: ["id"]
          },
        ]
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
            referencedRelation: "listings_translation_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collab_reactions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collab_reactions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public_safe"
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
            referencedRelation: "listings_translation_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collab_sessions_selected_property_id_fkey"
            columns: ["selected_property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collab_sessions_selected_property_id_fkey"
            columns: ["selected_property_id"]
            isOneToOne: false
            referencedRelation: "properties_public_safe"
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
            referencedRelation: "listings_translation_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collab_views_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collab_views_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public_safe"
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
      comparable_sales: {
        Row: {
          address: string
          agency_name: string | null
          agent_id: string | null
          auction_clearance: boolean | null
          bathrooms: number | null
          bedrooms: number | null
          car_spaces: number | null
          created_at: string
          days_on_market: number | null
          discount_pct: number | null
          double_garage: boolean | null
          floor_area_sqm: number | null
          id: string
          is_corner_block: boolean | null
          is_public: boolean
          is_verified: boolean
          land_size_sqm: number | null
          latitude: number | null
          longitude: number | null
          pool: boolean | null
          postcode: string
          price_per_sqm: number | null
          prior_price: number | null
          property_id: string | null
          property_type: string
          sale_method: string
          sold_date: string
          sold_price: number
          source: string
          state: string
          suburb: string
          updated_at: string
          year_built: number | null
        }
        Insert: {
          address: string
          agency_name?: string | null
          agent_id?: string | null
          auction_clearance?: boolean | null
          bathrooms?: number | null
          bedrooms?: number | null
          car_spaces?: number | null
          created_at?: string
          days_on_market?: number | null
          discount_pct?: number | null
          double_garage?: boolean | null
          floor_area_sqm?: number | null
          id?: string
          is_corner_block?: boolean | null
          is_public?: boolean
          is_verified?: boolean
          land_size_sqm?: number | null
          latitude?: number | null
          longitude?: number | null
          pool?: boolean | null
          postcode?: string
          price_per_sqm?: number | null
          prior_price?: number | null
          property_id?: string | null
          property_type?: string
          sale_method?: string
          sold_date: string
          sold_price: number
          source?: string
          state: string
          suburb: string
          updated_at?: string
          year_built?: number | null
        }
        Update: {
          address?: string
          agency_name?: string | null
          agent_id?: string | null
          auction_clearance?: boolean | null
          bathrooms?: number | null
          bedrooms?: number | null
          car_spaces?: number | null
          created_at?: string
          days_on_market?: number | null
          discount_pct?: number | null
          double_garage?: boolean | null
          floor_area_sqm?: number | null
          id?: string
          is_corner_block?: boolean | null
          is_public?: boolean
          is_verified?: boolean
          land_size_sqm?: number | null
          latitude?: number | null
          longitude?: number | null
          pool?: boolean | null
          postcode?: string
          price_per_sqm?: number | null
          prior_price?: number | null
          property_id?: string | null
          property_type?: string
          sale_method?: string
          sold_date?: string
          sold_price?: number
          source?: string
          state?: string
          suburb?: string
          updated_at?: string
          year_built?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "comparable_sales_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comparable_sales_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comparable_sales_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comparable_sales_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "listings_translation_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comparable_sales_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comparable_sales_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      consumer_profiles: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          buying_situation: string
          created_at: string
          email: string
          id: string
          is_purchasable: boolean | null
          lead_score: number | null
          min_bedrooms: number | null
          name: string
          preferred_suburbs: string[] | null
          preferred_type: string | null
          purchase_price: number | null
          purchased_at: string | null
          purchased_by: string | null
          search_count: number | null
          trigger_query: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          buying_situation?: string
          created_at?: string
          email: string
          id?: string
          is_purchasable?: boolean | null
          lead_score?: number | null
          min_bedrooms?: number | null
          name: string
          preferred_suburbs?: string[] | null
          preferred_type?: string | null
          purchase_price?: number | null
          purchased_at?: string | null
          purchased_by?: string | null
          search_count?: number | null
          trigger_query?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          buying_situation?: string
          created_at?: string
          email?: string
          id?: string
          is_purchasable?: boolean | null
          lead_score?: number | null
          min_bedrooms?: number | null
          name?: string
          preferred_suburbs?: string[] | null
          preferred_type?: string | null
          purchase_price?: number | null
          purchased_at?: string | null
          purchased_by?: string | null
          search_count?: number | null
          trigger_query?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "consumer_profiles_purchased_by_fkey"
            columns: ["purchased_by"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumer_profiles_purchased_by_fkey"
            columns: ["purchased_by"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "consumer_profiles_purchased_by_fkey"
            columns: ["purchased_by"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
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
          {
            foreignKeyName: "contacts_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contacts_assigned_agent_id_fkey"
            columns: ["assigned_agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          id: string
          joined_at: string | null
          last_read_at: string | null
          unread_count: number
          user_id: string
        }
        Insert: {
          conversation_id: string
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          unread_count?: number
          user_id: string
        }
        Update: {
          conversation_id?: string
          id?: string
          joined_at?: string | null
          last_read_at?: string | null
          unread_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
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
          last_message_text: string | null
          lead_id: string | null
          participant_1: string
          participant_2: string
          property_id: string | null
          title: string | null
          type: string | null
        }
        Insert: {
          archived_by?: string[] | null
          created_at?: string
          id?: string
          last_message_at?: string
          last_message_text?: string | null
          lead_id?: string | null
          participant_1: string
          participant_2: string
          property_id?: string | null
          title?: string | null
          type?: string | null
        }
        Update: {
          archived_by?: string[] | null
          created_at?: string
          id?: string
          last_message_at?: string
          last_message_text?: string | null
          lead_id?: string | null
          participant_1?: string
          participant_2?: string
          property_id?: string | null
          title?: string | null
          type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "conversations_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "listings_translation_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_activities: {
        Row: {
          agent_id: string
          body: string
          completed: boolean
          created_at: string
          due_at: string | null
          id: string
          lead_id: string
          subject: string | null
          type: string
        }
        Insert: {
          agent_id: string
          body: string
          completed?: boolean
          created_at?: string
          due_at?: string | null
          id?: string
          lead_id: string
          subject?: string | null
          type: string
        }
        Update: {
          agent_id?: string
          body?: string
          completed?: boolean
          created_at?: string
          due_at?: string | null
          id?: string
          lead_id?: string
          subject?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_leads: {
        Row: {
          agent_id: string
          budget_max: number | null
          budget_min: number | null
          buyer_id: string | null
          created_at: string
          email: string | null
          expected_close: string | null
          first_name: string
          id: string
          last_contacted: string | null
          last_name: string | null
          lost_reason: string | null
          notes: string | null
          phone: string | null
          pre_approval_amount: number | null
          pre_approved: boolean | null
          priority: string
          property_id: string | null
          source: string
          stage: string
          tags: string[] | null
          updated_at: string
        }
        Insert: {
          agent_id: string
          budget_max?: number | null
          budget_min?: number | null
          buyer_id?: string | null
          created_at?: string
          email?: string | null
          expected_close?: string | null
          first_name: string
          id?: string
          last_contacted?: string | null
          last_name?: string | null
          lost_reason?: string | null
          notes?: string | null
          phone?: string | null
          pre_approval_amount?: number | null
          pre_approved?: boolean | null
          priority?: string
          property_id?: string | null
          source?: string
          stage?: string
          tags?: string[] | null
          updated_at?: string
        }
        Update: {
          agent_id?: string
          budget_max?: number | null
          budget_min?: number | null
          buyer_id?: string | null
          created_at?: string
          email?: string | null
          expected_close?: string | null
          first_name?: string
          id?: string
          last_contacted?: string | null
          last_name?: string | null
          lost_reason?: string | null
          notes?: string | null
          phone?: string | null
          pre_approval_amount?: number | null
          pre_approved?: boolean | null
          priority?: string
          property_id?: string | null
          source?: string
          stage?: string
          tags?: string[] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "listings_translation_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "crm_leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      crm_tasks: {
        Row: {
          agent_id: string
          completed: boolean
          created_at: string
          due_at: string
          id: string
          lead_id: string
          title: string
        }
        Insert: {
          agent_id: string
          completed?: boolean
          created_at?: string
          due_at: string
          id?: string
          lead_id: string
          title: string
        }
        Update: {
          agent_id?: string
          completed?: boolean
          created_at?: string
          due_at?: string
          id?: string
          lead_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "crm_tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "crm_leads"
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
      document_categories: {
        Row: {
          description: string | null
          icon: string | null
          id: string
          label: string
          requires_nda: boolean | null
          slug: string
          sort_order: number | null
          visible_to: string[]
        }
        Insert: {
          description?: string | null
          icon?: string | null
          id?: string
          label: string
          requires_nda?: boolean | null
          slug: string
          sort_order?: number | null
          visible_to: string[]
        }
        Update: {
          description?: string | null
          icon?: string | null
          id?: string
          label?: string
          requires_nda?: boolean | null
          slug?: string
          sort_order?: number | null
          visible_to?: string[]
        }
        Relationships: []
      }
      document_downloads: {
        Row: {
          document_id: string
          downloaded_at: string
          downloaded_by: string | null
          id: string
          ip_hint: string | null
          session_id: string | null
        }
        Insert: {
          document_id: string
          downloaded_at?: string
          downloaded_by?: string | null
          id?: string
          ip_hint?: string | null
          session_id?: string | null
        }
        Update: {
          document_id?: string
          downloaded_at?: string
          downloaded_by?: string | null
          id?: string
          ip_hint?: string | null
          session_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_downloads_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "property_documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_requests: {
        Row: {
          category_slug: string | null
          created_at: string
          custom_label: string | null
          due_date: string | null
          fulfilled_at: string | null
          fulfilled_by_doc_id: string | null
          id: string
          message: string | null
          property_id: string
          requested_by: string
          requested_email: string | null
          requested_from: string | null
          status: string
        }
        Insert: {
          category_slug?: string | null
          created_at?: string
          custom_label?: string | null
          due_date?: string | null
          fulfilled_at?: string | null
          fulfilled_by_doc_id?: string | null
          id?: string
          message?: string | null
          property_id: string
          requested_by: string
          requested_email?: string | null
          requested_from?: string | null
          status?: string
        }
        Update: {
          category_slug?: string | null
          created_at?: string
          custom_label?: string | null
          due_date?: string | null
          fulfilled_at?: string | null
          fulfilled_by_doc_id?: string | null
          id?: string
          message?: string | null
          property_id?: string
          requested_by?: string
          requested_email?: string | null
          requested_from?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "document_requests_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "document_categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "document_requests_fulfilled_by_doc_id_fkey"
            columns: ["fulfilled_by_doc_id"]
            isOneToOne: false
            referencedRelation: "property_documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "listings_translation_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_requests_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      error_log: {
        Row: {
          context: Json | null
          created_at: string
          error_message: string
          error_stack: string | null
          function_name: string
          id: string
          severity: string
        }
        Insert: {
          context?: Json | null
          created_at?: string
          error_message: string
          error_stack?: string | null
          function_name: string
          id?: string
          severity?: string
        }
        Update: {
          context?: Json | null
          created_at?: string
          error_message?: string
          error_stack?: string | null
          function_name?: string
          id?: string
          severity?: string
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
      expressions_of_interest: {
        Row: {
          agent_notes: string | null
          buyer_id: string
          conditions: string | null
          cover_letter: string | null
          finance_status: string
          id: string
          offered_price: number
          property_id: string
          settlement_days: number | null
          status: string
          submitted_at: string
          updated_at: string
        }
        Insert: {
          agent_notes?: string | null
          buyer_id: string
          conditions?: string | null
          cover_letter?: string | null
          finance_status: string
          id?: string
          offered_price: number
          property_id: string
          settlement_days?: number | null
          status?: string
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          agent_notes?: string | null
          buyer_id?: string
          conditions?: string | null
          cover_letter?: string | null
          finance_status?: string
          id?: string
          offered_price?: number
          property_id?: string
          settlement_days?: number | null
          status?: string
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expressions_of_interest_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "listings_translation_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expressions_of_interest_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expressions_of_interest_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_request_upvotes: {
        Row: {
          agent_id: string
          created_at: string
          feature_request_id: string
          id: string
        }
        Insert: {
          agent_id: string
          created_at?: string
          feature_request_id: string
          id?: string
        }
        Update: {
          agent_id?: string
          created_at?: string
          feature_request_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feature_request_upvotes_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_request_upvotes_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_request_upvotes_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_request_upvotes_feature_request_id_fkey"
            columns: ["feature_request_id"]
            isOneToOne: false
            referencedRelation: "feature_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_requests: {
        Row: {
          admin_response: string | null
          agent_id: string | null
          category: string | null
          created_at: string
          description: string
          id: string
          status: string
          title: string
          updated_at: string
          upvote_count: number
        }
        Insert: {
          admin_response?: string | null
          agent_id?: string | null
          category?: string | null
          created_at?: string
          description: string
          id?: string
          status?: string
          title: string
          updated_at?: string
          upvote_count?: number
        }
        Update: {
          admin_response?: string | null
          agent_id?: string | null
          category?: string | null
          created_at?: string
          description?: string
          id?: string
          status?: string
          title?: string
          updated_at?: string
          upvote_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "feature_requests_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_requests_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feature_requests_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
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
            foreignKeyName: "lead_events_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_events_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "listings_translation_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_purchases: {
        Row: {
          agent_id: string
          contacted_at: string | null
          created_at: string
          followed_up: boolean | null
          id: string
          lead_id: string
          notes: string | null
          outcome: string | null
          price: number
          purchased_at: string
          status: string
          stripe_charge_id: string | null
        }
        Insert: {
          agent_id: string
          contacted_at?: string | null
          created_at?: string
          followed_up?: boolean | null
          id?: string
          lead_id: string
          notes?: string | null
          outcome?: string | null
          price?: number
          purchased_at?: string
          status?: string
          stripe_charge_id?: string | null
        }
        Update: {
          agent_id?: string
          contacted_at?: string | null
          created_at?: string
          followed_up?: boolean | null
          id?: string
          lead_id?: string
          notes?: string | null
          outcome?: string | null
          price?: number
          purchased_at?: string
          status?: string
          stripe_charge_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_purchases_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_purchases_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_purchases_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_purchases_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "consumer_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_purchases_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "consumer_profiles_browse"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_purchases_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "consumer_profiles_marketplace"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          agent_id: string
          archived_at: string | null
          budget_range: string | null
          buying_purpose: string | null
          created_at: string
          id: string
          interests: string[] | null
          message: string | null
          pre_approval_status: string | null
          preferred_contact: string | null
          property_id: string
          read: boolean | null
          score: number | null
          search_context: Json | null
          source: string | null
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
          archived_at?: string | null
          budget_range?: string | null
          buying_purpose?: string | null
          created_at?: string
          id?: string
          interests?: string[] | null
          message?: string | null
          pre_approval_status?: string | null
          preferred_contact?: string | null
          property_id: string
          read?: boolean | null
          score?: number | null
          search_context?: Json | null
          source?: string | null
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
          archived_at?: string | null
          budget_range?: string | null
          buying_purpose?: string | null
          created_at?: string
          id?: string
          interests?: string[] | null
          message?: string | null
          pre_approval_status?: string | null
          preferred_contact?: string | null
          property_id?: string
          read?: boolean | null
          score?: number | null
          search_context?: Json | null
          source?: string | null
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
            foreignKeyName: "leads_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "listings_translation_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public_safe"
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
            referencedRelation: "listings_translation_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public_safe"
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
            foreignKeyName: "maintenance_jobs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_jobs_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "maintenance_jobs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "listings_translation_summary"
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
            foreignKeyName: "maintenance_jobs_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public_safe"
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
      message_templates: {
        Row: {
          audience: string | null
          body: string
          category: string | null
          created_at: string
          id: string
          name: string
          subject: string
        }
        Insert: {
          audience?: string | null
          body: string
          category?: string | null
          created_at?: string
          id?: string
          name: string
          subject: string
        }
        Update: {
          audience?: string | null
          body?: string
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          subject?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          edited_at: string | null
          id: string
          is_read: boolean
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          edited_at?: string | null
          id?: string
          is_read?: boolean
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          edited_at?: string | null
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
            foreignKeyName: "notifications_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
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
            referencedRelation: "listings_translation_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public_safe"
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
            referencedRelation: "listings_translation_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "off_market_shares_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "off_market_shares_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public_safe"
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
            foreignKeyName: "off_market_shares_shared_with_agent_id_fkey"
            columns: ["shared_with_agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "off_market_shares_shared_with_agent_id_fkey"
            columns: ["shared_with_agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
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
            foreignKeyName: "off_market_shares_sharing_agent_id_fkey"
            columns: ["sharing_agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "off_market_shares_sharing_agent_id_fkey"
            columns: ["sharing_agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
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
      offers: {
        Row: {
          agent_id: string
          comparable_sales: Json | null
          conditions: string | null
          created_at: string
          draft_text: string | null
          id: string
          lead_id: string
          offer_amount: number
          property_id: string
          resolved_at: string | null
          sent_at: string | null
          settlement_days: number
          status: string
          suburb_median: number | null
          updated_at: string
        }
        Insert: {
          agent_id: string
          comparable_sales?: Json | null
          conditions?: string | null
          created_at?: string
          draft_text?: string | null
          id?: string
          lead_id: string
          offer_amount: number
          property_id: string
          resolved_at?: string | null
          sent_at?: string | null
          settlement_days?: number
          status?: string
          suburb_median?: number | null
          updated_at?: string
        }
        Update: {
          agent_id?: string
          comparable_sales?: Json | null
          conditions?: string | null
          created_at?: string
          draft_text?: string | null
          id?: string
          lead_id?: string
          offer_amount?: number
          property_id?: string
          resolved_at?: string | null
          sent_at?: string | null
          settlement_days?: number
          status?: string
          suburb_median?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "listings_translation_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      offmarket_subscriptions: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          max_price: number | null
          min_bedrooms: number | null
          min_price: number | null
          property_types: string[] | null
          state: string
          suburb: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          max_price?: number | null
          min_bedrooms?: number | null
          min_price?: number | null
          property_types?: string[] | null
          state: string
          suburb: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          max_price?: number | null
          min_bedrooms?: number | null
          min_price?: number | null
          property_types?: string[] | null
          state?: string
          suburb?: string
        }
        Relationships: []
      }
      open_home_registrations: {
        Row: {
          attended: boolean | null
          attended_at: string | null
          email: string
          id: string
          name: string
          on_waitlist: boolean | null
          open_home_id: string
          phone: string | null
          registered_at: string | null
          reminder_1h_sent: boolean | null
          reminder_24h_sent: boolean | null
          user_id: string | null
        }
        Insert: {
          attended?: boolean | null
          attended_at?: string | null
          email: string
          id?: string
          name: string
          on_waitlist?: boolean | null
          open_home_id: string
          phone?: string | null
          registered_at?: string | null
          reminder_1h_sent?: boolean | null
          reminder_24h_sent?: boolean | null
          user_id?: string | null
        }
        Update: {
          attended?: boolean | null
          attended_at?: string | null
          email?: string
          id?: string
          name?: string
          on_waitlist?: boolean | null
          open_home_id?: string
          phone?: string | null
          registered_at?: string | null
          reminder_1h_sent?: boolean | null
          reminder_24h_sent?: boolean | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "open_home_registrations_open_home_id_fkey"
            columns: ["open_home_id"]
            isOneToOne: false
            referencedRelation: "open_homes"
            referencedColumns: ["id"]
          },
        ]
      }
      open_homes: {
        Row: {
          agent_id: string
          created_at: string | null
          ends_at: string
          id: string
          max_attendees: number | null
          notes: string | null
          property_id: string
          qr_token: string | null
          starts_at: string
          status: string
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          ends_at: string
          id?: string
          max_attendees?: number | null
          notes?: string | null
          property_id: string
          qr_token?: string | null
          starts_at: string
          status?: string
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          ends_at?: string
          id?: string
          max_attendees?: number | null
          notes?: string | null
          property_id?: string
          qr_token?: string | null
          starts_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "open_homes_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "open_homes_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "open_homes_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "open_homes_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "listings_translation_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "open_homes_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "open_homes_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_agencies: {
        Row: {
          accepted_at: string | null
          access_level: string
          agency_id: string
          created_at: string
          id: string
          invite_expires_at: string | null
          invite_token: string | null
          invited_at: string
          invited_by_agent_id: string | null
          notes: string | null
          partner_id: string
          revoked_at: string | null
          revoked_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          access_level?: string
          agency_id: string
          created_at?: string
          id?: string
          invite_expires_at?: string | null
          invite_token?: string | null
          invited_at?: string
          invited_by_agent_id?: string | null
          notes?: string | null
          partner_id: string
          revoked_at?: string | null
          revoked_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          access_level?: string
          agency_id?: string
          created_at?: string
          id?: string
          invite_expires_at?: string | null
          invite_token?: string | null
          invited_at?: string
          invited_by_agent_id?: string | null
          notes?: string | null
          partner_id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_agencies_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_agencies_invited_by_agent_id_fkey"
            columns: ["invited_by_agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_agencies_invited_by_agent_id_fkey"
            columns: ["invited_by_agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_agencies_invited_by_agent_id_fkey"
            columns: ["invited_by_agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_agencies_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_members: {
        Row: {
          created_at: string
          id: string
          invite_expires_at: string | null
          invite_token: string | null
          invited_by: string | null
          joined_at: string | null
          partner_id: string
          role: Database["public"]["Enums"]["partner_member_role"]
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          invite_expires_at?: string | null
          invite_token?: string | null
          invited_by?: string | null
          joined_at?: string | null
          partner_id: string
          role?: Database["public"]["Enums"]["partner_member_role"]
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          invite_expires_at?: string | null
          invite_token?: string | null
          invited_by?: string | null
          joined_at?: string | null
          partner_id?: string
          role?: Database["public"]["Enums"]["partner_member_role"]
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "partner_members_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          abn: string | null
          company_name: string
          contact_email: string
          contact_name: string
          contact_phone: string | null
          created_at: string
          id: string
          is_verified: boolean
          logo_url: string | null
          notes: string | null
          updated_at: string
          user_id: string
          verified_at: string | null
          website: string | null
        }
        Insert: {
          abn?: string | null
          company_name: string
          contact_email: string
          contact_name: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean
          logo_url?: string | null
          notes?: string | null
          updated_at?: string
          user_id: string
          verified_at?: string | null
          website?: string | null
        }
        Update: {
          abn?: string | null
          company_name?: string
          contact_email?: string
          contact_name?: string
          contact_phone?: string | null
          created_at?: string
          id?: string
          is_verified?: boolean
          logo_url?: string | null
          notes?: string | null
          updated_at?: string
          user_id?: string
          verified_at?: string | null
          website?: string | null
        }
        Relationships: []
      }
      pre_auction_offers: {
        Row: {
          accepted_at: string | null
          auction_id: string
          buyer_email: string
          buyer_name: string
          buyer_phone: string | null
          buyer_profile_id: string | null
          buyer_solicitor: string | null
          conditions: string | null
          created_at: string
          deposit_amount: number | null
          expires_at: string
          id: string
          offer_amount: number
          property_id: string
          response_notes: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          settlement_date: string | null
          settlement_days: number
          status: Database["public"]["Enums"]["offer_status"]
          subject_to_building: boolean
          subject_to_finance: boolean
          submitted_at: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          auction_id: string
          buyer_email: string
          buyer_name: string
          buyer_phone?: string | null
          buyer_profile_id?: string | null
          buyer_solicitor?: string | null
          conditions?: string | null
          created_at?: string
          deposit_amount?: number | null
          expires_at?: string
          id?: string
          offer_amount: number
          property_id: string
          response_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          settlement_date?: string | null
          settlement_days?: number
          status?: Database["public"]["Enums"]["offer_status"]
          subject_to_building?: boolean
          subject_to_finance?: boolean
          submitted_at?: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          auction_id?: string
          buyer_email?: string
          buyer_name?: string
          buyer_phone?: string | null
          buyer_profile_id?: string | null
          buyer_solicitor?: string | null
          conditions?: string | null
          created_at?: string
          deposit_amount?: number | null
          expires_at?: string
          id?: string
          offer_amount?: number
          property_id?: string
          response_notes?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          settlement_date?: string | null
          settlement_days?: number
          status?: Database["public"]["Enums"]["offer_status"]
          subject_to_building?: boolean
          subject_to_finance?: boolean
          submitted_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pre_auction_offers_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_auction_offers_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "listings_translation_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_auction_offers_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_auction_offers_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_auction_offers_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_auction_offers_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pre_auction_offers_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      price_guide_history: {
        Row: {
          changed_at: string | null
          changed_by: string | null
          id: string
          note: string | null
          price_high: number | null
          price_low: number | null
          property_id: string | null
        }
        Insert: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          note?: string | null
          price_high?: number | null
          price_low?: number | null
          property_id?: string | null
        }
        Update: {
          changed_at?: string | null
          changed_by?: string | null
          id?: string
          note?: string | null
          price_high?: number | null
          price_low?: number | null
          property_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_guide_history_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "listings_translation_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_guide_history_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_guide_history_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          display_name: string | null
          full_name: string | null
          id: string
          onboarded: boolean | null
          onboarding_steps_completed: Json | null
          phone: string | null
          pre_approval_amount: number | null
          pre_approval_expiry: string | null
          pre_approval_lender: string | null
          pre_approval_verified: boolean | null
          preferred_language: string | null
          provider: string | null
          referral_code: string | null
          referred_by: string | null
          slug: string | null
          terms_accepted_at: string | null
          terms_version: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          id?: string
          onboarded?: boolean | null
          onboarding_steps_completed?: Json | null
          phone?: string | null
          pre_approval_amount?: number | null
          pre_approval_expiry?: string | null
          pre_approval_lender?: string | null
          pre_approval_verified?: boolean | null
          preferred_language?: string | null
          provider?: string | null
          referral_code?: string | null
          referred_by?: string | null
          slug?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          display_name?: string | null
          full_name?: string | null
          id?: string
          onboarded?: boolean | null
          onboarding_steps_completed?: Json | null
          phone?: string | null
          pre_approval_amount?: number | null
          pre_approval_expiry?: string | null
          pre_approval_lender?: string | null
          pre_approval_verified?: boolean | null
          preferred_language?: string | null
          provider?: string | null
          referral_code?: string | null
          referred_by?: string | null
          slug?: string | null
          terms_accepted_at?: string | null
          terms_version?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      properties: {
        Row: {
          address: string
          address_hidden: boolean
          agency_authority: string | null
          agent_id: string | null
          agent_insights: Json | null
          agent_split_percent: number | null
          air_con_type: string | null
          auction_date: string | null
          auction_time: string | null
          available_from: string | null
          baths: number
          beds: number
          bond_amount: number | null
          boost_expiry_warned: boolean
          boost_requested_at: string | null
          boost_requested_tier: string | null
          boost_tier: string | null
          bushfire_zone: boolean | null
          commission_rate: number | null
          contact_clicks: number
          council_rates_annual: number | null
          country: string
          cover_index: number | null
          created_at: string
          currency_code: string | null
          description: string | null
          electricity_included: boolean | null
          ensuites: number | null
          eoi_close_date: string | null
          eoi_guide_price: number | null
          estimated_value: string | null
          estimated_weekly_rent: number | null
          featured_until: string | null
          features: string[] | null
          flood_zone: boolean | null
          floor_area_sqm: number | null
          floor_plan_url: string | null
          furnished: boolean | null
          garage_type: string | null
          has_air_con: boolean | null
          has_alfresco: boolean | null
          has_balcony: boolean | null
          has_dishwasher: boolean | null
          has_gym_access: boolean | null
          has_internal_laundry: boolean | null
          has_outdoor_ent: boolean | null
          has_pool: boolean | null
          has_pool_access: boolean | null
          has_solar: boolean | null
          has_virtual_tour: boolean | null
          has_washing_machine: boolean | null
          heating_type: string | null
          id: string
          image_url: string | null
          images: string[] | null
          inspection_times: Json | null
          internet_included: boolean | null
          is_active: boolean
          is_featured: boolean
          is_new_build: boolean | null
          land_size: number | null
          land_size_sqm: number | null
          land_value: number | null
          lat: number | null
          lease_term: string | null
          listed_at: string | null
          listed_date: string | null
          listing_category: string
          listing_mode: string
          listing_status: string | null
          listing_type: string | null
          lng: number | null
          marketing_budget: number | null
          marketing_email_sent: boolean
          marketing_email_sent_at: string | null
          max_occupants: number | null
          min_lease_months: number | null
          off_market_reason: string | null
          parking: number
          parking_notes: string | null
          pets_allowed: boolean | null
          postcode: string | null
          price: number
          price_formatted: string
          price_guide_high: number | null
          price_guide_low: number | null
          price_per_sqm: number | null
          property_age_years: number | null
          property_type: string | null
          rental_parking_type: string | null
          rental_weekly: number | null
          rental_yield_pct: number | null
          slug: string | null
          smoking_allowed: boolean | null
          sold_at: string | null
          sold_price: number | null
          sqm: number
          state: string
          status: string
          str_permitted: boolean | null
          strata_fees_quarterly: number | null
          study_rooms: number | null
          suburb: string
          title: string
          translation_status: string | null
          translations: Json | null
          translations_generated_at: string | null
          updated_at: string
          utilities_included: string[] | null
          vendor_email: string | null
          vendor_id: string | null
          vendor_name: string | null
          vendor_phone: string | null
          video_url: string | null
          views: number
          virtual_tour_url: string | null
          water_included: boolean | null
          year_built: number | null
          zoning: string | null
        }
        Insert: {
          address: string
          address_hidden?: boolean
          agency_authority?: string | null
          agent_id?: string | null
          agent_insights?: Json | null
          agent_split_percent?: number | null
          air_con_type?: string | null
          auction_date?: string | null
          auction_time?: string | null
          available_from?: string | null
          baths?: number
          beds?: number
          bond_amount?: number | null
          boost_expiry_warned?: boolean
          boost_requested_at?: string | null
          boost_requested_tier?: string | null
          boost_tier?: string | null
          bushfire_zone?: boolean | null
          commission_rate?: number | null
          contact_clicks?: number
          council_rates_annual?: number | null
          country?: string
          cover_index?: number | null
          created_at?: string
          currency_code?: string | null
          description?: string | null
          electricity_included?: boolean | null
          ensuites?: number | null
          eoi_close_date?: string | null
          eoi_guide_price?: number | null
          estimated_value?: string | null
          estimated_weekly_rent?: number | null
          featured_until?: string | null
          features?: string[] | null
          flood_zone?: boolean | null
          floor_area_sqm?: number | null
          floor_plan_url?: string | null
          furnished?: boolean | null
          garage_type?: string | null
          has_air_con?: boolean | null
          has_alfresco?: boolean | null
          has_balcony?: boolean | null
          has_dishwasher?: boolean | null
          has_gym_access?: boolean | null
          has_internal_laundry?: boolean | null
          has_outdoor_ent?: boolean | null
          has_pool?: boolean | null
          has_pool_access?: boolean | null
          has_solar?: boolean | null
          has_virtual_tour?: boolean | null
          has_washing_machine?: boolean | null
          heating_type?: string | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          inspection_times?: Json | null
          internet_included?: boolean | null
          is_active?: boolean
          is_featured?: boolean
          is_new_build?: boolean | null
          land_size?: number | null
          land_size_sqm?: number | null
          land_value?: number | null
          lat?: number | null
          lease_term?: string | null
          listed_at?: string | null
          listed_date?: string | null
          listing_category?: string
          listing_mode?: string
          listing_status?: string | null
          listing_type?: string | null
          lng?: number | null
          marketing_budget?: number | null
          marketing_email_sent?: boolean
          marketing_email_sent_at?: string | null
          max_occupants?: number | null
          min_lease_months?: number | null
          off_market_reason?: string | null
          parking?: number
          parking_notes?: string | null
          pets_allowed?: boolean | null
          postcode?: string | null
          price: number
          price_formatted: string
          price_guide_high?: number | null
          price_guide_low?: number | null
          price_per_sqm?: number | null
          property_age_years?: number | null
          property_type?: string | null
          rental_parking_type?: string | null
          rental_weekly?: number | null
          rental_yield_pct?: number | null
          slug?: string | null
          smoking_allowed?: boolean | null
          sold_at?: string | null
          sold_price?: number | null
          sqm?: number
          state: string
          status?: string
          str_permitted?: boolean | null
          strata_fees_quarterly?: number | null
          study_rooms?: number | null
          suburb: string
          title: string
          translation_status?: string | null
          translations?: Json | null
          translations_generated_at?: string | null
          updated_at?: string
          utilities_included?: string[] | null
          vendor_email?: string | null
          vendor_id?: string | null
          vendor_name?: string | null
          vendor_phone?: string | null
          video_url?: string | null
          views?: number
          virtual_tour_url?: string | null
          water_included?: boolean | null
          year_built?: number | null
          zoning?: string | null
        }
        Update: {
          address?: string
          address_hidden?: boolean
          agency_authority?: string | null
          agent_id?: string | null
          agent_insights?: Json | null
          agent_split_percent?: number | null
          air_con_type?: string | null
          auction_date?: string | null
          auction_time?: string | null
          available_from?: string | null
          baths?: number
          beds?: number
          bond_amount?: number | null
          boost_expiry_warned?: boolean
          boost_requested_at?: string | null
          boost_requested_tier?: string | null
          boost_tier?: string | null
          bushfire_zone?: boolean | null
          commission_rate?: number | null
          contact_clicks?: number
          council_rates_annual?: number | null
          country?: string
          cover_index?: number | null
          created_at?: string
          currency_code?: string | null
          description?: string | null
          electricity_included?: boolean | null
          ensuites?: number | null
          eoi_close_date?: string | null
          eoi_guide_price?: number | null
          estimated_value?: string | null
          estimated_weekly_rent?: number | null
          featured_until?: string | null
          features?: string[] | null
          flood_zone?: boolean | null
          floor_area_sqm?: number | null
          floor_plan_url?: string | null
          furnished?: boolean | null
          garage_type?: string | null
          has_air_con?: boolean | null
          has_alfresco?: boolean | null
          has_balcony?: boolean | null
          has_dishwasher?: boolean | null
          has_gym_access?: boolean | null
          has_internal_laundry?: boolean | null
          has_outdoor_ent?: boolean | null
          has_pool?: boolean | null
          has_pool_access?: boolean | null
          has_solar?: boolean | null
          has_virtual_tour?: boolean | null
          has_washing_machine?: boolean | null
          heating_type?: string | null
          id?: string
          image_url?: string | null
          images?: string[] | null
          inspection_times?: Json | null
          internet_included?: boolean | null
          is_active?: boolean
          is_featured?: boolean
          is_new_build?: boolean | null
          land_size?: number | null
          land_size_sqm?: number | null
          land_value?: number | null
          lat?: number | null
          lease_term?: string | null
          listed_at?: string | null
          listed_date?: string | null
          listing_category?: string
          listing_mode?: string
          listing_status?: string | null
          listing_type?: string | null
          lng?: number | null
          marketing_budget?: number | null
          marketing_email_sent?: boolean
          marketing_email_sent_at?: string | null
          max_occupants?: number | null
          min_lease_months?: number | null
          off_market_reason?: string | null
          parking?: number
          parking_notes?: string | null
          pets_allowed?: boolean | null
          postcode?: string | null
          price?: number
          price_formatted?: string
          price_guide_high?: number | null
          price_guide_low?: number | null
          price_per_sqm?: number | null
          property_age_years?: number | null
          property_type?: string | null
          rental_parking_type?: string | null
          rental_weekly?: number | null
          rental_yield_pct?: number | null
          slug?: string | null
          smoking_allowed?: boolean | null
          sold_at?: string | null
          sold_price?: number | null
          sqm?: number
          state?: string
          status?: string
          str_permitted?: boolean | null
          strata_fees_quarterly?: number | null
          study_rooms?: number | null
          suburb?: string
          title?: string
          translation_status?: string | null
          translations?: Json | null
          translations_generated_at?: string | null
          updated_at?: string
          utilities_included?: string[] | null
          vendor_email?: string | null
          vendor_id?: string | null
          vendor_name?: string | null
          vendor_phone?: string | null
          video_url?: string | null
          views?: number
          virtual_tour_url?: string | null
          water_included?: boolean | null
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
          {
            foreignKeyName: "fk_properties_agent"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_properties_agent"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      property_daily_stats: {
        Row: {
          enquiries: number | null
          id: string
          property_id: string
          saves: number | null
          stat_date: string
          unique_views: number | null
          views: number | null
        }
        Insert: {
          enquiries?: number | null
          id?: string
          property_id: string
          saves?: number | null
          stat_date: string
          unique_views?: number | null
          views?: number | null
        }
        Update: {
          enquiries?: number | null
          id?: string
          property_id?: string
          saves?: number | null
          stat_date?: string
          unique_views?: number | null
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "property_daily_stats_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "listings_translation_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_daily_stats_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_daily_stats_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      property_documents: {
        Row: {
          access_level: string
          category_slug: string
          created_at: string
          description: string | null
          download_count: number | null
          expires_at: string | null
          file_name: string
          file_path: string
          file_size_bytes: number | null
          id: string
          is_current: boolean | null
          label: string | null
          mime_type: string | null
          property_id: string
          signed: boolean | null
          signed_at: string | null
          signed_by: string | null
          updated_at: string
          uploaded_by: string
          uploader_role: string
          version: number | null
          visible_to_roles: string[] | null
        }
        Insert: {
          access_level?: string
          category_slug: string
          created_at?: string
          description?: string | null
          download_count?: number | null
          expires_at?: string | null
          file_name: string
          file_path: string
          file_size_bytes?: number | null
          id?: string
          is_current?: boolean | null
          label?: string | null
          mime_type?: string | null
          property_id: string
          signed?: boolean | null
          signed_at?: string | null
          signed_by?: string | null
          updated_at?: string
          uploaded_by: string
          uploader_role: string
          version?: number | null
          visible_to_roles?: string[] | null
        }
        Update: {
          access_level?: string
          category_slug?: string
          created_at?: string
          description?: string | null
          download_count?: number | null
          expires_at?: string | null
          file_name?: string
          file_path?: string
          file_size_bytes?: number | null
          id?: string
          is_current?: boolean | null
          label?: string | null
          mime_type?: string | null
          property_id?: string
          signed?: boolean | null
          signed_at?: string | null
          signed_by?: string | null
          updated_at?: string
          uploaded_by?: string
          uploader_role?: string
          version?: number | null
          visible_to_roles?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "property_documents_category_slug_fkey"
            columns: ["category_slug"]
            isOneToOne: false
            referencedRelation: "document_categories"
            referencedColumns: ["slug"]
          },
          {
            foreignKeyName: "property_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "listings_translation_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_documents_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      property_price_changes: {
        Row: {
          change_pct: number | null
          changed_at: string
          id: string
          new_price: number | null
          old_price: number | null
          property_id: string
        }
        Insert: {
          change_pct?: number | null
          changed_at?: string
          id?: string
          new_price?: number | null
          old_price?: number | null
          property_id: string
        }
        Update: {
          change_pct?: number | null
          changed_at?: string
          id?: string
          new_price?: number | null
          old_price?: number | null
          property_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "property_price_changes_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "listings_translation_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_price_changes_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_price_changes_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      property_schools: {
        Row: {
          distance_km: number | null
          id: string
          in_catchment: boolean | null
          property_id: string | null
          school_id: string | null
        }
        Insert: {
          distance_km?: number | null
          id?: string
          in_catchment?: boolean | null
          property_id?: string | null
          school_id?: string | null
        }
        Update: {
          distance_km?: number | null
          id?: string
          in_catchment?: boolean | null
          property_id?: string | null
          school_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_schools_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "listings_translation_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_schools_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_schools_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_schools_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      property_view_events: {
        Row: {
          device_type: string | null
          duration_sec: number | null
          id: string
          property_id: string
          referrer: string | null
          session_id: string | null
          source: string | null
          viewed_at: string
          viewer_id: string | null
        }
        Insert: {
          device_type?: string | null
          duration_sec?: number | null
          id?: string
          property_id: string
          referrer?: string | null
          session_id?: string | null
          source?: string | null
          viewed_at?: string
          viewer_id?: string | null
        }
        Update: {
          device_type?: string | null
          duration_sec?: number | null
          id?: string
          property_id?: string
          referrer?: string | null
          session_id?: string | null
          source?: string | null
          viewed_at?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "property_view_events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "listings_translation_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_view_events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "property_view_events_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      rent_payments: {
        Row: {
          agent_id: string
          amount: number
          application_id: string | null
          created_at: string
          id: string
          is_arrears: boolean | null
          notes: string | null
          payment_date: string
          payment_method: string
          period_from: string
          period_to: string
          property_id: string | null
          receipt_number: string
          reference: string | null
          status: string
          tenancy_id: string
        }
        Insert: {
          agent_id: string
          amount: number
          application_id?: string | null
          created_at?: string
          id?: string
          is_arrears?: boolean | null
          notes?: string | null
          payment_date: string
          payment_method?: string
          period_from: string
          period_to: string
          property_id?: string | null
          receipt_number: string
          reference?: string | null
          status?: string
          tenancy_id: string
        }
        Update: {
          agent_id?: string
          amount?: number
          application_id?: string | null
          created_at?: string
          id?: string
          is_arrears?: boolean | null
          notes?: string | null
          payment_date?: string
          payment_method?: string
          period_from?: string
          period_to?: string
          property_id?: string | null
          receipt_number?: string
          reference?: string | null
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
            foreignKeyName: "rent_payments_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_payments_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_payments_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "rental_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_payments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "listings_translation_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_payments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rent_payments_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public_safe"
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
          additional_notes: string | null
          agent_id: string | null
          annual_income: number | null
          applicant_id: string | null
          bond_amount: number | null
          bond_collected_at: string | null
          bond_lodged_at: string | null
          bond_lodgement_ref: string | null
          co_applicants: Json | null
          created_at: string
          current_address: string
          date_of_birth: string
          email: string
          employer_name: string | null
          employment_length: string | null
          employment_status: string
          full_name: string
          has_pets: boolean | null
          id: string
          identity_document_type: string | null
          identity_document_url: string | null
          income_verified: boolean | null
          lease_term_months: number | null
          message_to_landlord: string | null
          move_in_date: string | null
          occupants: number | null
          pet_description: string | null
          phone: string
          pm_notes: string | null
          previous_address: string | null
          previous_landlord_contact: string | null
          previous_landlord_name: string | null
          property_id: string
          reason_for_leaving: string | null
          reference_number: string
          status: string
          submitted_at: string | null
          time_at_address: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          additional_notes?: string | null
          agent_id?: string | null
          annual_income?: number | null
          applicant_id?: string | null
          bond_amount?: number | null
          bond_collected_at?: string | null
          bond_lodged_at?: string | null
          bond_lodgement_ref?: string | null
          co_applicants?: Json | null
          created_at?: string
          current_address: string
          date_of_birth: string
          email: string
          employer_name?: string | null
          employment_length?: string | null
          employment_status: string
          full_name: string
          has_pets?: boolean | null
          id?: string
          identity_document_type?: string | null
          identity_document_url?: string | null
          income_verified?: boolean | null
          lease_term_months?: number | null
          message_to_landlord?: string | null
          move_in_date?: string | null
          occupants?: number | null
          pet_description?: string | null
          phone: string
          pm_notes?: string | null
          previous_address?: string | null
          previous_landlord_contact?: string | null
          previous_landlord_name?: string | null
          property_id: string
          reason_for_leaving?: string | null
          reference_number: string
          status?: string
          submitted_at?: string | null
          time_at_address?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          additional_notes?: string | null
          agent_id?: string | null
          annual_income?: number | null
          applicant_id?: string | null
          bond_amount?: number | null
          bond_collected_at?: string | null
          bond_lodged_at?: string | null
          bond_lodgement_ref?: string | null
          co_applicants?: Json | null
          created_at?: string
          current_address?: string
          date_of_birth?: string
          email?: string
          employer_name?: string | null
          employment_length?: string | null
          employment_status?: string
          full_name?: string
          has_pets?: boolean | null
          id?: string
          identity_document_type?: string | null
          identity_document_url?: string | null
          income_verified?: boolean | null
          lease_term_months?: number | null
          message_to_landlord?: string | null
          move_in_date?: string | null
          occupants?: number | null
          pet_description?: string | null
          phone?: string
          pm_notes?: string | null
          previous_address?: string | null
          previous_landlord_contact?: string | null
          previous_landlord_name?: string | null
          property_id?: string
          reason_for_leaving?: string | null
          reference_number?: string
          status?: string
          submitted_at?: string | null
          time_at_address?: string | null
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
            foreignKeyName: "rental_applications_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_applications_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_applications_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "listings_translation_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_applications_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_applications_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      review_requests: {
        Row: {
          agent_id: string
          client_email: string | null
          client_name: string | null
          created_at: string
          expires_at: string
          id: string
          token: string
          used: boolean
          used_at: string | null
        }
        Insert: {
          agent_id: string
          client_email?: string | null
          client_name?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used?: boolean
          used_at?: string | null
        }
        Update: {
          agent_id?: string
          client_email?: string | null
          client_name?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used?: boolean
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_requests_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_requests_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_requests_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      review_verify_tokens: {
        Row: {
          expires_at: string | null
          id: string
          review_id: string
          token: string
          used_at: string | null
        }
        Insert: {
          expires_at?: string | null
          id?: string
          review_id: string
          token?: string
          used_at?: string | null
        }
        Update: {
          expires_at?: string | null
          id?: string
          review_id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "review_verify_tokens_review_id_fkey"
            columns: ["review_id"]
            isOneToOne: false
            referencedRelation: "agent_reviews"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_properties: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          property_id: string
          saved_at: string
          saved_price: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          property_id: string
          saved_at?: string
          saved_price?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          property_id?: string
          saved_at?: string
          saved_price?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_properties_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "listings_translation_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_properties_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_properties_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public_safe"
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
      saved_searches: {
        Row: {
          alert_frequency: string
          created_at: string
          has_virtual_tour: boolean | null
          id: string
          keywords: string | null
          last_alerted_at: string | null
          listing_category: string | null
          listing_mode: string | null
          listing_status: string | null
          max_bedrooms: number | null
          max_land_sqm: number | null
          max_price: number | null
          min_bathrooms: number | null
          min_bedrooms: number | null
          min_land_sqm: number | null
          min_price: number | null
          name: string
          new_match_count: number
          property_types: string[] | null
          states: string[] | null
          suburbs: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          alert_frequency?: string
          created_at?: string
          has_virtual_tour?: boolean | null
          id?: string
          keywords?: string | null
          last_alerted_at?: string | null
          listing_category?: string | null
          listing_mode?: string | null
          listing_status?: string | null
          max_bedrooms?: number | null
          max_land_sqm?: number | null
          max_price?: number | null
          min_bathrooms?: number | null
          min_bedrooms?: number | null
          min_land_sqm?: number | null
          min_price?: number | null
          name?: string
          new_match_count?: number
          property_types?: string[] | null
          states?: string[] | null
          suburbs?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          alert_frequency?: string
          created_at?: string
          has_virtual_tour?: boolean | null
          id?: string
          keywords?: string | null
          last_alerted_at?: string | null
          listing_category?: string | null
          listing_mode?: string | null
          listing_status?: string | null
          max_bedrooms?: number | null
          max_land_sqm?: number | null
          max_price?: number | null
          min_bathrooms?: number | null
          min_bedrooms?: number | null
          min_land_sqm?: number | null
          min_price?: number | null
          name?: string
          new_match_count?: number
          property_types?: string[] | null
          states?: string[] | null
          suburbs?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      school_catchments: {
        Row: {
          geojson: Json
          id: string
          school_id: string | null
          source_url: string | null
          updated_at: string | null
          year: number | null
        }
        Insert: {
          geojson: Json
          id?: string
          school_id?: string | null
          source_url?: string | null
          updated_at?: string | null
          year?: number | null
        }
        Update: {
          geojson?: Json
          id?: string
          school_id?: string | null
          source_url?: string | null
          updated_at?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "school_catchments_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          acara_id: string
          created_at: string | null
          enrolment: number | null
          icsea: number | null
          id: string
          lat: number | null
          lng: number | null
          name: string
          phone: string | null
          postcode: string | null
          sector: string
          state: string
          suburb: string
          type: string
          website_url: string | null
        }
        Insert: {
          acara_id: string
          created_at?: string | null
          enrolment?: number | null
          icsea?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          name: string
          phone?: string | null
          postcode?: string | null
          sector: string
          state: string
          suburb: string
          type: string
          website_url?: string | null
        }
        Update: {
          acara_id?: string
          created_at?: string | null
          enrolment?: number | null
          icsea?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          name?: string
          phone?: string | null
          postcode?: string | null
          sector?: string
          state?: string
          suburb?: string
          type?: string
          website_url?: string | null
        }
        Relationships: []
      }
      seller_likelihood_scores: {
        Row: {
          created_at: string
          id: string
          property_id: string
          score: number
          scored_at: string
          signals: Json
          summary: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          property_id: string
          score?: number
          scored_at?: string
          signals?: Json
          summary?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          property_id?: string
          score?: number
          scored_at?: string
          signals?: Json
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_likelihood_scores_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "listings_translation_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_likelihood_scores_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_likelihood_scores_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      strata_listing_data: {
        Row: {
          admin_levy_per_lot: number | null
          capital_works_levy_per_lot: number | null
          created_at: string | null
          id: string
          listing_id: string
          scheme_id: string | null
          special_levy_active: boolean | null
          special_levy_amount: number | null
          strata_health_score: number | null
          total_quarterly_levy: number | null
        }
        Insert: {
          admin_levy_per_lot?: number | null
          capital_works_levy_per_lot?: number | null
          created_at?: string | null
          id?: string
          listing_id: string
          scheme_id?: string | null
          special_levy_active?: boolean | null
          special_levy_amount?: number | null
          strata_health_score?: number | null
          total_quarterly_levy?: number | null
        }
        Update: {
          admin_levy_per_lot?: number | null
          capital_works_levy_per_lot?: number | null
          created_at?: string | null
          id?: string
          listing_id?: string
          scheme_id?: string | null
          special_levy_active?: boolean | null
          special_levy_amount?: number | null
          strata_health_score?: number | null
          total_quarterly_levy?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "strata_listing_data_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings_translation_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strata_listing_data_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strata_listing_data_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "properties_public_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "strata_listing_data_scheme_id_fkey"
            columns: ["scheme_id"]
            isOneToOne: false
            referencedRelation: "strata_schemes"
            referencedColumns: ["id"]
          },
        ]
      }
      strata_managers: {
        Row: {
          abn: string | null
          bio: string | null
          company_name: string
          created_at: string | null
          id: string
          licence_number: string | null
          phone: string | null
          state: string
          updated_at: string | null
          user_id: string
          verified: boolean | null
          website: string | null
        }
        Insert: {
          abn?: string | null
          bio?: string | null
          company_name: string
          created_at?: string | null
          id?: string
          licence_number?: string | null
          phone?: string | null
          state: string
          updated_at?: string | null
          user_id: string
          verified?: boolean | null
          website?: string | null
        }
        Update: {
          abn?: string | null
          bio?: string | null
          company_name?: string
          created_at?: string | null
          id?: string
          licence_number?: string | null
          phone?: string | null
          state?: string
          updated_at?: string | null
          user_id?: string
          verified?: boolean | null
          website?: string | null
        }
        Relationships: []
      }
      strata_schemes: {
        Row: {
          address: string
          admin_fund_levy_per_lot: number | null
          agm_last_held: string | null
          building_defects_disclosed: boolean | null
          building_type: string | null
          capital_works_levy_per_lot: number | null
          capital_works_plan_year: number | null
          created_at: string | null
          defect_bond_active: boolean | null
          defect_description: string | null
          id: string
          postcode: string
          scheme_name: string
          sinking_fund_balance: number | null
          sinking_fund_target: number | null
          special_levy_amount: number | null
          special_levy_issued_5yr: boolean | null
          special_levy_reason: string | null
          special_levy_year: number | null
          state: string
          strata_health_score: number | null
          strata_manager_id: string | null
          suburb: string
          total_lots: number
          updated_at: string | null
          year_built: number | null
        }
        Insert: {
          address: string
          admin_fund_levy_per_lot?: number | null
          agm_last_held?: string | null
          building_defects_disclosed?: boolean | null
          building_type?: string | null
          capital_works_levy_per_lot?: number | null
          capital_works_plan_year?: number | null
          created_at?: string | null
          defect_bond_active?: boolean | null
          defect_description?: string | null
          id?: string
          postcode: string
          scheme_name: string
          sinking_fund_balance?: number | null
          sinking_fund_target?: number | null
          special_levy_amount?: number | null
          special_levy_issued_5yr?: boolean | null
          special_levy_reason?: string | null
          special_levy_year?: number | null
          state: string
          strata_health_score?: number | null
          strata_manager_id?: string | null
          suburb: string
          total_lots?: number
          updated_at?: string | null
          year_built?: number | null
        }
        Update: {
          address?: string
          admin_fund_levy_per_lot?: number | null
          agm_last_held?: string | null
          building_defects_disclosed?: boolean | null
          building_type?: string | null
          capital_works_levy_per_lot?: number | null
          capital_works_plan_year?: number | null
          created_at?: string | null
          defect_bond_active?: boolean | null
          defect_description?: string | null
          id?: string
          postcode?: string
          scheme_name?: string
          sinking_fund_balance?: number | null
          sinking_fund_target?: number | null
          special_levy_amount?: number | null
          special_levy_issued_5yr?: boolean | null
          special_levy_reason?: string | null
          special_levy_year?: number | null
          state?: string
          strata_health_score?: number | null
          strata_manager_id?: string | null
          suburb?: string
          total_lots?: number
          updated_at?: string | null
          year_built?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "strata_schemes_strata_manager_id_fkey"
            columns: ["strata_manager_id"]
            isOneToOne: false
            referencedRelation: "strata_managers"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_events: {
        Row: {
          agent_id: string
          created_at: string
          event_type: string
          from_plan: string | null
          id: string
          mrr_change: number | null
          notes: string | null
          stripe_event_id: string | null
          to_plan: string | null
        }
        Insert: {
          agent_id: string
          created_at?: string
          event_type: string
          from_plan?: string | null
          id?: string
          mrr_change?: number | null
          notes?: string | null
          stripe_event_id?: string | null
          to_plan?: string | null
        }
        Update: {
          agent_id?: string
          created_at?: string
          event_type?: string
          from_plan?: string | null
          id?: string
          mrr_change?: number | null
          notes?: string | null
          stripe_event_id?: string | null
          to_plan?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscription_events_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_events_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscription_events_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      suburb_amenities: {
        Row: {
          bus_stops: number | null
          cafes_restaurants: number | null
          hospitals: number | null
          id: string
          parks: number | null
          primary_schools: number | null
          private_schools: number | null
          schools_count: number | null
          secondary_schools: number | null
          state: string
          suburb: string
          supermarkets: number | null
          train_stations: number | null
          tram_stops: number | null
          transit_score: number | null
          updated_at: string
          walk_score: number | null
        }
        Insert: {
          bus_stops?: number | null
          cafes_restaurants?: number | null
          hospitals?: number | null
          id?: string
          parks?: number | null
          primary_schools?: number | null
          private_schools?: number | null
          schools_count?: number | null
          secondary_schools?: number | null
          state: string
          suburb: string
          supermarkets?: number | null
          train_stations?: number | null
          tram_stops?: number | null
          transit_score?: number | null
          updated_at?: string
          walk_score?: number | null
        }
        Update: {
          bus_stops?: number | null
          cafes_restaurants?: number | null
          hospitals?: number | null
          id?: string
          parks?: number | null
          primary_schools?: number | null
          private_schools?: number | null
          schools_count?: number | null
          secondary_schools?: number | null
          state?: string
          suburb?: string
          supermarkets?: number | null
          train_stations?: number | null
          tram_stops?: number | null
          transit_score?: number | null
          updated_at?: string
          walk_score?: number | null
        }
        Relationships: []
      }
      suburb_auction_stats: {
        Row: {
          clearance_rate: number | null
          cleared: number | null
          created_at: string | null
          id: string
          median_price: number | null
          passed_in: number | null
          period_end: string
          postcode: string | null
          sample_size: number | null
          state: string
          suburb: string
          total_auctions: number | null
          withdrawn: number | null
        }
        Insert: {
          clearance_rate?: number | null
          cleared?: number | null
          created_at?: string | null
          id?: string
          median_price?: number | null
          passed_in?: number | null
          period_end: string
          postcode?: string | null
          sample_size?: number | null
          state: string
          suburb: string
          total_auctions?: number | null
          withdrawn?: number | null
        }
        Update: {
          clearance_rate?: number | null
          cleared?: number | null
          created_at?: string | null
          id?: string
          median_price?: number | null
          passed_in?: number | null
          period_end?: string
          postcode?: string | null
          sample_size?: number | null
          state?: string
          suburb?: string
          total_auctions?: number | null
          withdrawn?: number | null
        }
        Relationships: []
      }
      suburb_growth_stats: {
        Row: {
          created_at: string | null
          growth_10yr: number | null
          growth_1yr: number | null
          growth_5yr: number | null
          id: string
          median_price: number | null
          median_rent_pw: number | null
          period_end: string | null
          rental_yield: number | null
          state: string
          suburb: string
          vacancy_rate: number | null
        }
        Insert: {
          created_at?: string | null
          growth_10yr?: number | null
          growth_1yr?: number | null
          growth_5yr?: number | null
          id?: string
          median_price?: number | null
          median_rent_pw?: number | null
          period_end?: string | null
          rental_yield?: number | null
          state: string
          suburb: string
          vacancy_rate?: number | null
        }
        Update: {
          created_at?: string | null
          growth_10yr?: number | null
          growth_1yr?: number | null
          growth_5yr?: number | null
          id?: string
          median_price?: number | null
          median_rent_pw?: number | null
          period_end?: string | null
          rental_yield?: number | null
          state?: string
          suburb?: string
          vacancy_rate?: number | null
        }
        Relationships: []
      }
      suburb_market_stats: {
        Row: {
          active_listings: number | null
          auction_clearance_rate: number | null
          auction_count: number | null
          avg_days_on_market: number | null
          clearance_rate: number | null
          computed_at: string
          gross_rental_yield_pct: number | null
          gross_yield: number | null
          id: string
          max_price: number | null
          mean_dom: number | null
          mean_price: number | null
          median_dom: number | null
          median_price_psqm: number | null
          median_rent_pw: number | null
          median_rent_yoy: number | null
          median_sale_price: number | null
          median_sale_price_yoy: number | null
          min_price: number | null
          new_listings_30d: number | null
          period_month: string | null
          period_months: number
          postcode: string | null
          price_p25: number | null
          price_p75: number | null
          price_per_sqm: number | null
          property_type: string
          state: string
          suburb: string
          total_sales: number | null
          vacancy_rate: number | null
          yoy_median_change_pct: number | null
          yoy_volume_change_pct: number | null
        }
        Insert: {
          active_listings?: number | null
          auction_clearance_rate?: number | null
          auction_count?: number | null
          avg_days_on_market?: number | null
          clearance_rate?: number | null
          computed_at?: string
          gross_rental_yield_pct?: number | null
          gross_yield?: number | null
          id?: string
          max_price?: number | null
          mean_dom?: number | null
          mean_price?: number | null
          median_dom?: number | null
          median_price_psqm?: number | null
          median_rent_pw?: number | null
          median_rent_yoy?: number | null
          median_sale_price?: number | null
          median_sale_price_yoy?: number | null
          min_price?: number | null
          new_listings_30d?: number | null
          period_month?: string | null
          period_months?: number
          postcode?: string | null
          price_p25?: number | null
          price_p75?: number | null
          price_per_sqm?: number | null
          property_type?: string
          state: string
          suburb: string
          total_sales?: number | null
          vacancy_rate?: number | null
          yoy_median_change_pct?: number | null
          yoy_volume_change_pct?: number | null
        }
        Update: {
          active_listings?: number | null
          auction_clearance_rate?: number | null
          auction_count?: number | null
          avg_days_on_market?: number | null
          clearance_rate?: number | null
          computed_at?: string
          gross_rental_yield_pct?: number | null
          gross_yield?: number | null
          id?: string
          max_price?: number | null
          mean_dom?: number | null
          mean_price?: number | null
          median_dom?: number | null
          median_price_psqm?: number | null
          median_rent_pw?: number | null
          median_rent_yoy?: number | null
          median_sale_price?: number | null
          median_sale_price_yoy?: number | null
          min_price?: number | null
          new_listings_30d?: number | null
          period_month?: string | null
          period_months?: number
          postcode?: string | null
          price_p25?: number | null
          price_p75?: number | null
          price_per_sqm?: number | null
          property_type?: string
          state?: string
          suburb?: string
          total_sales?: number | null
          vacancy_rate?: number | null
          yoy_median_change_pct?: number | null
          yoy_volume_change_pct?: number | null
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
      suburb_rent_stats: {
        Row: {
          bedrooms: number | null
          id: string
          median_rent_pw: number | null
          period_end: string | null
          property_type: string | null
          sample_size: number | null
          state: string
          suburb: string
        }
        Insert: {
          bedrooms?: number | null
          id?: string
          median_rent_pw?: number | null
          period_end?: string | null
          property_type?: string | null
          sample_size?: number | null
          state: string
          suburb: string
        }
        Update: {
          bedrooms?: number | null
          id?: string
          median_rent_pw?: number | null
          period_end?: string | null
          property_type?: string | null
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
      suburbs: {
        Row: {
          created_at: string
          description: string | null
          id: string
          lat: number | null
          lga: string | null
          lng: number | null
          median_age: number | null
          name: string
          population: number | null
          postcode: string | null
          region: string | null
          slug: string
          state: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          lat?: number | null
          lga?: string | null
          lng?: number | null
          median_age?: number | null
          name: string
          population?: number | null
          postcode?: string | null
          region?: string | null
          slug: string
          state: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          lat?: number | null
          lga?: string | null
          lng?: number | null
          median_age?: number | null
          name?: string
          population?: number | null
          postcode?: string | null
          region?: string | null
          slug?: string
          state?: string
        }
        Relationships: []
      }
      support_tickets: {
        Row: {
          admin_notes: string | null
          agent_id: string | null
          category: string
          created_at: string
          description: string
          id: string
          priority: string
          resolved_at: string | null
          status: string
          subject: string
          submitter_email: string
          submitter_name: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          agent_id?: string | null
          category?: string
          created_at?: string
          description: string
          id?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          subject: string
          submitter_email: string
          submitter_name: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          agent_id?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          priority?: string
          resolved_at?: string | null
          status?: string
          subject?: string
          submitter_email?: string
          submitter_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
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
            foreignKeyName: "tenancies_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancies_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tenancies_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "listings_translation_summary"
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
            foreignKeyName: "tenancies_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public_safe"
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
            foreignKeyName: "transactions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
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
            referencedRelation: "listings_translation_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public_safe"
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
          current_balance: number | null
          id: string
          is_active: boolean
          opening_balance: number | null
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
          current_balance?: number | null
          id?: string
          is_active?: boolean
          opening_balance?: number | null
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
          current_balance?: number | null
          id?: string
          is_active?: boolean
          opening_balance?: number | null
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
          {
            foreignKeyName: "trust_accounts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_accounts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_journal_entries: {
        Row: {
          agent_id: string
          amount: number
          created_at: string
          created_by: string
          credit_ledger: string
          debit_ledger: string
          entry_date: string
          id: string
          reason_code: string
          reason_detail: string
          reference: string | null
          trust_account_id: string
          void_reason: string | null
          voided: boolean
          voided_at: string | null
          voided_by: string | null
        }
        Insert: {
          agent_id: string
          amount: number
          created_at?: string
          created_by: string
          credit_ledger: string
          debit_ledger: string
          entry_date?: string
          id?: string
          reason_code: string
          reason_detail: string
          reference?: string | null
          trust_account_id: string
          void_reason?: string | null
          voided?: boolean
          voided_at?: string | null
          voided_by?: string | null
        }
        Update: {
          agent_id?: string
          amount?: number
          created_at?: string
          created_by?: string
          credit_ledger?: string
          debit_ledger?: string
          entry_date?: string
          id?: string
          reason_code?: string
          reason_detail?: string
          reference?: string | null
          trust_account_id?: string
          void_reason?: string | null
          voided?: boolean
          voided_at?: string | null
          voided_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trust_journal_entries_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_journal_entries_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_journal_entries_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_journal_entries_trust_account_id_fkey"
            columns: ["trust_account_id"]
            isOneToOne: false
            referencedRelation: "trust_accounts"
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
          {
            foreignKeyName: "trust_payments_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_payments_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
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
          {
            foreignKeyName: "trust_receipts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_receipts_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
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
            foreignKeyName: "trust_reconciliations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_reconciliations_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
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
      trust_suspense: {
        Row: {
          agent_id: string
          amount: number
          bank_reference: string | null
          created_at: string
          created_by: string
          id: string
          matched_at: string | null
          matched_by: string | null
          matched_transaction_id: string | null
          notes: string | null
          received_date: string
          status: string
          trust_account_id: string
        }
        Insert: {
          agent_id: string
          amount: number
          bank_reference?: string | null
          created_at?: string
          created_by: string
          id?: string
          matched_at?: string | null
          matched_by?: string | null
          matched_transaction_id?: string | null
          notes?: string | null
          received_date?: string
          status?: string
          trust_account_id: string
        }
        Update: {
          agent_id?: string
          amount?: number
          bank_reference?: string | null
          created_at?: string
          created_by?: string
          id?: string
          matched_at?: string | null
          matched_by?: string | null
          matched_transaction_id?: string | null
          notes?: string | null
          received_date?: string
          status?: string
          trust_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trust_suspense_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_suspense_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_suspense_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_suspense_matched_transaction_id_fkey"
            columns: ["matched_transaction_id"]
            isOneToOne: false
            referencedRelation: "trust_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_suspense_trust_account_id_fkey"
            columns: ["trust_account_id"]
            isOneToOne: false
            referencedRelation: "trust_accounts"
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
          correction_reason: string | null
          created_at: string
          created_by: string
          description: string | null
          dishonoured_at: string | null
          due_date: string | null
          gst_amount: number
          id: string
          invoice_number: string | null
          is_dishonoured: boolean
          original_transaction_id: string | null
          overdrawn_notified: boolean
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
          correction_reason?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          dishonoured_at?: string | null
          due_date?: string | null
          gst_amount?: number
          id?: string
          invoice_number?: string | null
          is_dishonoured?: boolean
          original_transaction_id?: string | null
          overdrawn_notified?: boolean
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
          correction_reason?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          dishonoured_at?: string | null
          due_date?: string | null
          gst_amount?: number
          id?: string
          invoice_number?: string | null
          is_dishonoured?: boolean
          original_transaction_id?: string | null
          overdrawn_notified?: boolean
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
            foreignKeyName: "trust_transactions_original_transaction_id_fkey"
            columns: ["original_transaction_id"]
            isOneToOne: false
            referencedRelation: "trust_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trust_transactions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "listings_translation_summary"
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
            foreignKeyName: "trust_transactions_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public_safe"
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
      vendor_report_tokens: {
        Row: {
          agent_id: string
          created_at: string | null
          expires_at: string | null
          id: string
          last_viewed: string | null
          property_id: string
          token: string
          vendor_email: string | null
          vendor_name: string | null
          view_count: number | null
        }
        Insert: {
          agent_id: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          last_viewed?: string | null
          property_id: string
          token?: string
          vendor_email?: string | null
          vendor_name?: string | null
          view_count?: number | null
        }
        Update: {
          agent_id?: string
          created_at?: string | null
          expires_at?: string | null
          id?: string
          last_viewed?: string | null
          property_id?: string
          token?: string
          vendor_email?: string | null
          vendor_name?: string | null
          view_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vendor_report_tokens_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "listings_translation_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_report_tokens_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_report_tokens_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public_safe"
            referencedColumns: ["id"]
          },
        ]
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
            foreignKeyName: "vendor_reports_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_reports_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_reports_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "listings_translation_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_reports_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendor_reports_property_id_fkey"
            columns: ["property_id"]
            isOneToOne: false
            referencedRelation: "properties_public_safe"
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
      waitlist: {
        Row: {
          agency: string | null
          created_at: string | null
          email: string
          id: string
          name: string | null
          position: number | null
          referred_by: string | null
        }
        Insert: {
          agency?: string | null
          created_at?: string | null
          email: string
          id?: string
          name?: string | null
          position?: number | null
          referred_by?: string | null
        }
        Update: {
          agency?: string | null
          created_at?: string | null
          email?: string
          id?: string
          name?: string | null
          position?: number | null
          referred_by?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      agents_public: {
        Row: {
          agency: string | null
          agency_id: string | null
          aml_ctf_acknowledged: boolean | null
          avatar_url: string | null
          avg_rating: number | null
          bio: string | null
          company_logo_url: string | null
          created_at: string | null
          email: string | null
          founding_member: boolean | null
          handles_trust_accounting: boolean | null
          headline: string | null
          id: string | null
          instagram_url: string | null
          investment_niche: string | null
          is_approved: boolean | null
          is_demo: boolean | null
          is_public_profile: boolean | null
          is_subscribed: boolean | null
          languages_spoken: string[] | null
          last_compliance_check_at: string | null
          lead_source: string | null
          licence_expiry_date: string | null
          license_number: string | null
          lifecycle_stage: string | null
          linkedin_url: string | null
          name: string | null
          office_address: string | null
          onboarding_complete: boolean | null
          phone: string | null
          profile_banner_url: string | null
          profile_photo_url: string | null
          profile_views: number | null
          rating: number | null
          review_count: number | null
          service_areas: string[] | null
          slug: string | null
          social_links: Json | null
          specialization: string | null
          title_position: string | null
          updated_at: string | null
          user_id: string | null
          verification_badge_level: string | null
          website_url: string | null
          years_experience: number | null
        }
        Insert: {
          agency?: string | null
          agency_id?: string | null
          aml_ctf_acknowledged?: boolean | null
          avatar_url?: string | null
          avg_rating?: number | null
          bio?: string | null
          company_logo_url?: string | null
          created_at?: string | null
          email?: string | null
          founding_member?: boolean | null
          handles_trust_accounting?: boolean | null
          headline?: string | null
          id?: string | null
          instagram_url?: string | null
          investment_niche?: string | null
          is_approved?: boolean | null
          is_demo?: boolean | null
          is_public_profile?: boolean | null
          is_subscribed?: boolean | null
          languages_spoken?: string[] | null
          last_compliance_check_at?: string | null
          lead_source?: string | null
          licence_expiry_date?: string | null
          license_number?: string | null
          lifecycle_stage?: string | null
          linkedin_url?: string | null
          name?: string | null
          office_address?: string | null
          onboarding_complete?: boolean | null
          phone?: string | null
          profile_banner_url?: string | null
          profile_photo_url?: string | null
          profile_views?: number | null
          rating?: number | null
          review_count?: number | null
          service_areas?: string[] | null
          slug?: string | null
          social_links?: Json | null
          specialization?: string | null
          title_position?: string | null
          updated_at?: string | null
          user_id?: string | null
          verification_badge_level?: string | null
          website_url?: string | null
          years_experience?: number | null
        }
        Update: {
          agency?: string | null
          agency_id?: string | null
          aml_ctf_acknowledged?: boolean | null
          avatar_url?: string | null
          avg_rating?: number | null
          bio?: string | null
          company_logo_url?: string | null
          created_at?: string | null
          email?: string | null
          founding_member?: boolean | null
          handles_trust_accounting?: boolean | null
          headline?: string | null
          id?: string | null
          instagram_url?: string | null
          investment_niche?: string | null
          is_approved?: boolean | null
          is_demo?: boolean | null
          is_public_profile?: boolean | null
          is_subscribed?: boolean | null
          languages_spoken?: string[] | null
          last_compliance_check_at?: string | null
          lead_source?: string | null
          licence_expiry_date?: string | null
          license_number?: string | null
          lifecycle_stage?: string | null
          linkedin_url?: string | null
          name?: string | null
          office_address?: string | null
          onboarding_complete?: boolean | null
          phone?: string | null
          profile_banner_url?: string | null
          profile_photo_url?: string | null
          profile_views?: number | null
          rating?: number | null
          review_count?: number | null
          service_areas?: string[] | null
          slug?: string | null
          social_links?: Json | null
          specialization?: string | null
          title_position?: string | null
          updated_at?: string | null
          user_id?: string | null
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
      agents_public_safe: {
        Row: {
          agency: string | null
          agency_id: string | null
          avatar_url: string | null
          bio: string | null
          company_logo_url: string | null
          created_at: string | null
          email: string | null
          founding_member: boolean | null
          headline: string | null
          id: string | null
          instagram_url: string | null
          investment_niche: string | null
          is_approved: boolean | null
          is_demo: boolean | null
          is_public_profile: boolean | null
          is_subscribed: boolean | null
          languages_spoken: string[] | null
          license_number: string | null
          linkedin_url: string | null
          name: string | null
          office_address: string | null
          onboarding_complete: boolean | null
          phone: string | null
          profile_banner_url: string | null
          profile_photo_url: string | null
          profile_views: number | null
          rating: number | null
          review_count: number | null
          service_areas: string[] | null
          slug: string | null
          social_links: Json | null
          specialization: string | null
          title_position: string | null
          updated_at: string | null
          user_id: string | null
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
          created_at?: string | null
          email?: string | null
          founding_member?: boolean | null
          headline?: string | null
          id?: string | null
          instagram_url?: string | null
          investment_niche?: string | null
          is_approved?: boolean | null
          is_demo?: boolean | null
          is_public_profile?: boolean | null
          is_subscribed?: boolean | null
          languages_spoken?: string[] | null
          license_number?: string | null
          linkedin_url?: string | null
          name?: string | null
          office_address?: string | null
          onboarding_complete?: boolean | null
          phone?: string | null
          profile_banner_url?: string | null
          profile_photo_url?: string | null
          profile_views?: number | null
          rating?: number | null
          review_count?: number | null
          service_areas?: string[] | null
          slug?: string | null
          social_links?: Json | null
          specialization?: string | null
          title_position?: string | null
          updated_at?: string | null
          user_id?: string | null
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
          created_at?: string | null
          email?: string | null
          founding_member?: boolean | null
          headline?: string | null
          id?: string | null
          instagram_url?: string | null
          investment_niche?: string | null
          is_approved?: boolean | null
          is_demo?: boolean | null
          is_public_profile?: boolean | null
          is_subscribed?: boolean | null
          languages_spoken?: string[] | null
          license_number?: string | null
          linkedin_url?: string | null
          name?: string | null
          office_address?: string | null
          onboarding_complete?: boolean | null
          phone?: string | null
          profile_banner_url?: string | null
          profile_photo_url?: string | null
          profile_views?: number | null
          rating?: number | null
          review_count?: number | null
          service_areas?: string[] | null
          slug?: string | null
          social_links?: Json | null
          specialization?: string | null
          title_position?: string | null
          updated_at?: string | null
          user_id?: string | null
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
      broker_leads_view: {
        Row: {
          broker_id: string | null
          buyer_email: string | null
          buyer_message: string | null
          buyer_name: string | null
          buyer_phone: string | null
          created_at: string | null
          id: string | null
          invoice_month: string | null
          invoiced_at: string | null
          is_duplicate: boolean | null
          is_qualified: boolean | null
          lead_fee_aud: number | null
          property_address: string | null
          property_price: string | null
          within_cap_window: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "broker_leads_broker_id_fkey"
            columns: ["broker_id"]
            isOneToOne: false
            referencedRelation: "brokers"
            referencedColumns: ["id"]
          },
        ]
      }
      cma_reports_shared: {
        Row: {
          agent_commentary: string | null
          agent_recommended_method: string | null
          agent_recommended_price: number | null
          created_at: string | null
          estimated_price_high: number | null
          estimated_price_low: number | null
          estimated_price_mid: number | null
          id: string | null
          is_shared: boolean | null
          months_back: number | null
          radius_km: number | null
          report_title: string | null
          selected_comparable_ids: string[] | null
          share_token: string | null
          subject_address: string | null
          subject_bathrooms: number | null
          subject_bedrooms: number | null
          subject_car_spaces: number | null
          subject_land_sqm: number | null
          subject_postcode: string | null
          subject_property_type: string | null
          subject_state: string | null
          subject_suburb: string | null
          updated_at: string | null
          view_count: number | null
          viewed_at: string | null
        }
        Insert: {
          agent_commentary?: string | null
          agent_recommended_method?: string | null
          agent_recommended_price?: number | null
          created_at?: string | null
          estimated_price_high?: number | null
          estimated_price_low?: number | null
          estimated_price_mid?: number | null
          id?: string | null
          is_shared?: boolean | null
          months_back?: number | null
          radius_km?: number | null
          report_title?: string | null
          selected_comparable_ids?: string[] | null
          share_token?: string | null
          subject_address?: string | null
          subject_bathrooms?: number | null
          subject_bedrooms?: number | null
          subject_car_spaces?: number | null
          subject_land_sqm?: number | null
          subject_postcode?: string | null
          subject_property_type?: string | null
          subject_state?: string | null
          subject_suburb?: string | null
          updated_at?: string | null
          view_count?: number | null
          viewed_at?: string | null
        }
        Update: {
          agent_commentary?: string | null
          agent_recommended_method?: string | null
          agent_recommended_price?: number | null
          created_at?: string | null
          estimated_price_high?: number | null
          estimated_price_low?: number | null
          estimated_price_mid?: number | null
          id?: string | null
          is_shared?: boolean | null
          months_back?: number | null
          radius_km?: number | null
          report_title?: string | null
          selected_comparable_ids?: string[] | null
          share_token?: string | null
          subject_address?: string | null
          subject_bathrooms?: number | null
          subject_bedrooms?: number | null
          subject_car_spaces?: number | null
          subject_land_sqm?: number | null
          subject_postcode?: string | null
          subject_property_type?: string | null
          subject_state?: string | null
          subject_suburb?: string | null
          updated_at?: string | null
          view_count?: number | null
          viewed_at?: string | null
        }
        Relationships: []
      }
      consumer_profiles_browse: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          buying_situation: string | null
          created_at: string | null
          id: string | null
          is_purchasable: boolean | null
          lead_score: number | null
          min_bedrooms: number | null
          preferred_suburbs: string[] | null
          preferred_type: string | null
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          buying_situation?: string | null
          created_at?: string | null
          id?: string | null
          is_purchasable?: boolean | null
          lead_score?: number | null
          min_bedrooms?: number | null
          preferred_suburbs?: string[] | null
          preferred_type?: string | null
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          buying_situation?: string | null
          created_at?: string | null
          id?: string | null
          is_purchasable?: boolean | null
          lead_score?: number | null
          min_bedrooms?: number | null
          preferred_suburbs?: string[] | null
          preferred_type?: string | null
        }
        Relationships: []
      }
      consumer_profiles_marketplace: {
        Row: {
          budget_max: number | null
          budget_min: number | null
          buying_situation: string | null
          created_at: string | null
          email: string | null
          id: string | null
          is_purchasable: boolean | null
          lead_score: number | null
          min_bedrooms: number | null
          name: string | null
          preferred_suburbs: string[] | null
          preferred_type: string | null
        }
        Insert: {
          budget_max?: number | null
          budget_min?: number | null
          buying_situation?: string | null
          created_at?: string | null
          email?: never
          id?: string | null
          is_purchasable?: boolean | null
          lead_score?: number | null
          min_bedrooms?: number | null
          name?: never
          preferred_suburbs?: string[] | null
          preferred_type?: string | null
        }
        Update: {
          budget_max?: number | null
          budget_min?: number | null
          buying_situation?: string | null
          created_at?: string | null
          email?: never
          id?: string | null
          is_purchasable?: boolean | null
          lead_score?: number | null
          min_bedrooms?: number | null
          name?: never
          preferred_suburbs?: string[] | null
          preferred_type?: string | null
        }
        Relationships: []
      }
      listings_translation_summary: {
        Row: {
          address: string | null
          has_cantonese: boolean | null
          has_mandarin: boolean | null
          has_translations: boolean | null
          has_vietnamese: boolean | null
          id: string | null
          translation_status: string | null
          translations_generated_at: string | null
        }
        Insert: {
          address?: string | null
          has_cantonese?: never
          has_mandarin?: never
          has_translations?: never
          has_vietnamese?: never
          id?: string | null
          translation_status?: string | null
          translations_generated_at?: string | null
        }
        Update: {
          address?: string | null
          has_cantonese?: never
          has_mandarin?: never
          has_translations?: never
          has_vietnamese?: never
          id?: string | null
          translation_status?: string | null
          translations_generated_at?: string | null
        }
        Relationships: []
      }
      profiles_public: {
        Row: {
          avatar_url: string | null
          display_name: string | null
          full_name: string | null
          user_id: string | null
        }
        Insert: {
          avatar_url?: string | null
          display_name?: string | null
          full_name?: string | null
          user_id?: string | null
        }
        Update: {
          avatar_url?: string | null
          display_name?: string | null
          full_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      properties_public_safe: {
        Row: {
          address: string | null
          agent_id: string | null
          air_con_type: string | null
          auction_date: string | null
          auction_time: string | null
          baths: number | null
          beds: number | null
          bond_amount: number | null
          boost_tier: string | null
          contact_clicks: number | null
          council_rates_annual: number | null
          country: string | null
          created_at: string | null
          description: string | null
          ensuites: number | null
          eoi_close_date: string | null
          eoi_guide_price: number | null
          estimated_weekly_rent: number | null
          featured_until: string | null
          features: string[] | null
          floor_area_sqm: number | null
          floor_plan_url: string | null
          has_pool: boolean | null
          has_solar: boolean | null
          id: string | null
          images: string[] | null
          is_active: boolean | null
          is_featured: boolean | null
          is_new_build: boolean | null
          land_size_sqm: number | null
          lat: number | null
          listed_at: string | null
          listing_category: string | null
          listing_mode: string | null
          listing_type: string | null
          lng: number | null
          parking: number | null
          postcode: string | null
          price: number | null
          price_formatted: string | null
          price_guide_high: number | null
          price_guide_low: number | null
          price_per_sqm: number | null
          property_type: string | null
          rental_weekly: number | null
          slug: string | null
          sold_at: string | null
          sold_price: number | null
          state: string | null
          status: string | null
          strata_fees_quarterly: number | null
          study_rooms: number | null
          suburb: string | null
          title: string | null
          updated_at: string | null
          video_url: string | null
          views: number | null
          virtual_tour_url: string | null
          year_built: number | null
          zoning: string | null
        }
        Insert: {
          address?: string | null
          agent_id?: string | null
          air_con_type?: string | null
          auction_date?: string | null
          auction_time?: string | null
          baths?: number | null
          beds?: number | null
          bond_amount?: number | null
          boost_tier?: string | null
          contact_clicks?: number | null
          council_rates_annual?: number | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          ensuites?: number | null
          eoi_close_date?: string | null
          eoi_guide_price?: number | null
          estimated_weekly_rent?: number | null
          featured_until?: string | null
          features?: string[] | null
          floor_area_sqm?: number | null
          floor_plan_url?: string | null
          has_pool?: boolean | null
          has_solar?: boolean | null
          id?: string | null
          images?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_new_build?: boolean | null
          land_size_sqm?: number | null
          lat?: number | null
          listed_at?: string | null
          listing_category?: string | null
          listing_mode?: string | null
          listing_type?: string | null
          lng?: number | null
          parking?: number | null
          postcode?: string | null
          price?: number | null
          price_formatted?: string | null
          price_guide_high?: number | null
          price_guide_low?: number | null
          price_per_sqm?: number | null
          property_type?: string | null
          rental_weekly?: number | null
          slug?: string | null
          sold_at?: string | null
          sold_price?: number | null
          state?: string | null
          status?: string | null
          strata_fees_quarterly?: number | null
          study_rooms?: number | null
          suburb?: string | null
          title?: string | null
          updated_at?: string | null
          video_url?: string | null
          views?: number | null
          virtual_tour_url?: string | null
          year_built?: number | null
          zoning?: string | null
        }
        Update: {
          address?: string | null
          agent_id?: string | null
          air_con_type?: string | null
          auction_date?: string | null
          auction_time?: string | null
          baths?: number | null
          beds?: number | null
          bond_amount?: number | null
          boost_tier?: string | null
          contact_clicks?: number | null
          council_rates_annual?: number | null
          country?: string | null
          created_at?: string | null
          description?: string | null
          ensuites?: number | null
          eoi_close_date?: string | null
          eoi_guide_price?: number | null
          estimated_weekly_rent?: number | null
          featured_until?: string | null
          features?: string[] | null
          floor_area_sqm?: number | null
          floor_plan_url?: string | null
          has_pool?: boolean | null
          has_solar?: boolean | null
          id?: string | null
          images?: string[] | null
          is_active?: boolean | null
          is_featured?: boolean | null
          is_new_build?: boolean | null
          land_size_sqm?: number | null
          lat?: number | null
          listed_at?: string | null
          listing_category?: string | null
          listing_mode?: string | null
          listing_type?: string | null
          lng?: number | null
          parking?: number | null
          postcode?: string | null
          price?: number | null
          price_formatted?: string | null
          price_guide_high?: number | null
          price_guide_low?: number | null
          price_per_sqm?: number | null
          property_type?: string | null
          rental_weekly?: number | null
          slug?: string | null
          sold_at?: string | null
          sold_price?: number | null
          state?: string | null
          status?: string | null
          strata_fees_quarterly?: number | null
          study_rooms?: number | null
          suburb?: string | null
          title?: string | null
          updated_at?: string | null
          video_url?: string | null
          views?: number | null
          virtual_tour_url?: string | null
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
          {
            foreignKeyName: "fk_properties_agent"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_properties_agent"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents_public_safe"
            referencedColumns: ["id"]
          },
        ]
      }
      trust_account_balances: {
        Row: {
          agent_id: string | null
          current_balance: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      compute_agent_stats: { Args: { p_agent_id: string }; Returns: undefined }
      compute_suburb_stats: {
        Args: { p_state: string; p_suburb: string }
        Returns: undefined
      }
      conclude_auction: {
        Args: {
          p_auction_id: string
          p_notes?: string
          p_outcome: Database["public"]["Enums"]["auction_status"]
          p_sold_price?: number
          p_winning_reg_id?: string
        }
        Returns: Json
      }
      delete_user_cascade: { Args: { p_user_id: string }; Returns: undefined }
      expire_featured_listings: { Args: never; Returns: undefined }
      expire_stale_pre_approvals: { Args: never; Returns: undefined }
      find_agents: {
        Args: {
          p_agency_id?: string
          p_limit?: number
          p_min_rating?: number
          p_offset?: number
          p_specialty?: string
          p_state?: string
          p_suburb?: string
        }
        Returns: {
          active_listings: number
          agency_logo: string
          agency_name: string
          agent_id: string
          avatar_url: string
          avg_rating: number
          display_name: string
          headline: string
          review_count: number
          service_suburbs: string[]
          slug: string
          sold_count: number
          specialties: string[]
          total_count: number
          years_experience: number
        }[]
      }
      find_comparable_sales: {
        Args: {
          p_bedrooms: number
          p_lat: number
          p_limit?: number
          p_lng: number
          p_property_id: string
          p_radius_km?: number
        }
        Returns: {
          address: string
          baths: number
          beds: number
          distance_km: number
          floor_area_sqm: number
          id: string
          images: string[]
          land_size_sqm: number
          lat: number
          lng: number
          parking: number
          price: number
          price_per_sqm: number
          property_type: string
          slug: string
          sold_at: string
          sold_price: number
          suburb: string
        }[]
      }
      find_matching_saved_searches: {
        Args: { p_property_id: string }
        Returns: {
          alert_frequency: string
          buyer_email: string
          buyer_id: string
          buyer_name: string
          saved_search_id: string
          search_name: string
        }[]
      }
      generate_property_slug: {
        Args: {
          p_beds: number
          p_id: string
          p_property_type: string
          p_state: string
          p_suburb: string
        }
        Returns: string
      }
      get_auction_public: { Args: { p_property_id: string }; Returns: Json }
      get_comparable_sales: {
        Args: {
          p_bedrooms?: number
          p_limit?: number
          p_months_back?: number
          p_offset?: number
          p_property_type?: string
          p_state: string
          p_suburb: string
        }
        Returns: Json
      }
      get_live_bids: {
        Args: { p_auction_id: string; p_limit?: number }
        Returns: Json
      }
      get_own_agent_sensitive: {
        Args: { p_user_id: string }
        Returns: {
          stripe_customer_id: string
          stripe_subscription_id: string
          support_pin: string
        }[]
      }
      get_property_comparables: {
        Args: {
          p_limit?: number
          p_months_back?: number
          p_property_id: string
        }
        Returns: Json
      }
      get_property_performance: {
        Args: { p_days?: number; p_property_id: string }
        Returns: Json
      }
      get_suburb_benchmarks: { Args: { p_property_id: string }; Returns: Json }
      get_suburb_price_trend: {
        Args: {
          p_months?: number
          p_property_type?: string
          p_state: string
          p_suburb: string
        }
        Returns: Json
      }
      get_suburb_rental_stats: {
        Args: {
          _beds?: number
          _property_type?: string
          _state: string
          _suburb: string
        }
        Returns: Json
      }
      get_suburb_sitemap_entries: {
        Args: never
        Returns: {
          slug: string
          state: string
          updated_at: string
        }[]
      }
      get_suburb_summary: {
        Args: { p_property_type?: string; p_state: string; p_suburb: string }
        Returns: Json
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_agent_profile_views: {
        Args: { p_agent_id: string }
        Returns: undefined
      }
      increment_contact_clicks: {
        Args: { property_id: string }
        Returns: undefined
      }
      increment_property_views: {
        Args: { property_id: string }
        Returns: undefined
      }
      is_active_partner_for_agent: {
        Args: { _agent_id: string }
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
      is_partner_for_agency: {
        Args: { _agency_id: string; _user_id: string }
        Returns: boolean
      }
      link_broker_auth_user: {
        Args: { p_email: string; p_user_id: string }
        Returns: undefined
      }
      log_document_download: {
        Args: { p_document_id: string; p_session_id?: string }
        Returns: string
      }
      log_property_view: {
        Args: {
          p_device_type?: string
          p_property_id: string
          p_session_id?: string
          p_source?: string
        }
        Returns: undefined
      }
      lookup_invite_code: {
        Args: { p_code: string }
        Returns: {
          agency_id: string
          agency_name: string
          role: string
        }[]
      }
      lookup_review_request_by_token: {
        Args: { p_token: string }
        Returns: Json
      }
      lookup_vendor_report_token: {
        Args: { p_token: string }
        Returns: {
          agent_id: string
          expires_at: string
          id: string
          property_id: string
          token: string
          vendor_email: string
          vendor_name: string
        }[]
      }
      mark_review_request_used: { Args: { p_token: string }; Returns: boolean }
      nearby_properties: {
        Args: {
          _lat: number
          _limit?: number
          _lng: number
          _radius_km?: number
        }
        Returns: {
          address: string
          address_hidden: boolean
          agency_authority: string | null
          agent_id: string | null
          agent_insights: Json | null
          agent_split_percent: number | null
          air_con_type: string | null
          auction_date: string | null
          auction_time: string | null
          available_from: string | null
          baths: number
          beds: number
          bond_amount: number | null
          boost_expiry_warned: boolean
          boost_requested_at: string | null
          boost_requested_tier: string | null
          boost_tier: string | null
          bushfire_zone: boolean | null
          commission_rate: number | null
          contact_clicks: number
          council_rates_annual: number | null
          country: string
          cover_index: number | null
          created_at: string
          currency_code: string | null
          description: string | null
          electricity_included: boolean | null
          ensuites: number | null
          eoi_close_date: string | null
          eoi_guide_price: number | null
          estimated_value: string | null
          estimated_weekly_rent: number | null
          featured_until: string | null
          features: string[] | null
          flood_zone: boolean | null
          floor_area_sqm: number | null
          floor_plan_url: string | null
          furnished: boolean | null
          garage_type: string | null
          has_air_con: boolean | null
          has_alfresco: boolean | null
          has_balcony: boolean | null
          has_dishwasher: boolean | null
          has_gym_access: boolean | null
          has_internal_laundry: boolean | null
          has_outdoor_ent: boolean | null
          has_pool: boolean | null
          has_pool_access: boolean | null
          has_solar: boolean | null
          has_virtual_tour: boolean | null
          has_washing_machine: boolean | null
          heating_type: string | null
          id: string
          image_url: string | null
          images: string[] | null
          inspection_times: Json | null
          internet_included: boolean | null
          is_active: boolean
          is_featured: boolean
          is_new_build: boolean | null
          land_size: number | null
          land_size_sqm: number | null
          land_value: number | null
          lat: number | null
          lease_term: string | null
          listed_at: string | null
          listed_date: string | null
          listing_category: string
          listing_mode: string
          listing_status: string | null
          listing_type: string | null
          lng: number | null
          marketing_budget: number | null
          marketing_email_sent: boolean
          marketing_email_sent_at: string | null
          max_occupants: number | null
          min_lease_months: number | null
          off_market_reason: string | null
          parking: number
          parking_notes: string | null
          pets_allowed: boolean | null
          postcode: string | null
          price: number
          price_formatted: string
          price_guide_high: number | null
          price_guide_low: number | null
          price_per_sqm: number | null
          property_age_years: number | null
          property_type: string | null
          rental_parking_type: string | null
          rental_weekly: number | null
          rental_yield_pct: number | null
          slug: string | null
          smoking_allowed: boolean | null
          sold_at: string | null
          sold_price: number | null
          sqm: number
          state: string
          status: string
          str_permitted: boolean | null
          strata_fees_quarterly: number | null
          study_rooms: number | null
          suburb: string
          title: string
          translation_status: string | null
          translations: Json | null
          translations_generated_at: string | null
          updated_at: string
          utilities_included: string[] | null
          vendor_email: string | null
          vendor_id: string | null
          vendor_name: string | null
          vendor_phone: string | null
          video_url: string | null
          views: number
          virtual_tour_url: string | null
          water_included: boolean | null
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
      record_auction_bid: {
        Args: {
          p_auction_id: string
          p_bid_amount: number
          p_bid_source?: string
          p_bid_type?: Database["public"]["Enums"]["bid_type"]
          p_notes?: string
          p_registration_id?: string
        }
        Returns: Json
      }
      refresh_agent_rating: { Args: { p_agent_id: string }; Returns: undefined }
      schools_within_km: {
        Args: { p_km: number; p_lat: number; p_lng: number }
        Returns: {
          distance_km: number
          id: string
          name: string
        }[]
      }
      suburb_sold_stats: {
        Args: {
          p_bedrooms: number
          p_months?: number
          p_state: string
          p_suburb: string
        }
        Returns: {
          avg_days_on_market: number
          avg_price_sqm: number
          count: number
          max_price: number
          median_price: number
          min_price: number
        }[]
      }
      track_cma_view: { Args: { p_share_token: string }; Returns: Json }
    }
    Enums: {
      agency_member_role: "owner" | "admin" | "agent" | "principal"
      app_role:
        | "user"
        | "agent"
        | "admin"
        | "principal"
        | "property_manager"
        | "partner"
        | "strata_manager"
      auction_status:
        | "scheduled"
        | "open"
        | "live"
        | "sold"
        | "sold_prior"
        | "sold_after"
        | "passed_in"
        | "withdrawn"
        | "postponed"
      bid_type: "genuine" | "vendor" | "opening"
      id_type:
        | "drivers_licence"
        | "passport"
        | "medicare_card"
        | "proof_of_age_card"
      offer_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "expired"
        | "withdrawn"
      partner_member_role: "owner" | "member"
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
      app_role: [
        "user",
        "agent",
        "admin",
        "principal",
        "property_manager",
        "partner",
        "strata_manager",
      ],
      auction_status: [
        "scheduled",
        "open",
        "live",
        "sold",
        "sold_prior",
        "sold_after",
        "passed_in",
        "withdrawn",
        "postponed",
      ],
      bid_type: ["genuine", "vendor", "opening"],
      id_type: [
        "drivers_licence",
        "passport",
        "medicare_card",
        "proof_of_age_card",
      ],
      offer_status: ["pending", "accepted", "rejected", "expired", "withdrawn"],
      partner_member_role: ["owner", "member"],
    },
  },
} as const
