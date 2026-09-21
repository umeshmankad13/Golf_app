"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/Card";
import Button from "@/components/Button";
import {
  CreditCard,
  Check,
  Calendar,
  AlertCircle,
  ExternalLink,
} from "lucide-react";
import { loadRazorpay } from "@/lib/razorpay/client";
import type { Subscription } from "@/types";

declare global {
  interface Window {
    Razorpay: any;
  }
}

/**
 * Subscription management page. Shows plan selection cards (monthly/yearly)
 * for unsubscribed users, or current plan details with cancel option for
 * active subscribers. Uses Razorpay for payment processing with a ref-based
 * guard to prevent multiple concurrent checkout attempts.
 *
 * Razorpay checkout flow:
 * 1. User clicks "Subscribe Monthly" or "Subscribe Yearly"
 * 2. processingRef guard prevents double-clicks (ref persists across renders)
 * 3. POST /api/razorpay/checkout with auth token → returns order details
 * 4. loadRazorpay() dynamically loads the Razorpay script
 * 5. Open Razorpay modal with order details
 * 6. On success: POST /api/razorpay/verify with payment signature
 * 7. Reload subscription from DB to reflect new active status
 *
 * The processingRef pattern is used instead of processingPlan state alone
 * because state updates are async and multiple rapid clicks can bypass
 * the null check before the state update propagates.
 */
export default function SubscriptionPage() {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<"monthly" | "yearly" | null>(null);
  // Ref-based guard: synchronous check prevents race condition on rapid clicks
  const processingRef = useRef(false);
  const [error, setError] = useState("");
  const supabase = createClient();

  useEffect(() => {
    async function loadSubscription() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data } = await supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .in("status", ["active", "past_due"])
        .single();

      setSubscription(data);
      setLoading(false);
    }

    loadSubscription();
  }, [supabase]);

  /**
   * Initiates Razorpay checkout for the selected plan.
   * Uses processingRef as a synchronous guard to prevent double-submissions.
   * The flow: API checkout → load Razorpay script → open modal → verify payment.
   */
  async function handleSubscribe(planType: "monthly" | "yearly") {
    // Synchronous guard: prevents multiple concurrent checkout attempts
    if (processingRef.current) return;
    processingRef.current = true;
    setProcessingPlan(planType);
    setError("");

    try {
      // Get the current session's access token for API authentication
      const {
        data: { session },
      } = await supabase.auth.getSession();

      // Request order creation from our server (handles Razorpay API key securely server-side)
      const res = await fetch("/api/razorpay/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ planType }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to start checkout");
        processingRef.current = false;
        setProcessingPlan(null);
        return;
      }

      // Dynamically load the Razorpay checkout script (lazy-loaded on demand)
      const razorpayLoaded = await loadRazorpay();
      if (!razorpayLoaded) {
        setError("Failed to load payment gateway");
        processingRef.current = false;
        setProcessingPlan(null);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      // Configure Razorpay checkout modal options
      const options = {
        key: data.keyId,         // Razorpay key ID (not secret)
        order_id: data.orderId,  // Order ID from our server
        amount: data.amount,     // Amount in smallest currency unit (paise)
        currency: data.currency,
        name: data.name,
        description: data.description,
        prefill: data.prefill,   // Pre-filled user info (email, phone)
        theme: {
          color: "#16a34a",      // Brand green color
        },
        // Success handler: called after payment is confirmed by Razorpay
        handler: async (response: any) => {
          try {
            // Verify payment signature on our server to prevent tampering
            const {
              data: { session },
            } = await supabase.auth.getSession();
            const verifyRes = await fetch("/api/razorpay/verify", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session?.access_token}`,
              },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                planType,
              }),
            });

            // Check if verify endpoint succeeded
            if (!verifyRes.ok) {
              const verifyError = await verifyRes.json();
              console.error("Verify failed:", verifyError);
              setError("Payment verified but subscription setup failed. Please contact support.");
              processingRef.current = false;
              setProcessingPlan(null);
              return;
            }

            // Reload subscription from DB to reflect the new active status
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            const { data: subData } = await supabase
              .from("subscriptions")
              .select("*")
              .eq("user_id", currentUser!.id)
              .in("status", ["active", "past_due"])
              .single();

            setSubscription(subData);
          } catch {
            setError("Payment verified but refresh failed. Please reload.");
          }
          processingRef.current = false;
          setProcessingPlan(null);
        },
        // Modal dismiss handler: reset state when user closes without paying
        modal: {
          ondismiss: () => {
            processingRef.current = false;
            setProcessingPlan(null);
          },
        },
      };

      const razorpay = new window.Razorpay(options);
      // Handle payment failure (e.g., insufficient funds, card declined)
      razorpay.on("payment.failed", (response: any) => {
        setError(response.error?.description || "Payment failed");
        processingRef.current = false;
        setProcessingPlan(null);
      });
      razorpay.open(); // Opens the Razorpay payment modal
    } catch {
      setError("Failed to connect to payment service");
      processingRef.current = false;
      setProcessingPlan(null);
    }
  }

  // Cancels the subscription by setting status to "cancelled".
  // Sets subscription to null to immediately show the plan selection UI.
  async function handleCancel() {
    if (!confirm("Are you sure you want to cancel your subscription?"))
      return;

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !subscription) return;

    const { error } = await supabase
      .from("subscriptions")
      .update({ status: "cancelled" })
      .eq("id", subscription.id);

    if (!error) {
      setSubscription(null); // Immediately reflect cancellation in UI
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Subscription</h1>
        <p className="text-muted text-sm mt-1">
          Manage your GolfGive subscription plan
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Active subscription view: shows plan details and cancel button */}
      {subscription ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              <h2 className="font-semibold">Current Plan</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Plan info with status badge */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-primary/5 border border-primary/20">
              <div>
                <p className="text-lg font-semibold capitalize">
                  {subscription.plan_type} Plan
                </p>
                {/* Price display differs by plan type */}
                <p className="text-sm text-muted">
                  {subscription.plan_type === "monthly"
                    ? "₹9.99/mo"
                    : "₹99/yr"}
                </p>
              </div>
              {/* Status badge: active (green), past_due (yellow), cancelled (red) */}
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  subscription.status === "active"
                    ? "bg-success/10 text-success"
                    : subscription.status === "past_due"
                    ? "bg-accent/10 text-accent"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {subscription.status === "active"
                  ? "Active"
                  : subscription.status === "past_due"
                  ? "Past Due"
                  : "Cancelled"}
              </span>
            </div>

            {/* Billing dates: period start and renewal date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="flex items-center gap-2 text-muted">
                <Calendar className="w-4 h-4" />
                Started:{" "}
                {new Date(
                  subscription.current_period_start || subscription.created_at
                ).toLocaleDateString()}
              </div>
              <div className="flex items-center gap-2 text-muted">
                <Calendar className="w-4 h-4" />
                Renews:{" "}
                {subscription.current_period_end
                  ? new Date(
                      subscription.current_period_end
                    ).toLocaleDateString()
                  : "N/A"}
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <Button variant="destructive" onClick={handleCancel}>
                Cancel Subscription
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Plan selection cards — shown when no active subscription exists */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Monthly plan card */}
          <Card hover className="relative overflow-hidden">
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted uppercase tracking-wide">
                  Monthly
                </p>
                <p className="text-4xl font-bold mt-2">
                  ₹9.99
                  <span className="text-lg font-normal text-muted">/mo</span>
                </p>
                <ul className="mt-6 space-y-3 text-sm text-left">
                  {[
                    "Enter golf scores",
                    "Monthly prize draws",
                    "10% to charity",
                    "Cancel anytime",
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                {/* loading prop shows spinner; disabled prevents clicks during any plan processing */}
                <Button
                  className="w-full mt-6"
                  onClick={() => handleSubscribe("monthly")}
                  loading={processingPlan === "monthly"}
                  disabled={processingPlan !== null}
                >
                  Subscribe Monthly
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Yearly plan card — highlighted with "Save 17%" badge and primary border */}
          <Card
            hover
            className="relative overflow-hidden border-primary/30"
          >
            {/* Savings badge positioned in top-right corner */}
            <div className="absolute top-0 right-0 bg-primary text-white text-xs px-3 py-1 rounded-bl-lg font-medium">
              Save 17%
            </div>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-sm text-muted uppercase tracking-wide">
                  Yearly
                </p>
                <p className="text-4xl font-bold mt-2">
                  ₹99
                  <span className="text-lg font-normal text-muted">/yr</span>
                </p>
                <ul className="mt-6 space-y-3 text-sm text-left">
                  {[
                    "Everything in Monthly",
                    "Priority draw entry",
                    "10% to charity",
                    "Best value",
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="w-4 h-4 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full mt-6"
                  onClick={() => handleSubscribe("yearly")}
                  loading={processingPlan === "yearly"}
                  disabled={processingPlan !== null}
                >
                  Subscribe Yearly
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
