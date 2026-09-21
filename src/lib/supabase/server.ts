/**
 * Server-Side Supabase Client
 *
 * Creates a new Supabase client for use in Server Components, API routes,
 * and server-side middleware. Unlike the browser client, this one does NOT
 * maintain a session across requests - a new client is created per request.
 *
 * Used in:
 * - API routes (e.g. src/app/api/draw/route.ts) for server-side data operations
 * - Server Components for data fetching (if needed)
 * - Middleware for session refresh
 */
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Creates a fresh server-side Supabase client instance.
 * Each call creates a new instance (no singleton) because server requests
 * should not share state between each other.
 */
export function createClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
