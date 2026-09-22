/**
 * Server-Side Razorpay Configuration
 *
 * Initializes the Razorpay SDK for server-side operations:
 * - Creating payment orders (in /api/razorpay/checkout)
 * - Verifying payment signatures (in /api/razorpay/verify)
 *
 * Razorpay handles the actual payment processing; we just create orders
 * and verify that payments are legitimate using HMAC signatures.
 */
import Razorpay from "razorpay";

let _razorpay: Razorpay | null = null;

/** Server-side Razorpay instance — lazily created at runtime. */
export function getRazorpay(): Razorpay {
  if (!_razorpay) {
    _razorpay = new Razorpay({
      key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID!,
      key_secret: process.env.RAZORPAY_KEY_SECRET!,
    });
  }
  return _razorpay;
}

/**
 * Razorpay plan IDs mapped by subscription type.
 * These are created in the Razorpay dashboard and referenced here
 * for subscription-based billing (though we currently use one-time orders).
 */
export const PLANS = {
  monthly: process.env.RAZORPAY_MONTHLY_PLAN_ID!,
  yearly: process.env.RAZORPAY_YEARLY_PLAN_ID!,
} as const;
