import { NextResponse } from "next/server";
import { razorpay } from "@/lib/razorpay";
import { createClient } from "@supabase/supabase-js";

/**
 * POST /api/razorpay/checkout — Creates a Razorpay order for subscription payment.
 * Authenticates via Bearer token, validates plan type, and returns order details
 * (orderId, keyId, amount, currency) for the client-side Razorpay widget.
 *
 * Request body:
 *   { planType: "monthly" | "yearly" }
 *
 * Response:
 *   { orderId, keyId, amount, currency, planType, name, description, prefill }
 *
 * Flow:
 * 1. User selects a plan on the frontend
 * 2. Frontend calls this endpoint with the Bearer token and plan type
 * 3. This endpoint creates a Razorpay order (server-side, secure)
 * 4. Returns order details to the frontend for the Razorpay payment widget
 * 5. After payment, the frontend calls /api/razorpay/verify to confirm
 */
export async function POST(request: Request) {
  try {
    const { planType } = await request.json();

    // Validate plan type is one of the allowed values
    if (!planType || !["monthly", "yearly"].includes(planType)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Extract and validate the Bearer token from the Authorization header
    const authHeader = request.headers.get("authorization");
    if (!authHeader) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Verify the JWT with Supabase to get the authenticated user
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Calculate the payment amount in paise (Razorpay uses smallest currency unit)
    // Monthly: ₹999 = 99900 paise, Yearly: ₹9900 = 990000 paise
    const amount = planType === "monthly" ? 999 : 9900;
    // Generate a unique receipt ID for tracking this order
    // Uses first 8 chars of user ID + timestamp for uniqueness
    const receipt = `sub_${user.id.slice(0, 8)}_${Date.now()}`;

    // Create a Razorpay order on the server.
    // This is the secure way to initiate payments — the order is created
    // server-side so the amount and user ID cannot be tampered with.
    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt,
      notes: {
        user_id: user.id,
        plan_type: planType,
      },
    });

    // Return order details to the frontend for the Razorpay payment widget.
    // keyId is the public Razorpay key (safe to expose to client).
    return NextResponse.json({
      orderId: order.id,
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
      amount: order.amount,
      currency: order.currency,
      planType,
      name: "GolfGive",
      description: `GolfGive ${planType === "monthly" ? "Monthly" : "Yearly"} Plan`,
      prefill: {
        email: user.email || "",
        name: user.user_metadata?.full_name || "",
      },
    });
  } catch (error: any) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to create order" },
      { status: 500 }
    );
  }
}
