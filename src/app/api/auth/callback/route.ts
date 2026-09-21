import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth callback handler. Exchanges the authorization code for a session
 * and redirects to the dashboard (or the path specified in the "next" param).
 *
 * Flow:
 * 1. User authenticates via Google/GitHub OAuth
 * 2. Provider redirects to this endpoint with a `code` query parameter
 * 3. This endpoint exchanges the code for a Supabase session (access + refresh tokens)
 * 4. On success, redirects user to the "next" URL (defaults to /dashboard)
 * 5. On failure, redirects to /login with an error indicator
 */
export async function GET(request: Request) {
  // Extract the authorization code and redirect destination from the URL
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    // Create a Supabase client instance (reads cookies from the request)
    const supabase = await createClient();

    // Exchange the one-time authorization code for a session.
    // On success, Supabase sets httpOnly session cookies in the response.
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Success: redirect to the intended destination.
      // "next" allows the original page to be resumed after login.
      return NextResponse.redirect(`${origin}${next}`);
    }
    // If exchange fails (expired code, invalid code, etc.), fall through to error redirect
  }

  // No code provided or exchange failed — redirect to login with error flag
  // The error=auth_failed query param is read by the login page to show a message
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
