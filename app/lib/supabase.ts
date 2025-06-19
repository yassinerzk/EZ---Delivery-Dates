import { createClient } from '@supabase/supabase-js';

// Client-side Supabase client (uses anon key)
export const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Server-side Supabase client (uses service role key for admin operations)
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// Database types (you can generate these with: npx supabase gen types typescript --project-id YOUR_PROJECT_ID)
export interface Database {
  public: {
    Tables: {
      delivery_rules: {
        Row: {
          id: string;
          shop: string;
          target_type: 'product' | 'sku' | 'tag' | 'collection' | 'collection_tag' | 'variant';
          target_value: string;
          country_codes: string[];
          estimated_min_days: number;
          estimated_max_days: number;
          custom_message: string | null;
          enabled: boolean;
          is_default: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          shop: string;
          target_type: 'product' | 'sku' | 'tag' | 'collection' | 'collection_tag' | 'variant';
          target_value: string;
          country_codes: string[];
          estimated_min_days: number;
          estimated_max_days: number;
          custom_message?: string | null;
          enabled?: boolean;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          shop?: string;
          target_type?: 'product' | 'sku' | 'tag' | 'collection' | 'collection_tag' | 'variant';
          target_value?: string;
          country_codes?: string[];
          estimated_min_days?: number;
          estimated_max_days?: number;
          custom_message?: string | null;
          enabled?: boolean;
          is_default?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Typed Supabase clients
export const supabaseTyped = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export const supabaseAdminTyped = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);