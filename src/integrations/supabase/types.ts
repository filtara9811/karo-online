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
      catalog_items: {
        Row: {
          category_id: string
          created_at: string
          created_by: string | null
          description: string | null
          icon: string | null
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          price_max: number | null
          price_min: number | null
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          price_max?: number | null
          price_min?: number | null
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          price_max?: number | null
          price_min?: number | null
          slug?: string
          sort_order?: number
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
      customers: {
        Row: {
          address: string | null
          admin_notes: string | null
          assigned_to: string | null
          avatar_url: string | null
          created_at: string
          email: string | null
          gender: string | null
          id: string
          is_blocked: boolean
          name: string | null
          phone: string | null
          shop_logo_url: string | null
          shop_name: string | null
          shop_url: string | null
          signup_method: string | null
          status: string
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
          created_at?: string
          email?: string | null
          gender?: string | null
          id?: string
          is_blocked?: boolean
          name?: string | null
          phone?: string | null
          shop_logo_url?: string | null
          shop_name?: string | null
          shop_url?: string | null
          signup_method?: string | null
          status?: string
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
          created_at?: string
          email?: string | null
          gender?: string | null
          id?: string
          is_blocked?: boolean
          name?: string | null
          phone?: string | null
          shop_logo_url?: string | null
          shop_name?: string | null
          shop_url?: string | null
          signup_method?: string | null
          status?: string
          tags?: string[] | null
          updated_at?: string
          upi_id?: string | null
          user_id?: string
          verified?: boolean
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
      lead_messages: {
        Row: {
          attachment: Json
          body: string | null
          created_at: string
          id: string
          image_url: string | null
          lead_id: string
          read_at: string | null
          recipient_id: string | null
          sender_id: string
          sender_role: string
        }
        Insert: {
          attachment?: Json
          body?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          lead_id: string
          read_at?: string | null
          recipient_id?: string | null
          sender_id: string
          sender_role: string
        }
        Update: {
          attachment?: Json
          body?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          lead_id?: string
          read_at?: string | null
          recipient_id?: string | null
          sender_id?: string
          sender_role?: string
        }
        Relationships: []
      }
      lead_notifications: {
        Row: {
          created_at: string
          id: string
          lead_id: string
          responded_at: string | null
          status: string
          sub_category_name: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lead_id: string
          responded_at?: string | null
          status?: string
          sub_category_name: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lead_id?: string
          responded_at?: string | null
          status?: string
          sub_category_name?: string
          vendor_id?: string
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
          customer_id: string
          customer_name: string | null
          customer_phone: string | null
          id: string
          images: string[]
          item_ids: string[]
          item_names: string[]
          lat: number | null
          lead_price_inr: number
          lng: number | null
          max_slots: number
          note: string | null
          root_category_id: string | null
          source: string
          status: string
          sub_category_id: string
          sub_category_name: string
          type_id: string | null
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_count?: number
          accepted_vendor_id?: string | null
          accepted_vendor_ids?: string[]
          address?: string | null
          created_at?: string
          customer_id: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          images?: string[]
          item_ids?: string[]
          item_names?: string[]
          lat?: number | null
          lead_price_inr?: number
          lng?: number | null
          max_slots?: number
          note?: string | null
          root_category_id?: string | null
          source?: string
          status?: string
          sub_category_id: string
          sub_category_name: string
          type_id?: string | null
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_count?: number
          accepted_vendor_id?: string | null
          accepted_vendor_ids?: string[]
          address?: string | null
          created_at?: string
          customer_id?: string
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          images?: string[]
          item_ids?: string[]
          item_names?: string[]
          lat?: number | null
          lead_price_inr?: number
          lng?: number | null
          max_slots?: number
          note?: string | null
          root_category_id?: string | null
          source?: string
          status?: string
          sub_category_id?: string
          sub_category_name?: string
          type_id?: string | null
          updated_at?: string
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
          updated_at: string
          vendor_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          item_id: string
          updated_at?: string
          vendor_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          item_id?: string
          updated_at?: string
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
          avatar_url: string | null
          business_name: string | null
          created_at: string
          deals_in: string | null
          entity: string | null
          facebook: string | null
          google_place_id: string | null
          gst: string | null
          id: string
          instagram: string | null
          is_blocked: boolean
          manager_email: string | null
          owner_name: string | null
          pan: string | null
          plan: string | null
          referral: string | null
          role: string | null
          status: string
          tags: string[] | null
          trade: string | null
          updated_at: string
          user_id: string
          verified: boolean
          website: string | null
          whatsapp: string | null
        }
        Insert: {
          aadhaar?: string | null
          admin_notes?: string | null
          assigned_to?: string | null
          avatar_url?: string | null
          business_name?: string | null
          created_at?: string
          deals_in?: string | null
          entity?: string | null
          facebook?: string | null
          google_place_id?: string | null
          gst?: string | null
          id?: string
          instagram?: string | null
          is_blocked?: boolean
          manager_email?: string | null
          owner_name?: string | null
          pan?: string | null
          plan?: string | null
          referral?: string | null
          role?: string | null
          status?: string
          tags?: string[] | null
          trade?: string | null
          updated_at?: string
          user_id: string
          verified?: boolean
          website?: string | null
          whatsapp?: string | null
        }
        Update: {
          aadhaar?: string | null
          admin_notes?: string | null
          assigned_to?: string | null
          avatar_url?: string | null
          business_name?: string | null
          created_at?: string
          deals_in?: string | null
          entity?: string | null
          facebook?: string | null
          google_place_id?: string | null
          gst?: string | null
          id?: string
          instagram?: string | null
          is_blocked?: boolean
          manager_email?: string | null
          owner_name?: string | null
          pan?: string | null
          plan?: string | null
          referral?: string | null
          role?: string | null
          status?: string
          tags?: string[] | null
          trade?: string | null
          updated_at?: string
          user_id?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_lead: { Args: { _lead_id: string }; Returns: Json }
      approve_vendor: { Args: { _vendor_user_id: string }; Returns: undefined }
      get_admin_stats: { Args: never; Returns: Json }
      get_lead_accepted_vendors: {
        Args: { _lead_id: string }
        Returns: {
          avatar_url: string
          business_name: string
          owner_name: string
          phone: string
          vendor_id: string
          whatsapp: string
        }[]
      }
      get_leadx_market_stats: { Args: never; Returns: Json }
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
        }[]
      }
      reject_lead: { Args: { _lead_id: string }; Returns: undefined }
      transfer_coins: {
        Args: { _coins: number; _note?: string; _receiver_id: string }
        Returns: Json
      }
      update_coin_rate: { Args: { _new_rate: number }; Returns: undefined }
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
