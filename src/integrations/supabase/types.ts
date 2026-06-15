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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admin_notifications: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_read: boolean
          message: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_read?: boolean
          message: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_read?: boolean
          message?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      cashfree_services: {
        Row: {
          app_id: string | null
          assigned_use: string
          config: Json
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_active: boolean
          is_test_mode: boolean
          priority: number
          secret_key: string | null
          service_key: string
          updated_at: string
        }
        Insert: {
          app_id?: string | null
          assigned_use?: string
          config?: Json
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean
          is_test_mode?: boolean
          priority?: number
          secret_key?: string | null
          service_key: string
          updated_at?: string
        }
        Update: {
          app_id?: string | null
          assigned_use?: string
          config?: Json
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          is_test_mode?: boolean
          priority?: number
          secret_key?: string | null
          service_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      catalog_items: {
        Row: {
          category_id: string
          created_at: string
          created_by: string | null
          description: string | null
          external_url: string | null
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean
          is_featured_home: boolean
          is_listed: boolean
          is_recommended: boolean
          name: string
          price_max: number | null
          price_min: number | null
          slug: string
          sort_order: number
          status: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          external_url?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured_home?: boolean
          is_listed?: boolean
          is_recommended?: boolean
          name: string
          price_max?: number | null
          price_min?: number | null
          slug: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          external_url?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          is_featured_home?: boolean
          is_listed?: boolean
          is_recommended?: boolean
          name?: string
          price_max?: number | null
          price_min?: number | null
          slug?: string
          sort_order?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "catalog_items_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      catalog_types: {
        Row: {
          code: string
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean
          lead_cost_coins: number
          lead_price_inr: number | null
          max_vendors_per_lead: number | null
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
          type_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          lead_cost_coins?: number
          lead_price_inr?: number | null
          max_vendors_per_lead?: number | null
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
          type_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          lead_cost_coins?: number
          lead_price_inr?: number | null
          max_vendors_per_lead?: number | null
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
          type_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "categories_type_id_fkey"
            columns: ["type_id"]
            isOneToOne: false
            referencedRelation: "catalog_types"
            referencedColumns: ["id"]
          },
        ]
      }
      coin_packs: {
        Row: {
          bonus_coins: number
          coins: number
          created_at: string
          id: string
          is_active: boolean
          pack_name: string
          price_inr: number
          sort_order: number
          updated_at: string
        }
        Insert: {
          bonus_coins?: number
          coins: number
          created_at?: string
          id?: string
          is_active?: boolean
          pack_name: string
          price_inr: number
          sort_order?: number
          updated_at?: string
        }
        Update: {
          bonus_coins?: number
          coins?: number
          created_at?: string
          id?: string
          is_active?: boolean
          pack_name?: string
          price_inr?: number
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      coin_pricing_config: {
        Row: {
          coin_rate_inr: number
          gst_percent: number
          id: string
          max_purchase_coins: number
          min_purchase_coins: number
          total_supply: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          coin_rate_inr?: number
          gst_percent?: number
          id?: string
          max_purchase_coins?: number
          min_purchase_coins?: number
          total_supply?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          coin_rate_inr?: number
          gst_percent?: number
          id?: string
          max_purchase_coins?: number
          min_purchase_coins?: number
          total_supply?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      coin_transfers: {
        Row: {
          coins: number
          created_at: string
          id: string
          note: string | null
          receiver_id: string
          sender_id: string
        }
        Insert: {
          coins: number
          created_at?: string
          id?: string
          note?: string | null
          receiver_id: string
          sender_id: string
        }
        Update: {
          coins?: number
          created_at?: string
          id?: string
          note?: string | null
          receiver_id?: string
          sender_id?: string
        }
        Relationships: []
      }
      customer_form_toggles: {
        Row: {
          enabled: boolean
          field_key: string
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          enabled?: boolean
          field_key: string
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          enabled?: boolean
          field_key?: string
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      customer_profile_audit: {
        Row: {
          changed_by: string | null
          created_at: string
          customer_user_id: string
          field_name: string
          id: string
          ip_address: string | null
          new_value: string | null
          old_value: string | null
          user_agent: string | null
          verified_via_otp: boolean
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          customer_user_id: string
          field_name: string
          id?: string
          ip_address?: string | null
          new_value?: string | null
          old_value?: string | null
          user_agent?: string | null
          verified_via_otp?: boolean
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          customer_user_id?: string
          field_name?: string
          id?: string
          ip_address?: string | null
          new_value?: string | null
          old_value?: string | null
          user_agent?: string | null
          verified_via_otp?: boolean
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          admin_notes: string | null
          assigned_to: string | null
          avatar_url: string | null
          card_accent_color: string | null
          card_back_image_url: string | null
          card_custom_fields: Json
          card_field_visibility: Json
          card_link_url: string | null
          card_share_count: number
          card_view_count: number
          created_at: string
          email: string | null
          gender: string | null
          id: string
          is_blocked: boolean
          name: string | null
          phone: string | null
          referral_code: string | null
          shop_logo_url: string | null
          shop_name: string | null
          shop_url: string | null
          signup_method: string | null
          status: string
          support_code: string | null
          tags: string[] | null
          updated_at: string
          upi_id: string | null
          user_id: string
          verified: boolean
        }
        Insert: {
          address?: string | null
          admin_notes?: string | null
          assigned_to?: string | null
          avatar_url?: string | null
          card_accent_color?: string | null
          card_back_image_url?: string | null
          card_custom_fields?: Json
          card_field_visibility?: Json
          card_link_url?: string | null
          card_share_count?: number
          card_view_count?: number
          created_at?: string
          email?: string | null
          gender?: string | null
          id?: string
          is_blocked?: boolean
          name?: string | null
          phone?: string | null
          referral_code?: string | null
          shop_logo_url?: string | null
          shop_name?: string | null
          shop_url?: string | null
          signup_method?: string | null
          status?: string
          support_code?: string | null
          tags?: string[] | null
          updated_at?: string
          upi_id?: string | null
          user_id: string
          verified?: boolean
        }
        Update: {
          address?: string | null
          admin_notes?: string | null
          assigned_to?: string | null
          avatar_url?: string | null
          card_accent_color?: string | null
          card_back_image_url?: string | null
          card_custom_fields?: Json
          card_field_visibility?: Json
          card_link_url?: string | null
          card_share_count?: number
          card_view_count?: number
          created_at?: string
          email?: string | null
          gender?: string | null
          id?: string
          is_blocked?: boolean
          name?: string | null
          phone?: string | null
          referral_code?: string | null
          shop_logo_url?: string | null
          shop_name?: string | null
          shop_url?: string | null
          signup_method?: string | null
          status?: string
          support_code?: string | null
          tags?: string[] | null
          updated_at?: string
          upi_id?: string | null
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      device_tokens: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          last_seen_at: string
          platform: string
          token: string
          topics: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string
          platform?: string
          token: string
          topics?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          last_seen_at?: string
          platform?: string
          token?: string
          topics?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      feedback_reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          id: string
          message: string
          page_path: string | null
          page_title: string | null
          reporter_role: string
          resolved_at: string | null
          screenshot_url: string | null
          status: string
          updated_at: string
          user_agent: string | null
          user_id: string | null
          viewport: string | null
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          message: string
          page_path?: string | null
          page_title?: string | null
          reporter_role?: string
          resolved_at?: string | null
          screenshot_url?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
          viewport?: string | null
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          id?: string
          message?: string
          page_path?: string | null
          page_title?: string | null
          reporter_role?: string
          resolved_at?: string | null
          screenshot_url?: string | null
          status?: string
          updated_at?: string
          user_agent?: string | null
          user_id?: string | null
          viewport?: string | null
        }
        Relationships: []
      }
      firebase_services: {
        Row: {
          app_id: string | null
          assigned_use: string
          config: Json
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_active: boolean
          is_test_mode: boolean
          priority: number
          project_id: string | null
          sender_id: string | null
          server_key: string | null
          service_account_json: string | null
          service_key: string
          updated_at: string
          web_api_key: string | null
        }
        Insert: {
          app_id?: string | null
          assigned_use?: string
          config?: Json
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean
          is_test_mode?: boolean
          priority?: number
          project_id?: string | null
          sender_id?: string | null
          server_key?: string | null
          service_account_json?: string | null
          service_key: string
          updated_at?: string
          web_api_key?: string | null
        }
        Update: {
          app_id?: string | null
          assigned_use?: string
          config?: Json
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          is_test_mode?: boolean
          priority?: number
          project_id?: string | null
          sender_id?: string | null
          server_key?: string | null
          service_account_json?: string | null
          service_key?: string
          updated_at?: string
          web_api_key?: string | null
        }
        Relationships: []
      }
      form_schemas: {
        Row: {
          created_at: string
          form_type: string
          id: string
          is_active: boolean
          notes: string | null
          payment_after_step: number | null
          payment_amount_inr: number | null
          payment_purpose: string | null
          schema: Json
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          created_at?: string
          form_type: string
          id?: string
          is_active?: boolean
          notes?: string | null
          payment_after_step?: number | null
          payment_amount_inr?: number | null
          payment_purpose?: string | null
          schema?: Json
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          form_type?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          payment_after_step?: number | null
          payment_amount_inr?: number | null
          payment_purpose?: string | null
          schema?: Json
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: []
      }
      integration_modules: {
        Row: {
          category: string
          config: Json
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_configured: boolean
          is_enabled: boolean
          last_checked_at: string | null
          module_key: string
          status: string
          updated_at: string
        }
        Insert: {
          category: string
          config?: Json
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          is_configured?: boolean
          is_enabled?: boolean
          last_checked_at?: string | null
          module_key: string
          status?: string
          updated_at?: string
        }
        Update: {
          category?: string
          config?: Json
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_configured?: boolean
          is_enabled?: boolean
          last_checked_at?: string | null
          module_key?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      integration_providers: {
        Row: {
          category: string
          config: Json
          created_at: string
          display_name: string
          id: string
          is_active: boolean
          is_test_mode: boolean
          notes: string | null
          provider_key: string
          updated_at: string
        }
        Insert: {
          category: string
          config?: Json
          created_at?: string
          display_name: string
          id?: string
          is_active?: boolean
          is_test_mode?: boolean
          notes?: string | null
          provider_key: string
          updated_at?: string
        }
        Update: {
          category?: string
          config?: Json
          created_at?: string
          display_name?: string
          id?: string
          is_active?: boolean
          is_test_mode?: boolean
          notes?: string | null
          provider_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      item_variations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          image_url: string | null
          is_active: boolean
          item_id: string
          name: string
          price_max: number | null
          price_min: number | null
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          item_id: string
          name: string
          price_max?: number | null
          price_min?: number | null
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          item_id?: string
          name?: string
          price_max?: number | null
          price_min?: number | null
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_variations_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_providers: {
        Row: {
          api_key: string | null
          base_url: string | null
          client_id: string | null
          client_secret: string | null
          created_at: string
          display_name: string
          extra_config: Json
          id: string
          is_active: boolean
          is_sandbox: boolean
          provider: string
          supported_checks: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          api_key?: string | null
          base_url?: string | null
          client_id?: string | null
          client_secret?: string | null
          created_at?: string
          display_name: string
          extra_config?: Json
          id?: string
          is_active?: boolean
          is_sandbox?: boolean
          provider: string
          supported_checks?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          api_key?: string | null
          base_url?: string | null
          client_id?: string | null
          client_secret?: string | null
          created_at?: string
          display_name?: string
          extra_config?: Json
          id?: string
          is_active?: boolean
          is_sandbox?: boolean
          provider?: string
          supported_checks?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      kyc_verifications: {
        Row: {
          check_type: string
          created_at: string
          document_number: string | null
          document_urls: Json
          id: string
          method: string
          provider: string | null
          reference_id: string | null
          request_payload: Json
          response_payload: Json
          reviewer_id: string | null
          reviewer_notes: string | null
          status: string
          subject_type: string
          subject_user_id: string | null
          updated_at: string
          verified_at: string | null
        }
        Insert: {
          check_type: string
          created_at?: string
          document_number?: string | null
          document_urls?: Json
          id?: string
          method?: string
          provider?: string | null
          reference_id?: string | null
          request_payload?: Json
          response_payload?: Json
          reviewer_id?: string | null
          reviewer_notes?: string | null
          status?: string
          subject_type: string
          subject_user_id?: string | null
          updated_at?: string
          verified_at?: string | null
        }
        Update: {
          check_type?: string
          created_at?: string
          document_number?: string | null
          document_urls?: Json
          id?: string
          method?: string
          provider?: string | null
          reference_id?: string | null
          request_payload?: Json
          response_payload?: Json
          reviewer_id?: string | null
          reviewer_notes?: string | null
          status?: string
          subject_type?: string
          subject_user_id?: string | null
          updated_at?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      lead_messages: {
        Row: {
          attachment: Json
          body: string | null
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          id: string
          image_url: string | null
          is_deleted: boolean
          lead_id: string
          original_body: string | null
          read_at: string | null
          recipient_id: string | null
          sender_id: string
          sender_role: string
        }
        Insert: {
          attachment?: Json
          body?: string | null
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          lead_id: string
          original_body?: string | null
          read_at?: string | null
          recipient_id?: string | null
          sender_id: string
          sender_role: string
        }
        Update: {
          attachment?: Json
          body?: string | null
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          lead_id?: string
          original_body?: string | null
          read_at?: string | null
          recipient_id?: string | null
          sender_id?: string
          sender_role?: string
        }
        Relationships: []
      }
      lead_notifications: {
        Row: {
          auto_accept_at: string
          created_at: string
          id: string
          lead_id: string
          quoted_price: number | null
          responded_at: string | null
          status: string
          sub_category_name: string
          vendor_id: string
          vendor_note: string | null
          vendor_started_at: string | null
        }
        Insert: {
          auto_accept_at?: string
          created_at?: string
          id?: string
          lead_id: string
          quoted_price?: number | null
          responded_at?: string | null
          status?: string
          sub_category_name: string
          vendor_id: string
          vendor_note?: string | null
          vendor_started_at?: string | null
        }
        Update: {
          auto_accept_at?: string
          created_at?: string
          id?: string
          lead_id?: string
          quoted_price?: number | null
          responded_at?: string | null
          status?: string
          sub_category_name?: string
          vendor_id?: string
          vendor_note?: string | null
          vendor_started_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_notifications_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_source_multipliers: {
        Row: {
          id: string
          is_active: boolean
          multiplier: number
          sort_order: number
          source_key: string
          source_label: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          id?: string
          is_active?: boolean
          multiplier?: number
          sort_order?: number
          source_key: string
          source_label: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          id?: string
          is_active?: boolean
          multiplier?: number
          sort_order?: number
          source_key?: string
          source_label?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      leads: {
        Row: {
          accepted_at: string | null
          accepted_count: number
          accepted_vendor_id: string | null
          accepted_vendor_ids: string[]
          address: string | null
          created_at: string
          customer_approved_vendor_id: string | null
          customer_id: string
          customer_name: string | null
          customer_phone: string | null
          id: string
          images: string[]
          is_remote: boolean
          item_ids: string[]
          item_names: string[]
          lat: number | null
          lead_price_inr: number
          lead_rating: number | null
          lead_review: string | null
          lng: number | null
          max_slots: number
          note: string | null
          root_category_id: string | null
          search_radius_km: number
          source: string
          status: string
          sub_category_id: string
          sub_category_name: string
          type_id: string | null
          updated_at: string
          vendor_types: string[]
        }
        Insert: {
          accepted_at?: string | null
          accepted_count?: number
          accepted_vendor_id?: string | null
          accepted_vendor_ids?: string[]
          address?: string | null
          created_at?: string
          customer_approved_vendor_id?: string | null
          customer_id: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          images?: string[]
          is_remote?: boolean
          item_ids?: string[]
          item_names?: string[]
          lat?: number | null
          lead_price_inr?: number
          lead_rating?: number | null
          lead_review?: string | null
          lng?: number | null
          max_slots?: number
          note?: string | null
          root_category_id?: string | null
          search_radius_km?: number
          source?: string
          status?: string
          sub_category_id: string
          sub_category_name: string
          type_id?: string | null
          updated_at?: string
          vendor_types?: string[]
        }
        Update: {
          accepted_at?: string | null
          accepted_count?: number
          accepted_vendor_id?: string | null
          accepted_vendor_ids?: string[]
          address?: string | null
          created_at?: string
          customer_approved_vendor_id?: string | null
          customer_id?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          images?: string[]
          is_remote?: boolean
          item_ids?: string[]
          item_names?: string[]
          lat?: number | null
          lead_price_inr?: number
          lead_rating?: number | null
          lead_review?: string | null
          lng?: number | null
          max_slots?: number
          note?: string | null
          root_category_id?: string | null
          search_radius_km?: number
          source?: string
          status?: string
          sub_category_id?: string
          sub_category_name?: string
          type_id?: string | null
          updated_at?: string
          vendor_types?: string[]
        }
        Relationships: []
      }
      leadx_rate_history: {
        Row: {
          id: string
          rate_inr: number
          recorded_at: string
        }
        Insert: {
          id?: string
          rate_inr: number
          recorded_at?: string
        }
        Update: {
          id?: string
          rate_inr?: number
          recorded_at?: string
        }
        Relationships: []
      }
      legal_pages: {
        Row: {
          body: string
          created_at: string
          hero_image_url: string | null
          id: string
          is_active: boolean
          slug: string
          sort_order: number
          title: string
          updated_at: string
          updated_by: string | null
          video_url: string | null
        }
        Insert: {
          body?: string
          created_at?: string
          hero_image_url?: string | null
          id?: string
          is_active?: boolean
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
          updated_by?: string | null
          video_url?: string | null
        }
        Update: {
          body?: string
          created_at?: string
          hero_image_url?: string | null
          id?: string
          is_active?: boolean
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
          updated_by?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      logistics_gateways: {
        Row: {
          config: Json
          display_name: string
          id: string
          is_active: boolean
          is_test_mode: boolean
          priority: number
          provider: string
          public_key: string | null
          supports_hyperlocal: boolean
          supports_intercity: boolean
          supports_international: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config?: Json
          display_name: string
          id?: string
          is_active?: boolean
          is_test_mode?: boolean
          priority?: number
          provider: string
          public_key?: string | null
          supports_hyperlocal?: boolean
          supports_intercity?: boolean
          supports_international?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config?: Json
          display_name?: string
          id?: string
          is_active?: boolean
          is_test_mode?: boolean
          priority?: number
          provider?: string
          public_key?: string | null
          supports_hyperlocal?: boolean
          supports_intercity?: boolean
          supports_international?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      maps_services: {
        Row: {
          api_key: string | null
          assigned_use: string
          client_id: string | null
          client_secret: string | null
          config: Json
          created_at: string
          description: string | null
          display_name: string
          id: string
          is_active: boolean
          is_test_mode: boolean
          map_sdk_key: string | null
          priority: number
          provider: string
          rest_key: string | null
          updated_at: string
        }
        Insert: {
          api_key?: string | null
          assigned_use?: string
          client_id?: string | null
          client_secret?: string | null
          config?: Json
          created_at?: string
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean
          is_test_mode?: boolean
          map_sdk_key?: string | null
          priority?: number
          provider: string
          rest_key?: string | null
          updated_at?: string
        }
        Update: {
          api_key?: string | null
          assigned_use?: string
          client_id?: string | null
          client_secret?: string | null
          config?: Json
          created_at?: string
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          is_test_mode?: boolean
          map_sdk_key?: string | null
          priority?: number
          provider?: string
          rest_key?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      notification_campaigns: {
        Row: {
          action_url: string | null
          body: string
          channels: Json
          created_at: string
          created_by: string | null
          delivered_count: number
          failed_count: number
          geo_filter: Json | null
          id: string
          image_url: string | null
          name: string
          notification_type: string
          schedule_at: string | null
          sent_count: number
          status: string
          target_segment: string | null
          title: string
          updated_at: string
        }
        Insert: {
          action_url?: string | null
          body: string
          channels?: Json
          created_at?: string
          created_by?: string | null
          delivered_count?: number
          failed_count?: number
          geo_filter?: Json | null
          id?: string
          image_url?: string | null
          name: string
          notification_type?: string
          schedule_at?: string | null
          sent_count?: number
          status?: string
          target_segment?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          action_url?: string | null
          body?: string
          channels?: Json
          created_at?: string
          created_by?: string | null
          delivered_count?: number
          failed_count?: number
          geo_filter?: Json | null
          id?: string
          image_url?: string | null
          name?: string
          notification_type?: string
          schedule_at?: string | null
          sent_count?: number
          status?: string
          target_segment?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_logs: {
        Row: {
          campaign_id: string | null
          channel: string | null
          created_at: string
          device_token: string | null
          error: string | null
          id: string
          payload: Json | null
          provider: string | null
          status: string
          trigger_id: string | null
          user_id: string | null
        }
        Insert: {
          campaign_id?: string | null
          channel?: string | null
          created_at?: string
          device_token?: string | null
          error?: string | null
          id?: string
          payload?: Json | null
          provider?: string | null
          status: string
          trigger_id?: string | null
          user_id?: string | null
        }
        Update: {
          campaign_id?: string | null
          channel?: string | null
          created_at?: string
          device_token?: string | null
          error?: string | null
          id?: string
          payload?: Json | null
          provider?: string | null
          status?: string
          trigger_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_logs_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "notification_campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_logs_trigger_id_fkey"
            columns: ["trigger_id"]
            isOneToOne: false
            referencedRelation: "notification_triggers"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_triggers: {
        Row: {
          action_url: string | null
          audience: string
          body: string
          channels: Json
          created_at: string
          display_name: string
          event_key: string
          id: string
          image_url: string | null
          is_active: boolean
          last_fired_at: string | null
          notification_type: string
          schedule_at: string | null
          title: string
          updated_at: string
        }
        Insert: {
          action_url?: string | null
          audience?: string
          body?: string
          channels?: Json
          created_at?: string
          display_name: string
          event_key: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          last_fired_at?: string | null
          notification_type?: string
          schedule_at?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          action_url?: string | null
          audience?: string
          body?: string
          channels?: Json
          created_at?: string
          display_name?: string
          event_key?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          last_fired_at?: string | null
          notification_type?: string
          schedule_at?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      onboarding_slides: {
        Row: {
          audience: string
          bg_color: string | null
          created_at: string
          cta_label: string
          id: string
          is_active: boolean
          media_type: string
          media_url: string
          position: number
          poster_url: string | null
          skip_allowed: boolean
          subtitle: string
          text_color: string | null
          title: string
          updated_at: string
        }
        Insert: {
          audience?: string
          bg_color?: string | null
          created_at?: string
          cta_label?: string
          id?: string
          is_active?: boolean
          media_type?: string
          media_url?: string
          position?: number
          poster_url?: string | null
          skip_allowed?: boolean
          subtitle?: string
          text_color?: string | null
          title?: string
          updated_at?: string
        }
        Update: {
          audience?: string
          bg_color?: string | null
          created_at?: string
          cta_label?: string
          id?: string
          is_active?: boolean
          media_type?: string
          media_url?: string
          position?: number
          poster_url?: string | null
          skip_allowed?: boolean
          subtitle?: string
          text_color?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      otp_codes: {
        Row: {
          attempts: number
          code_hash: string
          created_at: string
          expires_at: string
          id: string
          phone: string
          provider: string | null
          verified_at: string | null
        }
        Insert: {
          attempts?: number
          code_hash: string
          created_at?: string
          expires_at?: string
          id?: string
          phone: string
          provider?: string | null
          verified_at?: string | null
        }
        Update: {
          attempts?: number
          code_hash?: string
          created_at?: string
          expires_at?: string
          id?: string
          phone?: string
          provider?: string | null
          verified_at?: string | null
        }
        Relationships: []
      }
      payment_gateways: {
        Row: {
          config: Json
          display_name: string
          id: string
          is_active: boolean
          is_test_mode: boolean
          priority: number
          provider: string
          public_key: string | null
          purpose: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config?: Json
          display_name: string
          id?: string
          is_active?: boolean
          is_test_mode?: boolean
          priority?: number
          provider: string
          public_key?: string | null
          purpose?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config?: Json
          display_name?: string
          id?: string
          is_active?: boolean
          is_test_mode?: boolean
          priority?: number
          provider?: string
          public_key?: string | null
          purpose?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      referral_banners: {
        Row: {
          created_at: string
          cta_label: string | null
          cta_link: string | null
          id: string
          image_url: string | null
          is_active: boolean
          sort_order: number
          subtitle: string | null
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          cta_label?: string | null
          cta_link?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          cta_label?: string | null
          cta_link?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          sort_order?: number
          subtitle?: string | null
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      referral_campaigns: {
        Row: {
          created_at: string
          ends_at: string | null
          id: string
          is_active: boolean
          kind: string
          max_per_user: number | null
          min_order_value: number | null
          name: string
          release_trigger: string
          reward_amount: number
          starts_at: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          max_per_user?: number | null
          min_order_value?: number | null
          name: string
          release_trigger?: string
          reward_amount?: number
          starts_at?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          id?: string
          is_active?: boolean
          kind?: string
          max_per_user?: number | null
          min_order_value?: number | null
          name?: string
          release_trigger?: string
          reward_amount?: number
          starts_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          kind: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          kind?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          kind?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_progress: {
        Row: {
          became_seller: boolean
          became_seller_at: string | null
          first_order_placed: boolean
          first_order_placed_at: string | null
          id: string
          installed: boolean
          installed_at: string | null
          kyc_completed: boolean
          kyc_completed_at: string | null
          otp_verified: boolean
          otp_verified_at: string | null
          payment_completed: boolean
          payment_completed_at: string | null
          referral_id: string
          registered: boolean
          registered_at: string | null
          reward_released: boolean
          reward_released_at: string | null
          updated_at: string
        }
        Insert: {
          became_seller?: boolean
          became_seller_at?: string | null
          first_order_placed?: boolean
          first_order_placed_at?: string | null
          id?: string
          installed?: boolean
          installed_at?: string | null
          kyc_completed?: boolean
          kyc_completed_at?: string | null
          otp_verified?: boolean
          otp_verified_at?: string | null
          payment_completed?: boolean
          payment_completed_at?: string | null
          referral_id: string
          registered?: boolean
          registered_at?: string | null
          reward_released?: boolean
          reward_released_at?: string | null
          updated_at?: string
        }
        Update: {
          became_seller?: boolean
          became_seller_at?: string | null
          first_order_placed?: boolean
          first_order_placed_at?: string | null
          id?: string
          installed?: boolean
          installed_at?: string | null
          kyc_completed?: boolean
          kyc_completed_at?: string | null
          otp_verified?: boolean
          otp_verified_at?: string | null
          payment_completed?: boolean
          payment_completed_at?: string | null
          referral_id?: string
          registered?: boolean
          registered_at?: string | null
          reward_released?: boolean
          reward_released_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_progress_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: true
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_progress_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: true
            referencedRelation: "referrals_for_referrer"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_rewards: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          notes: string | null
          referral_id: string
          released_at: string | null
          status: string
          trigger: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          referral_id: string
          released_at?: string | null
          status?: string
          trigger: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          notes?: string | null
          referral_id?: string
          released_at?: string | null
          status?: string
          trigger?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "referral_rewards_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_rewards_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "referrals_for_referrer"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_settings: {
        Row: {
          default_customer_reward: number
          default_vendor_reward: number
          fraud_max_per_device: number
          fraud_max_per_ip: number
          id: number
          terms_text: string | null
          updated_at: string
        }
        Insert: {
          default_customer_reward?: number
          default_vendor_reward?: number
          fraud_max_per_device?: number
          fraud_max_per_ip?: number
          id?: number
          terms_text?: string | null
          updated_at?: string
        }
        Update: {
          default_customer_reward?: number
          default_vendor_reward?: number
          fraud_max_per_device?: number
          fraud_max_per_ip?: number
          id?: number
          terms_text?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          device_fingerprint: string | null
          id: string
          ip_address: string | null
          kind: string
          referred_phone: string | null
          referred_user_id: string | null
          referrer_user_id: string
          source: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          device_fingerprint?: string | null
          id?: string
          ip_address?: string | null
          kind?: string
          referred_phone?: string | null
          referred_user_id?: string | null
          referrer_user_id: string
          source?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          device_fingerprint?: string | null
          id?: string
          ip_address?: string | null
          kind?: string
          referred_phone?: string | null
          referred_user_id?: string | null
          referrer_user_id?: string
          source?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      sms_gateways: {
        Row: {
          config: Json
          display_name: string
          id: string
          is_active: boolean
          is_test_mode: boolean
          provider: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config?: Json
          display_name: string
          id?: string
          is_active?: boolean
          is_test_mode?: boolean
          provider: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config?: Json
          display_name?: string
          id?: string
          is_active?: boolean
          is_test_mode?: boolean
          provider?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      staff_profiles: {
        Row: {
          admin_notes: string | null
          assigned_to: string | null
          avatar_url: string | null
          created_at: string
          department: string | null
          designation: string | null
          email: string | null
          id: string
          is_blocked: boolean
          name: string | null
          phone: string | null
          status: string
          tags: string[] | null
          updated_at: string
          user_id: string
          verified: boolean
        }
        Insert: {
          admin_notes?: string | null
          assigned_to?: string | null
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          designation?: string | null
          email?: string | null
          id?: string
          is_blocked?: boolean
          name?: string | null
          phone?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          user_id: string
          verified?: boolean
        }
        Update: {
          admin_notes?: string | null
          assigned_to?: string | null
          avatar_url?: string | null
          created_at?: string
          department?: string | null
          designation?: string | null
          email?: string | null
          id?: string
          is_blocked?: boolean
          name?: string | null
          phone?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          user_id?: string
          verified?: boolean
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          created_at: string
          id: string
          kind: string
          message: string | null
          meta: Json
          provider: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          message?: string | null
          meta?: Json
          provider?: string | null
          status: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          message?: string | null
          meta?: Json
          provider?: string | null
          status?: string
        }
        Relationships: []
      }
      test_accounts: {
        Row: {
          created_at: string
          email: string | null
          enabled: boolean
          id: string
          label: string
          name: string | null
          notes: string | null
          otp_code: string
          phone: string
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          enabled?: boolean
          id?: string
          label?: string
          name?: string | null
          notes?: string | null
          otp_code?: string
          phone: string
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          enabled?: boolean
          id?: string
          label?: string
          name?: string | null
          notes?: string | null
          otp_code?: string
          phone?: string
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      theme_settings: {
        Row: {
          animation_speed: number
          assets: Json
          created_at: string
          fonts: Json
          icons_pack: string
          id: string
          is_active: boolean
          preset_name: string | null
          radius_scale: number
          scope: string
          shadow_intensity: number
          tokens: Json
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          animation_speed?: number
          assets?: Json
          created_at?: string
          fonts?: Json
          icons_pack?: string
          id?: string
          is_active?: boolean
          preset_name?: string | null
          radius_scale?: number
          scope: string
          shadow_intensity?: number
          tokens?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          animation_speed?: number
          assets?: Json
          created_at?: string
          fonts?: Json
          icons_pack?: string
          id?: string
          is_active?: boolean
          preset_name?: string | null
          radius_scale?: number
          scope?: string
          shadow_intensity?: number
          tokens?: Json
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      user_geo: {
        Row: {
          accuracy: number | null
          geohash: string | null
          lat: number | null
          lng: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          accuracy?: number | null
          geohash?: string | null
          lat?: number | null
          lng?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          accuracy?: number | null
          geohash?: string | null
          lat?: number | null
          lng?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_needs: {
        Row: {
          created_at: string
          id: string
          images: string[]
          item_id: string | null
          notes: string
          quantity: number
          root_category_id: string | null
          status: string
          sub_category_id: string | null
          title: string
          type_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          images?: string[]
          item_id?: string | null
          notes?: string
          quantity?: number
          root_category_id?: string | null
          status?: string
          sub_category_id?: string | null
          title?: string
          type_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          images?: string[]
          item_id?: string | null
          notes?: string
          quantity?: number
          root_category_id?: string | null
          status?: string
          sub_category_id?: string | null
          title?: string
          type_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      vendor_item_mappings: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          item_id: string
          notes: string | null
          price_max: number | null
          price_min: number | null
          updated_at: string
          variations: string[]
          vendor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          item_id: string
          notes?: string | null
          price_max?: number | null
          price_min?: number | null
          updated_at?: string
          variations?: string[]
          vendor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          item_id?: string
          notes?: string | null
          price_max?: number | null
          price_min?: number | null
          updated_at?: string
          variations?: string[]
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_item_mappings_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "catalog_items"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_status_updates: {
        Row: {
          created_at: string
          customer_read_at: string | null
          id: string
          lead_id: string
          message: string | null
          status_key: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          customer_read_at?: string | null
          id?: string
          lead_id: string
          message?: string | null
          status_key: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          customer_read_at?: string | null
          id?: string
          lead_id?: string
          message?: string | null
          status_key?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_status_updates_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_variation_mappings: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          updated_at: string
          variation_id: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          variation_id: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          updated_at?: string
          variation_id?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendor_variation_mappings_variation_id_fkey"
            columns: ["variation_id"]
            isOneToOne: false
            referencedRelation: "item_variations"
            referencedColumns: ["id"]
          },
        ]
      }
      vendor_wallets: {
        Row: {
          auto_topup_enabled: boolean
          created_at: string
          id: string
          leads_total: number
          leads_used: number
          leadx_coins: number
          lifetime_coins_purchased: number
          lifetime_coins_used: number
          lifetime_recharged_paise: number
          lifetime_spent_paise: number
          low_balance_threshold_paise: number
          service_balance_paise: number
          updated_at: string
          vendor_id: string
        }
        Insert: {
          auto_topup_enabled?: boolean
          created_at?: string
          id?: string
          leads_total?: number
          leads_used?: number
          leadx_coins?: number
          lifetime_coins_purchased?: number
          lifetime_coins_used?: number
          lifetime_recharged_paise?: number
          lifetime_spent_paise?: number
          low_balance_threshold_paise?: number
          service_balance_paise?: number
          updated_at?: string
          vendor_id: string
        }
        Update: {
          auto_topup_enabled?: boolean
          created_at?: string
          id?: string
          leads_total?: number
          leads_used?: number
          leadx_coins?: number
          lifetime_coins_purchased?: number
          lifetime_coins_used?: number
          lifetime_recharged_paise?: number
          lifetime_spent_paise?: number
          low_balance_threshold_paise?: number
          service_balance_paise?: number
          updated_at?: string
          vendor_id?: string
        }
        Relationships: []
      }
      vendors: {
        Row: {
          aadhaar: string | null
          admin_notes: string | null
          assigned_to: string | null
          auto_accept_leads: boolean
          avatar_url: string | null
          business_name: string | null
          cover_image_url: string | null
          cover_video_url: string | null
          created_at: string
          current_team_count: number
          deals_in: string | null
          email: string | null
          entity: string | null
          facebook: string | null
          google_place_id: string | null
          gst: string | null
          id: string
          instagram: string | null
          is_blocked: boolean
          is_online: boolean
          is_premium: boolean
          is_remote_capable: boolean
          lat: number | null
          live_lat: number | null
          live_lng: number | null
          lng: number | null
          location_updated_at: string | null
          manager_email: string | null
          operation_mode: string
          owner_name: string | null
          pan: string | null
          plan: string | null
          referral: string | null
          role: string | null
          service_radius_km: number
          shop_banner_urls: string[]
          shop_bio: string | null
          shop_cta_label: string
          status: string
          tags: string[] | null
          trade: string | null
          updated_at: string
          user_id: string
          van_count: number
          vendor_type: string
          verified: boolean
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          aadhaar?: string | null
          admin_notes?: string | null
          assigned_to?: string | null
          auto_accept_leads?: boolean
          avatar_url?: string | null
          business_name?: string | null
          cover_image_url?: string | null
          cover_video_url?: string | null
          created_at?: string
          current_team_count?: number
          deals_in?: string | null
          email?: string | null
          entity?: string | null
          facebook?: string | null
          google_place_id?: string | null
          gst?: string | null
          id?: string
          instagram?: string | null
          is_blocked?: boolean
          is_online?: boolean
          is_premium?: boolean
          is_remote_capable?: boolean
          lat?: number | null
          live_lat?: number | null
          live_lng?: number | null
          lng?: number | null
          location_updated_at?: string | null
          manager_email?: string | null
          operation_mode?: string
          owner_name?: string | null
          pan?: string | null
          plan?: string | null
          referral?: string | null
          role?: string | null
          service_radius_km?: number
          shop_banner_urls?: string[]
          shop_bio?: string | null
          shop_cta_label?: string
          status?: string
          tags?: string[] | null
          trade?: string | null
          updated_at?: string
          user_id: string
          van_count?: number
          vendor_type?: string
          verified?: boolean
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          aadhaar?: string | null
          admin_notes?: string | null
          assigned_to?: string | null
          auto_accept_leads?: boolean
          avatar_url?: string | null
          business_name?: string | null
          cover_image_url?: string | null
          cover_video_url?: string | null
          created_at?: string
          current_team_count?: number
          deals_in?: string | null
          email?: string | null
          entity?: string | null
          facebook?: string | null
          google_place_id?: string | null
          gst?: string | null
          id?: string
          instagram?: string | null
          is_blocked?: boolean
          is_online?: boolean
          is_premium?: boolean
          is_remote_capable?: boolean
          lat?: number | null
          live_lat?: number | null
          live_lng?: number | null
          lng?: number | null
          location_updated_at?: string | null
          manager_email?: string | null
          operation_mode?: string
          owner_name?: string | null
          pan?: string | null
          plan?: string | null
          referral?: string | null
          role?: string | null
          service_radius_km?: number
          shop_banner_urls?: string[]
          shop_bio?: string | null
          shop_cta_label?: string
          status?: string
          tags?: string[] | null
          trade?: string | null
          updated_at?: string
          user_id?: string
          van_count?: number
          vendor_type?: string
          verified?: boolean
          website?: string | null
          whatsapp?: string | null
        }
        Relationships: []
      }
      wallet_recharge_packs: {
        Row: {
          amount_inr: number
          bonus_inr: number
          created_at: string
          id: string
          is_active: boolean
          label: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          amount_inr: number
          bonus_inr?: number
          created_at?: string
          id?: string
          is_active?: boolean
          label: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          amount_inr?: number
          bonus_inr?: number
          created_at?: string
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount_paise: number
          balance_after_paise: number | null
          coin_balance_after: number | null
          coins: number
          created_at: string
          description: string | null
          direction: string
          gateway: string | null
          id: string
          metadata: Json
          reference_id: string | null
          status: string
          txn_type: string
          vendor_id: string
          wallet_kind: string
        }
        Insert: {
          amount_paise?: number
          balance_after_paise?: number | null
          coin_balance_after?: number | null
          coins?: number
          created_at?: string
          description?: string | null
          direction: string
          gateway?: string | null
          id?: string
          metadata?: Json
          reference_id?: string | null
          status?: string
          txn_type: string
          vendor_id: string
          wallet_kind: string
        }
        Update: {
          amount_paise?: number
          balance_after_paise?: number | null
          coin_balance_after?: number | null
          coins?: number
          created_at?: string
          description?: string | null
          direction?: string
          gateway?: string | null
          id?: string
          metadata?: Json
          reference_id?: string | null
          status?: string
          txn_type?: string
          vendor_id?: string
          wallet_kind?: string
        }
        Relationships: []
      }
      web_apk_releases: {
        Row: {
          audience: string
          build_number: number | null
          changelog: string | null
          created_at: string
          external_url: string | null
          file_url: string | null
          id: string
          is_active: boolean
          is_current: boolean
          play_store_url: string | null
          released_at: string
          size_mb: number | null
          updated_at: string
          updated_by: string | null
          version: string
        }
        Insert: {
          audience: string
          build_number?: number | null
          changelog?: string | null
          created_at?: string
          external_url?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean
          is_current?: boolean
          play_store_url?: string | null
          released_at?: string
          size_mb?: number | null
          updated_at?: string
          updated_by?: string | null
          version: string
        }
        Update: {
          audience?: string
          build_number?: number | null
          changelog?: string | null
          created_at?: string
          external_url?: string | null
          file_url?: string | null
          id?: string
          is_active?: boolean
          is_current?: boolean
          play_store_url?: string | null
          released_at?: string
          size_mb?: number | null
          updated_at?: string
          updated_by?: string | null
          version?: string
        }
        Relationships: []
      }
      web_blog_posts: {
        Row: {
          author_avatar: string | null
          author_name: string | null
          body_md: string
          cover_image_alt: string | null
          cover_image_url: string | null
          created_at: string
          excerpt: string | null
          id: string
          is_published: boolean
          og_image_url: string | null
          published_at: string | null
          reading_minutes: number | null
          seo_description: string | null
          seo_keywords: string[]
          seo_title: string | null
          slug: string
          tags: string[]
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          author_avatar?: string | null
          author_name?: string | null
          body_md?: string
          cover_image_alt?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          og_image_url?: string | null
          published_at?: string | null
          reading_minutes?: number | null
          seo_description?: string | null
          seo_keywords?: string[]
          seo_title?: string | null
          slug: string
          tags?: string[]
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          author_avatar?: string | null
          author_name?: string | null
          body_md?: string
          cover_image_alt?: string | null
          cover_image_url?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          is_published?: boolean
          og_image_url?: string | null
          published_at?: string | null
          reading_minutes?: number | null
          seo_description?: string | null
          seo_keywords?: string[]
          seo_title?: string | null
          slug?: string
          tags?: string[]
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      web_brand_logos: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          link_url: string | null
          logo_url: string
          name: string
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          link_url?: string | null
          logo_url: string
          name: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          link_url?: string | null
          logo_url?: string
          name?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      web_content_blocks: {
        Row: {
          background: string | null
          block_type: string
          body: string | null
          created_at: string
          cta_label: string | null
          cta_url: string | null
          heading: string | null
          id: string
          image_alt: string | null
          image_url: string | null
          is_active: boolean
          items: Json
          page_slug: string
          sort_order: number
          subheading: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          background?: string | null
          block_type?: string
          body?: string | null
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          heading?: string | null
          id?: string
          image_alt?: string | null
          image_url?: string | null
          is_active?: boolean
          items?: Json
          page_slug: string
          sort_order?: number
          subheading?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          background?: string | null
          block_type?: string
          body?: string | null
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          heading?: string | null
          id?: string
          image_alt?: string | null
          image_url?: string | null
          is_active?: boolean
          items?: Json
          page_slug?: string
          sort_order?: number
          subheading?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      web_faqs: {
        Row: {
          answer: string
          created_at: string
          id: string
          is_active: boolean
          page_slug: string
          question: string
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          answer: string
          created_at?: string
          id?: string
          is_active?: boolean
          page_slug?: string
          question: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          answer?: string
          created_at?: string
          id?: string
          is_active?: boolean
          page_slug?: string
          question?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      web_form_submissions: {
        Row: {
          created_at: string
          data: Json
          form_id: string
          id: string
          ip_hash: string | null
          source_page: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          data?: Json
          form_id: string
          id?: string
          ip_hash?: string | null
          source_page?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          data?: Json
          form_id?: string
          id?: string
          ip_hash?: string | null
          source_page?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "web_form_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "web_forms"
            referencedColumns: ["id"]
          },
        ]
      }
      web_forms: {
        Row: {
          created_at: string
          description: string | null
          fields: Json
          id: string
          is_active: boolean
          name: string
          notify_emails: string[]
          redirect_url: string | null
          seo_description: string | null
          seo_title: string | null
          slug: string
          submit_label: string
          success_message: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          fields?: Json
          id?: string
          is_active?: boolean
          name: string
          notify_emails?: string[]
          redirect_url?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          submit_label?: string
          success_message?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          fields?: Json
          id?: string
          is_active?: boolean
          name?: string
          notify_emails?: string[]
          redirect_url?: string | null
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          submit_label?: string
          success_message?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      web_hero_sections: {
        Row: {
          alignment: string
          created_at: string
          cta_label: string | null
          cta_url: string | null
          eyebrow: string | null
          id: string
          image_alt: string | null
          image_url: string | null
          is_active: boolean
          page_slug: string
          secondary_cta_label: string | null
          secondary_cta_url: string | null
          subtitle: string | null
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          alignment?: string
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          eyebrow?: string | null
          id?: string
          image_alt?: string | null
          image_url?: string | null
          is_active?: boolean
          page_slug: string
          secondary_cta_label?: string | null
          secondary_cta_url?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          alignment?: string
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          eyebrow?: string | null
          id?: string
          image_alt?: string | null
          image_url?: string | null
          is_active?: boolean
          page_slug?: string
          secondary_cta_label?: string | null
          secondary_cta_url?: string | null
          subtitle?: string | null
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      web_media_assets: {
        Row: {
          alt: string
          bucket: string
          bucket_path: string
          created_at: string
          file_size: number | null
          id: string
          mime: string | null
          public_url: string
          tags: string[]
          uploaded_by: string | null
        }
        Insert: {
          alt?: string
          bucket?: string
          bucket_path: string
          created_at?: string
          file_size?: number | null
          id?: string
          mime?: string | null
          public_url: string
          tags?: string[]
          uploaded_by?: string | null
        }
        Update: {
          alt?: string
          bucket?: string
          bucket_path?: string
          created_at?: string
          file_size?: number | null
          id?: string
          mime?: string | null
          public_url?: string
          tags?: string[]
          uploaded_by?: string | null
        }
        Relationships: []
      }
      web_offers: {
        Row: {
          bg_color: string
          body: string | null
          created_at: string
          cta_label: string | null
          cta_url: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          starts_at: string | null
          text_color: string
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          bg_color?: string
          body?: string | null
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          starts_at?: string | null
          text_color?: string
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          bg_color?: string
          body?: string | null
          created_at?: string
          cta_label?: string | null
          cta_url?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          starts_at?: string | null
          text_color?: string
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      web_pages: {
        Row: {
          canonical_path: string | null
          created_at: string
          id: string
          is_active: boolean
          og_image_url: string | null
          page_title: string
          schema_json: Json
          seo_description: string
          seo_keywords: string[]
          seo_title: string
          slug: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          canonical_path?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          og_image_url?: string | null
          page_title?: string
          schema_json?: Json
          seo_description?: string
          seo_keywords?: string[]
          seo_title?: string
          slug: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          canonical_path?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          og_image_url?: string | null
          page_title?: string
          schema_json?: Json
          seo_description?: string
          seo_keywords?: string[]
          seo_title?: string
          slug?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      web_pricing_plans: {
        Row: {
          badge_label: string | null
          created_at: string
          cta_label: string
          cta_url: string
          currency: string
          description: string | null
          features: string[]
          id: string
          is_active: boolean
          is_featured: boolean
          name: string
          period: string
          price: string
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          badge_label?: string | null
          created_at?: string
          cta_label?: string
          cta_url?: string
          currency?: string
          description?: string | null
          features?: string[]
          id?: string
          is_active?: boolean
          is_featured?: boolean
          name: string
          period?: string
          price?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          badge_label?: string | null
          created_at?: string
          cta_label?: string
          cta_url?: string
          currency?: string
          description?: string | null
          features?: string[]
          id?: string
          is_active?: boolean
          is_featured?: boolean
          name?: string
          period?: string
          price?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      web_testimonials: {
        Row: {
          author_name: string
          avatar_url: string | null
          company: string | null
          created_at: string
          id: string
          is_active: boolean
          quote: string
          rating: number | null
          role: string | null
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          author_name: string
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          quote: string
          rating?: number | null
          role?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          author_name?: string
          avatar_url?: string | null
          company?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          quote?: string
          rating?: number | null
          role?: string | null
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      web_virtual_devices: {
        Row: {
          created_at: string
          icon: string | null
          id: string
          is_active: boolean
          label: string
          sort_order: number
          updated_at: string
          updated_by: string | null
          url: string
        }
        Insert: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          label: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
          url: string
        }
        Update: {
          created_at?: string
          icon?: string | null
          id?: string
          is_active?: boolean
          label?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
          url?: string
        }
        Relationships: []
      }
      whatsapp_providers: {
        Row: {
          access_token: string | null
          api_base_url: string | null
          app_id: string | null
          app_secret: string | null
          assigned_use: string
          business_account_id: string | null
          config: Json
          created_at: string
          default_template: string | null
          description: string | null
          display_name: string
          id: string
          is_active: boolean
          is_test_mode: boolean
          phone_number_id: string | null
          priority: number
          provider: string
          quality_rating: string | null
          template_namespace: string | null
          updated_at: string
          webhook_verify_token: string | null
        }
        Insert: {
          access_token?: string | null
          api_base_url?: string | null
          app_id?: string | null
          app_secret?: string | null
          assigned_use?: string
          business_account_id?: string | null
          config?: Json
          created_at?: string
          default_template?: string | null
          description?: string | null
          display_name: string
          id?: string
          is_active?: boolean
          is_test_mode?: boolean
          phone_number_id?: string | null
          priority?: number
          provider: string
          quality_rating?: string | null
          template_namespace?: string | null
          updated_at?: string
          webhook_verify_token?: string | null
        }
        Update: {
          access_token?: string | null
          api_base_url?: string | null
          app_id?: string | null
          app_secret?: string | null
          assigned_use?: string
          business_account_id?: string | null
          config?: Json
          created_at?: string
          default_template?: string | null
          description?: string | null
          display_name?: string
          id?: string
          is_active?: boolean
          is_test_mode?: boolean
          phone_number_id?: string | null
          priority?: number
          provider?: string
          quality_rating?: string | null
          template_namespace?: string | null
          updated_at?: string
          webhook_verify_token?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      referrals_for_referrer: {
        Row: {
          created_at: string | null
          id: string | null
          kind: string | null
          referred_user_id: string | null
          referrer_user_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          kind?: string | null
          referred_user_id?: string | null
          referrer_user_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          kind?: string | null
          referred_user_id?: string | null
          referrer_user_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      vendors_public: {
        Row: {
          avatar_url: string | null
          business_name: string | null
          id: string | null
          is_blocked: boolean | null
          lat: number | null
          lng: number | null
          owner_name: string | null
          service_radius_km: number | null
          status: string | null
          trade: string | null
          user_id: string | null
          verified: boolean | null
        }
        Insert: {
          avatar_url?: string | null
          business_name?: string | null
          id?: string | null
          is_blocked?: boolean | null
          lat?: number | null
          lng?: number | null
          owner_name?: string | null
          service_radius_km?: number | null
          status?: string | null
          trade?: string | null
          user_id?: string | null
          verified?: boolean | null
        }
        Update: {
          avatar_url?: string | null
          business_name?: string | null
          id?: string | null
          is_blocked?: boolean | null
          lat?: number | null
          lng?: number | null
          owner_name?: string | null
          service_radius_km?: number | null
          status?: string | null
          trade?: string | null
          user_id?: string | null
          verified?: boolean | null
        }
        Relationships: []
      }
    }
    Functions: {
      accept_lead: { Args: { _lead_id: string }; Returns: Json }
      admin_adjust_wallet: {
        Args: {
          _amount: number
          _direction: string
          _kind: string
          _reason: string
          _user_id: string
        }
        Returns: Json
      }
      admin_approve_referral_reward: {
        Args: { _reward_id: string }
        Returns: Json
      }
      admin_get_referral_overview: { Args: never; Returns: Json }
      admin_reject_referral_reward: {
        Args: { _notes?: string; _reward_id: string }
        Returns: Json
      }
      admin_test_notification: {
        Args: { _trigger_id: string; _user_id?: string }
        Returns: Json
      }
      admin_upsert_notification_trigger: {
        Args: {
          _action_url: string
          _audience: string
          _body: string
          _channels: Json
          _display_name: string
          _event_key: string
          _id: string
          _image_url: string
          _is_active: boolean
          _notification_type: string
          _schedule_at: string
          _title: string
        }
        Returns: {
          action_url: string | null
          audience: string
          body: string
          channels: Json
          created_at: string
          display_name: string
          event_key: string
          id: string
          image_url: string | null
          is_active: boolean
          last_fired_at: string | null
          notification_type: string
          schedule_at: string | null
          title: string
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "notification_triggers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      admin_upsert_referral_campaign: {
        Args: {
          _ends_at: string
          _id: string
          _is_active: boolean
          _kind: string
          _max_per_user: number
          _min_order_value: number
          _name: string
          _release_trigger: string
          _reward_amount: number
          _starts_at: string
        }
        Returns: {
          created_at: string
          ends_at: string | null
          id: string
          is_active: boolean
          kind: string
          max_per_user: number | null
          min_order_value: number | null
          name: string
          release_trigger: string
          reward_amount: number
          starts_at: string | null
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "referral_campaigns"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      apply_referral_code: {
        Args: { _code: string; _device?: string; _ip?: string; _kind?: string }
        Returns: Json
      }
      approve_vendor: { Args: { _vendor_user_id: string }; Returns: undefined }
      auto_accept_expired_lead_notifications: { Args: never; Returns: Json }
      broadcast_next_lead_batch:
        | { Args: { _batch_size?: number; _lead_id: string }; Returns: Json }
        | {
            Args: {
              _batch_size?: number
              _lead_id: string
              _ring_index?: number
            }
            Returns: Json
          }
      bump_card_view: { Args: { _code: string }; Returns: undefined }
      count_unread_lead_messages: {
        Args: { _lead_ids: string[] }
        Returns: {
          lead_id: string
          unread_count: number
        }[]
      }
      customer_approve_vendor: {
        Args: { _lead_id: string; _vendor_id: string }
        Returns: Json
      }
      ensure_my_referral_code: {
        Args: { _kind?: string }
        Returns: {
          code: string
          created_at: string
          id: string
          kind: string
          user_id: string
        }
        SetofOptions: {
          from: "*"
          to: "referral_codes"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      generate_referral_code: { Args: { _prefix?: string }; Returns: string }
      generate_support_code: { Args: never; Returns: string }
      get_active_maps_key: { Args: never; Returns: Json }
      get_admin_stats: { Args: never; Returns: Json }
      get_card_link: { Args: { _code: string }; Returns: string }
      get_gateway_health: { Args: never; Returns: Json }
      get_lead_accepted_vendors: {
        Args: { _lead_id: string }
        Returns: {
          avatar_url: string
          business_name: string
          cover_image_url: string
          distance_km: number
          email: string
          mapping_notes: string
          owner_name: string
          phone: string
          price_max: number
          price_min: number
          quoted_price: number
          rating: number
          total_reviews: number
          vendor_id: string
          vendor_note: string
          whatsapp: string
        }[]
      }
      get_leadx_market_stats: { Args: never; Returns: Json }
      get_my_pending_lead_briefs: {
        Args: never
        Returns: {
          area_hint: string
          created_at: string
          customer_name_initial: string
          id: string
          images: string[]
          item_names: string[]
          lead_price_inr: number
          note: string
          notification_status: string
          quoted_price: number
          status: string
          sub_category_id: string
          sub_category_name: string
        }[]
      }
      get_my_referral_overview: { Args: never; Returns: Json }
      get_notification_analytics: { Args: never; Returns: Json }
      get_pending_lead_brief: {
        Args: { p_lead_id: string }
        Returns: {
          area_hint: string
          created_at: string
          customer_name_initial: string
          id: string
          images: string[]
          item_names: string[]
          lead_price_inr: number
          note: string
          status: string
          sub_category_id: string
          sub_category_name: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_user: { Args: { _user_id: string }; Returns: boolean }
      is_lead_owner: {
        Args: { _lead_id: string; _user_id: string }
        Returns: boolean
      }
      lookup_customer_by_phone: {
        Args: { _phone: string }
        Returns: {
          address: string
          email: string
          exists_flag: boolean
          gender: string
          name: string
          user_id: string
        }[]
      }
      mark_referral_checkpoint: {
        Args: { _checkpoint: string; _referred_user_id: string }
        Returns: Json
      }
      mask_phone: { Args: { _phone: string }; Returns: string }
      match_lead_vendors: { Args: { _lead_id: string }; Returns: Json }
      normalize_email: { Args: { _email: string }; Returns: string }
      normalize_phone10: { Args: { _phone: string }; Returns: string }
      realtime_topic_authorized: { Args: { _topic: string }; Returns: boolean }
      register_device_token: {
        Args: { _platform?: string; _token: string; _topics?: string[] }
        Returns: Json
      }
      reject_lead: { Args: { _lead_id: string }; Returns: undefined }
      save_customer_profile: {
        Args: {
          _address: string
          _email: string
          _gender: string
          _name: string
          _phone: string
        }
        Returns: {
          address: string | null
          admin_notes: string | null
          assigned_to: string | null
          avatar_url: string | null
          card_accent_color: string | null
          card_back_image_url: string | null
          card_custom_fields: Json
          card_field_visibility: Json
          card_link_url: string | null
          card_share_count: number
          card_view_count: number
          created_at: string
          email: string | null
          gender: string | null
          id: string
          is_blocked: boolean
          name: string | null
          phone: string | null
          referral_code: string | null
          shop_logo_url: string | null
          shop_name: string | null
          shop_url: string | null
          signup_method: string | null
          status: string
          support_code: string | null
          tags: string[] | null
          updated_at: string
          upi_id: string | null
          user_id: string
          verified: boolean
        }
        SetofOptions: {
          from: "*"
          to: "customers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_customer_profile_as_user: {
        Args: {
          _address: string
          _email: string
          _gender: string
          _name: string
          _phone: string
          _uid: string
        }
        Returns: {
          address: string | null
          admin_notes: string | null
          assigned_to: string | null
          avatar_url: string | null
          card_accent_color: string | null
          card_back_image_url: string | null
          card_custom_fields: Json
          card_field_visibility: Json
          card_link_url: string | null
          card_share_count: number
          card_view_count: number
          created_at: string
          email: string | null
          gender: string | null
          id: string
          is_blocked: boolean
          name: string | null
          phone: string | null
          referral_code: string | null
          shop_logo_url: string | null
          shop_name: string | null
          shop_url: string | null
          signup_method: string | null
          status: string
          support_code: string | null
          tags: string[] | null
          updated_at: string
          upi_id: string | null
          user_id: string
          verified: boolean
        }
        SetofOptions: {
          from: "*"
          to: "customers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      save_vendor_profile:
        | {
            Args: {
              _aadhaar: string
              _business_name: string
              _deals_in: string
              _entity: string
              _facebook: string
              _google_place_id: string
              _gst: string
              _instagram: string
              _manager_email: string
              _owner_name: string
              _pan: string
              _plan: string
              _referral: string
              _role: string
              _trade: string
              _website: string
              _whatsapp: string
            }
            Returns: {
              aadhaar: string | null
              admin_notes: string | null
              assigned_to: string | null
              auto_accept_leads: boolean
              avatar_url: string | null
              business_name: string | null
              cover_image_url: string | null
              cover_video_url: string | null
              created_at: string
              current_team_count: number
              deals_in: string | null
              email: string | null
              entity: string | null
              facebook: string | null
              google_place_id: string | null
              gst: string | null
              id: string
              instagram: string | null
              is_blocked: boolean
              is_online: boolean
              is_premium: boolean
              is_remote_capable: boolean
              lat: number | null
              live_lat: number | null
              live_lng: number | null
              lng: number | null
              location_updated_at: string | null
              manager_email: string | null
              operation_mode: string
              owner_name: string | null
              pan: string | null
              plan: string | null
              referral: string | null
              role: string | null
              service_radius_km: number
              shop_banner_urls: string[]
              shop_bio: string | null
              shop_cta_label: string
              status: string
              tags: string[] | null
              trade: string | null
              updated_at: string
              user_id: string
              van_count: number
              vendor_type: string
              verified: boolean
              website: string | null
              whatsapp: string | null
            }
            SetofOptions: {
              from: "*"
              to: "vendors"
              isOneToOne: true
              isSetofReturn: false
            }
          }
        | {
            Args: {
              _aadhaar: string
              _business_name: string
              _current_team_count?: number
              _deals_in: string
              _entity: string
              _facebook: string
              _google_place_id: string
              _gst: string
              _instagram: string
              _manager_email: string
              _owner_name: string
              _pan: string
              _plan: string
              _referral: string
              _role: string
              _trade: string
              _van_count?: number
              _website: string
              _whatsapp: string
            }
            Returns: {
              aadhaar: string | null
              admin_notes: string | null
              assigned_to: string | null
              auto_accept_leads: boolean
              avatar_url: string | null
              business_name: string | null
              cover_image_url: string | null
              cover_video_url: string | null
              created_at: string
              current_team_count: number
              deals_in: string | null
              email: string | null
              entity: string | null
              facebook: string | null
              google_place_id: string | null
              gst: string | null
              id: string
              instagram: string | null
              is_blocked: boolean
              is_online: boolean
              is_premium: boolean
              is_remote_capable: boolean
              lat: number | null
              live_lat: number | null
              live_lng: number | null
              lng: number | null
              location_updated_at: string | null
              manager_email: string | null
              operation_mode: string
              owner_name: string | null
              pan: string | null
              plan: string | null
              referral: string | null
              role: string | null
              service_radius_km: number
              shop_banner_urls: string[]
              shop_bio: string | null
              shop_cta_label: string
              status: string
              tags: string[] | null
              trade: string | null
              updated_at: string
              user_id: string
              van_count: number
              vendor_type: string
              verified: boolean
              website: string | null
              whatsapp: string | null
            }
            SetofOptions: {
              from: "*"
              to: "vendors"
              isOneToOne: true
              isSetofReturn: false
            }
          }
      set_my_lead_status: {
        Args: { _lead_id: string; _status: string }
        Returns: Json
      }
      start_lead_work: { Args: { _lead_id: string }; Returns: Json }
      transfer_coins: {
        Args: { _coins: number; _note?: string; _receiver_id: string }
        Returns: Json
      }
      update_coin_rate: { Args: { _new_rate: number }; Returns: undefined }
      update_my_geo: {
        Args: { _accuracy?: number; _lat: number; _lng: number }
        Returns: Json
      }
      vendor_claim_by_phone: {
        Args: { _phone: string }
        Returns: {
          business_name: string
          relinked: boolean
          status: string
          user_id: string
          whatsapp: string
        }[]
      }
      wipe_all_test_data: { Args: never; Returns: Json }
    }
    Enums: {
      app_role: "super_admin" | "admin" | "moderator" | "support"
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
      app_role: ["super_admin", "admin", "moderator", "support"],
    },
  },
} as const
