/**
 * Browser-Side Supabase Client
 *
 * This module creates a singleton Supabase client for use in client components
 * ("use client" pages). It uses the browser's localStorage for session storage.
 *
 * Key points:
 * - Marked "use client" so it can only be imported in client components
 * - Uses a singleton pattern to avoid creating multiple client instances
 * - Reads Supabase URL and anon key from environment variables
 * - The anon key is safe to expose (RLS policies protect data access)
 */
"use client";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/** Type alias for the Supabase client instance, typed with our Database schema */
export type SupabaseClient = ReturnType<typeof createSupabaseClient<Database>>;

/** Singleton instance - reused across the entire app to maintain session state */
let client: SupabaseClient | null = null;

/**
 * Creates or returns the existing singleton Supabase client.
 * Called once per page load; subsequent calls return the same instance.
 */
export function createClient(): SupabaseClient {
  // Return existing client if already created (singleton pattern)
  if (client) return client;

  // Create new client with our Database type for full type safety
  client = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  return client;
}
