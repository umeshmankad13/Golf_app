import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/draw — Creates a draw entry for the authenticated user.
 * Validates: active subscription required, exactly 5 numbers selected,
 * and no duplicate entry for the same draw.
 *
 * Request body:
 *   { draw_id: string, selected_numbers: number[] }
 *
 * Business rules:
 *   - Each user can only enter a draw once (duplicate prevention)
 *   - Users must have an active subscription to participate
 *   - Exactly 5 numbers must be selected per entry
 */
export async function POST(request: Request) {
  // Create a Supabase client instance using session cookies from the request
  const supabase = await createClient();

  // Verify the user is authenticated by retrieving the session from cookies
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse the request body to get the draw ID and selected numbers
  const body = await request.json();
  const { draw_id, selected_numbers } = body;

  // Validate that both required fields are present in the request
  if (!draw_id || !selected_numbers) {
    return NextResponse.json(
      { error: "Missing draw_id or selected_numbers" },
      { status: 400 }
    );
  }

  // Enforce the rule that exactly 5 numbers must be selected.
  // This is a business rule — each entry must pick exactly 5 numbers.
  if (selected_numbers.length !== 5) {
    return NextResponse.json(
      { error: "Must select exactly 5 numbers" },
      { status: 400 }
    );
  }

  // Check if the user has an active subscription.
  // Only subscribers can participate in draws (monetization gate).
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .single();

  if (!subscription) {
    return NextResponse.json(
      { error: "Active subscription required" },
      { status: 403 }
    );
  }

  // Check for duplicate entry: has this user already entered this draw?
  // Prevents multiple entries per draw per user (fairness rule).
  const { data: existing } = await supabase
    .from("draw_entries")
    .select("id")
    .eq("draw_id", draw_id)
    .eq("user_id", user.id)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "Already entered this draw" },
      { status: 409 }
    );
  }

  // Insert the draw entry into the database.
  // The entry records the user's selected numbers for the draw.
  const { data, error } = await supabase
    .from("draw_entries")
    .insert({
      draw_id,
      user_id: user.id,
      selected_numbers,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ data });
}
