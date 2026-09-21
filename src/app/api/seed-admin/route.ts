import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

/**
 * One-time admin promotion endpoint. Promotes the authenticated user
 * to admin role by updating the profiles table. Used during initial setup.
 *
 * Security considerations:
 * - Requires a valid Bearer token (authenticates the user calling this endpoint)
 * - Only allows the authenticated user to promote themselves (email mismatch check)
 * - Uses the admin Supabase client with anon key (RLS policies may apply)
 * - This endpoint should be disabled or rate-limited in production
 */
export async function POST(request: Request) {
  // Parse the email from the request body
  const { email } = await request.json();

  // Validate that an email was provided
  if (!email) {
    return NextResponse.json({ error: "Email required" }, { status: 400 });
  }

  // Create a Supabase client using the public anon key.
  // This client is used for auth verification, not for privileged operations.
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Extract the Bearer token from the Authorization header
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Strip the "Bearer " prefix and verify the token with Supabase Auth.
  // This validates the JWT signature and returns the authenticated user.
  const token = authHeader.replace("Bearer ", "");
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser(token);

  // If the token is invalid or expired, reject the request
  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Security check: ensure the email in the request body matches the
  // authenticated user's email. This prevents a user from promoting
  // a different account to admin.
  if (user.email !== email) {
    return NextResponse.json({ error: "Email mismatch" }, { status: 403 });
  }

  // Fix database constraint: drop and re-add the role check constraint.
  // This is necessary if the profiles table originally had a more restrictive
  // constraint (e.g., only allowed "user" and "subscriber" roles).
  // The new constraint allows 'admin' as a valid role value.
  await supabase.rpc("exec_sql", {
    query: `
      ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
      ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('subscriber', 'admin'));
    `,
  });

  // Promote the authenticated user to admin by updating their profile record.
  // Only updates the user's own record (matched by user.id).
  const { error: updateError } = await supabase
    .from("profiles")
    .update({ role: "admin", updated_at: new Date().toISOString() })
    .eq("id", user.id);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to set admin role", details: updateError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, message: "You are now an admin" });
}
