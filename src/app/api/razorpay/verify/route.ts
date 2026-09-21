import { NextResponse } from "next/server";
import { razorpay } from "@/lib/razorpay";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

/**
 * Server-side Supabase client using the service role key.
 * This bypasses Row Level Security (RLS) so the API can write subscription
 * records on behalf of the authenticated user. The anon key alone would be
 * blocked by RLS because there's no session context on the server.
 */
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/razorpay/verify — Verifies the Razorpay payment signature
 * using HMAC-SHA256, then upserts the subscription record in the database.
 * Calculates the billing period (monthly/yearly) and sets the status to active.
 *
 * Request body:
 *   { razorpay_order_id, razorpay_payment_id, razorpay_signature, planType }
 *
 * Security:
 *   - HMAC-SHA256 signature verification prevents payment forgery
 *   - The signature is computed using the server-only RAZORPAY_KEY_SECRET
 *   - Only payments whose signatures match are considered valid
 *
 * Flow:
 * 1. Frontend sends payment details after successful Razorpay checkout
 * 2. This endpoint recomputes the HMAC signature using the secret key
 * 3. If signatures match, the payment is authentic
 * 4. Subscription record is upserted (created or updated) in the database
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      planType,
    } = body;

    // Validate that all required payment verification fields are present
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing payment details" }, { status: 400 });
    }

    // === HMAC-SHA256 Signature Verification ===
    // Razorpay's verification protocol:
    // 1. Concatenate order_id and payment_id with a pipe separator
    // 2. Compute HMAC-SHA256 using the secret key
    // 3. Compare with the signature sent by Razorpay
    // This ensures the payment response was not tampered with.
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(text)
      .digest("hex");

    // Reject the request if the computed signature doesn't match.
    // This prevents forged payment confirmations.
    if (expectedSignature !== razorpay_signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Extract the authenticated user's ID from the Bearer token
    const authHeader = request.headers.get("authorization");
    let userId = "";

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const {
        data: { user },
      } = await supabase.auth.getUser(token);
      if (user) userId = user.id;
    }

    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Fetch the Razorpay order to get the plan type from the notes.
    // This is the authoritative source — the client-sent planType is a fallback.
    const order = await razorpay.orders.fetch(razorpay_order_id);
    const plan = order.notes?.plan_type || planType || "monthly";

    // Calculate the billing period start and end dates
    const periodStart = new Date();
    const periodEnd = new Date();
    if (plan === "monthly") {
      periodEnd.setMonth(periodEnd.getMonth() + 1);
    } else {
      periodEnd.setFullYear(periodEnd.getFullYear() + 1);
    }

    // Check if user already has a subscription record
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("id")
      .eq("user_id", userId)
      .single();

    const subData = {
      user_id: userId,
      plan_type: plan,
      status: "active",
      stripe_subscription_id: razorpay_order_id,
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      charity_percentage: 10,
    };

    if (existingSub) {
      // Update existing subscription
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update(subData)
        .eq("id", existingSub.id);

      if (updateError) {
        console.error("Subscription update error:", updateError);
        return NextResponse.json({ error: updateError.message }, { status: 500 });
      }
    } else {
      // Insert new subscription
      const { error: insertError } = await supabase
        .from("subscriptions")
        .insert(subData);

      if (insertError) {
        console.error("Subscription insert error:", insertError);
        return NextResponse.json({ error: insertError.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Verify error:", error);
    return NextResponse.json(
      { error: error.message || "Verification failed" },
      { status: 500 }
    );
  }
}
