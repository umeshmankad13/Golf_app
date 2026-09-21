/**
 * Supabase Database Type Definition
 *
 * This file defines the complete TypeScript type schema for the GolfGive database.
 * It mirrors the SQL schema defined in supabase/schema.sql and is auto-generated
 * or manually maintained to keep the app type-safe when querying Supabase.
 *
 * Each table has three type variants:
 * - Row: The full shape of a row returned from the database
 * - Insert: The shape for inserting new rows (optional fields have defaults)
 * - Update: The shape for updating existing rows (all fields optional)
 *
 * Database Tables:
 * - profiles: User accounts (created automatically on signup via trigger)
 * - subscriptions: Razorpay subscription records
 * - scores: Golf Stableford scores (max 5 per user, enforced by trigger)
 * - charities: Charity organizations that users can support
 * - user_charities: Maps users to their chosen charity
 * - draws: Monthly prize draws with winning numbers
 * - draw_entries: Users' number picks for each draw
 * - winners: Prize winner records with verification/payment status
 * - prize_pool: Tracks pool contributions per subscription period
 */
export type Database = {
  public: {
    Tables: {
      /** User profile - auto-created on signup via the handle_new_user() trigger */
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      subscriptions: {
        Row: {
          id: string;
          user_id: string;
          plan_type: string;
          status: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          current_period_start: string | null;
          current_period_end: string | null;
          charity_percentage: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          plan_type: string;
          status?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          charity_percentage?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          plan_type?: string;
          status?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          current_period_start?: string | null;
          current_period_end?: string | null;
          charity_percentage?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      scores: {
        Row: {
          id: string;
          user_id: string;
          score: number;
          score_date: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          score: number;
          score_date: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          score?: number;
          score_date?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "scores_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      charities: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          image_url: string | null;
          website_url: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          image_url?: string | null;
          website_url?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          image_url?: string | null;
          website_url?: string | null;
          is_active?: boolean;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_charities: {
        Row: {
          id: string;
          user_id: string;
          charity_id: string | null;
          donation_amount: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          charity_id?: string | null;
          donation_amount?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          charity_id?: string | null;
          donation_amount?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "user_charities_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "user_charities_charity_id_fkey";
            columns: ["charity_id"];
            isOneToOne: false;
            referencedRelation: "charities";
            referencedColumns: ["id"];
          },
        ];
      };
      draws: {
        Row: {
          id: string;
          draw_date: string;
          winning_numbers: number[];
          draw_type: string;
          status: string;
          prize_pool_total: number;
          published_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          draw_date: string;
          winning_numbers: number[];
          draw_type?: string;
          status?: string;
          prize_pool_total?: number;
          published_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          draw_date?: string;
          winning_numbers?: number[];
          draw_type?: string;
          status?: string;
          prize_pool_total?: number;
          published_at?: string | null;
        };
        Relationships: [];
      };
      draw_entries: {
        Row: {
          id: string;
          draw_id: string;
          user_id: string;
          selected_numbers: number[];
          matched_count: number;
          prize_amount: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          draw_id: string;
          user_id: string;
          selected_numbers: number[];
          matched_count?: number;
          prize_amount?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          draw_id?: string;
          user_id?: string;
          selected_numbers?: number[];
          matched_count?: number;
          prize_amount?: number;
        };
        Relationships: [
          {
            foreignKeyName: "draw_entries_draw_id_fkey";
            columns: ["draw_id"];
            isOneToOne: false;
            referencedRelation: "draws";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "draw_entries_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      winners: {
        Row: {
          id: string;
          draw_id: string;
          user_id: string;
          draw_entry_id: string;
          matched_count: number;
          prize_amount: number;
          proof_url: string | null;
          verification_status: string;
          payment_status: string;
          verified_at: string | null;
          paid_at: string | null;
          admin_notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          draw_id: string;
          user_id: string;
          draw_entry_id: string;
          matched_count: number;
          prize_amount: number;
          proof_url?: string | null;
          verification_status?: string;
          payment_status?: string;
          verified_at?: string | null;
          paid_at?: string | null;
          admin_notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          draw_id?: string;
          user_id?: string;
          draw_entry_id?: string;
          matched_count?: number;
          prize_amount?: number;
          proof_url?: string | null;
          verification_status?: string;
          payment_status?: string;
          verified_at?: string | null;
          paid_at?: string | null;
          admin_notes?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "winners_draw_id_fkey";
            columns: ["draw_id"];
            isOneToOne: false;
            referencedRelation: "draws";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "winners_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "winners_draw_entry_id_fkey";
            columns: ["draw_entry_id"];
            isOneToOne: false;
            referencedRelation: "draw_entries";
            referencedColumns: ["id"];
          },
        ];
      };
      prize_pool: {
        Row: {
          id: string;
          subscription_id: string;
          amount: number;
          period_start: string;
          period_end: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          subscription_id: string;
          amount: number;
          period_start: string;
          period_end: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          subscription_id?: string;
          amount?: number;
          period_start?: string;
          period_end?: string;
        };
        Relationships: [
          {
            foreignKeyName: "prize_pool_subscription_id_fkey";
            columns: ["subscription_id"];
            isOneToOne: false;
            referencedRelation: "subscriptions";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      exec_sql: {
        Args: { query: string };
        Returns: void;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
