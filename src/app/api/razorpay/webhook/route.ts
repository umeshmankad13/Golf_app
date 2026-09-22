import { NextResponse } from "next/server";
import { getRazorpay } from "@/lib/razorpay";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";

// Server-side Supabase client using service role key to bypass RLS
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * POST /api/razorpay/webhook — Handles Razorpay subscription lifecycle events.
 * Verifies the webhook signature, then processes:
 * - "active": Updates subscription status and billing period
 * - "cancelled"/"paused": Marks subscription as cancelled
 *
 * Razorpay sends webhooks for subscription state changes. This endpoint
 * keeps the local subscription records in sync with Razorpay's state.
 *
 * Security:
 *   - HMAC-SHA256 signature verification using RAZORPAY_KEY_SECRET
 *   - Prevents forged webhook payloads from unauthorized sources
 *
 * Supported events:
 *   - subscription.active: Subscription renewed or first payment succeeded
 *   - subscription.cancelled: User cancelled subscription
 *   - subscription.paused: Subscription paused (e.g., payment failure)
 *   - subscription.authenticated: Subscription created but first payment pending
 */
export async function POST(request: Request) {
  try {
    // Read the raw body as text (not JSON) because signature verification
    // requires the exact original bytes that were signed
    const body = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    // Reject requests missing the Razorpay signature header
    if (!signature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // === Webhook Signature Verification ===
    // Razorpay signs the raw request body using HMAC-SHA256 with the webhook secret.
    // Recomputing the signature locally and comparing prevents forged payloads.
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
      .update(body)
      .digest("hex");

    // Reject if signatures don't match — this is a forged or corrupted webhook
    if (expectedSignature !== signature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    // Parse the verified webhook event payload
    const event = JSON.parse(body);

    // Process subscription lifecycle events based on status
    switch (event.payload.subscription?.entity?.status) {
      case "active": {
        // Subscription is active (renewed or first payment succeeded).
        // Update the local subscription record with the new billing period.
        const subscription = event.payload.subscription.entity;
        const payment = event.payload.payment?.entity;

        await supabase
          .from("subscriptions")
          .update({
            status: "active",
            stripe_subscription_id: subscription.id,
            // Razorpay timestamps are in seconds — convert to milliseconds for JS Date
            current_period_start: new Date(
              (subscription.current_start || Math.floor(Date.now() / 1000)) * 1000
            ).toISOString(),
            // Fallback: if current_end is missing, default to 30 days from start
            current_period_end: new Date(
              (subscription.current_end || (subscription.current_start || Math.floor(Date.now() / 1000)) + 30 * 86400) * 1000
            ).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);
        break;
      }

      case "cancelled":
      case "paused": {
        // Subscription has been cancelled or paused (e.g., payment failure).
        // Mark it as cancelled to revoke draw entry access.
        const subscription = event.payload.subscription.entity;

        await supabase
          .from("subscriptions")
          .update({
            status: "cancelled",
            updated_at: new Date().toISOString(),
          })
          .eq("stripe_subscription_id", subscription.id);
        break;
      }

      case "authenticated": {
        // Subscription authorized but first payment pending.
        // No action needed — the subscription will become active once
        // the first payment is processed (handled by the "active" case).
        break;
      }
    }

    // Always return 200 to Razorpay to acknowledge receipt of the webhook.
    // Non-200 responses will cause Razorpay to retry the webhook.
    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: error.message || "Webhook handler failed" },
      { status: 500 }
    );
  }
}
