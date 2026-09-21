"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/Card";
import Button from "@/components/Button";
import Input from "@/components/Input";
import { Heart, AlertCircle, CheckCircle, Lock } from "lucide-react";
import type { Charity, UserCharity, Subscription } from "@/types";

/**
 * Charity selection page. Users browse active charities, select one to support,
 * and adjust their contribution percentage (10-50% of subscription).
 * Updates the subscription's charity_percentage field in the database.
 *
 * Data flow:
 * 1. Load active charities, user's current charity selection, and subscription in parallel
 * 2. If user already has a charity (userCharity exists), the card at top shows it
 * 3. Clicking a charity card triggers handleSelectCharity which does upsert logic:
 *    - If userCharity exists: UPDATE the charity_id
 *    - If userCharity is null: INSERT a new row with donation_amount: 0
 * 4. Contribution percentage is stored on the subscription record, not the charity link
 * 5. Slider range is 10-50%, with 10% minimum enforced
 */
export default function CharityPage() {
  const [charities, setCharities] = useState<Charity[]>([]);
  const [userCharity, setUserCharity] = useState<UserCharity | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [charityPercent, setCharityPercent] = useState(10);
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [charitiesRes, userCharityRes, subRes] = await Promise.all([
        supabase
          .from("charities")
          .select("*")
          .eq("is_active", true)
          .order("name"),
        supabase
          .from("user_charities")
          .select("*, charity:charities(*)")
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "active")
          .single(),
      ]);

      setCharities(charitiesRes.data || []);
      setUserCharity(userCharityRes.data);
      setSubscription(subRes.data);
      setLoading(false);
    }

    loadData();
  }, [supabase]);

  /**
   * Upsert logic for charity selection:
   * - If userCharity exists (user already picked a charity): UPDATE charity_id
   * - If userCharity is null (first time): INSERT with donation_amount: 0
   * After mutation, re-fetches the user_charity row with joined charity data
   * to update the UI with the selected charity's name.
   */
  async function handleSelectCharity(charityId: string) {
    setSaving(true);
    setError("");
    setSuccess("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (userCharity) {
      // UPDATE path: user is switching to a different charity
      const { error } = await supabase
        .from("user_charities")
        .update({ charity_id: charityId })
        .eq("user_id", user.id);

      if (error) {
        setError(error.message);
      } else {
        // Re-fetch with join to get the charity name for display
        const { data } = await supabase
          .from("user_charities")
          .select("*, charity:charities(*)")
          .eq("user_id", user.id)
          .single();
        setUserCharity(data);
        setSuccess("Charity updated!");
      }
    } else {
      // INSERT path: first-time charity selection
      const { error } = await supabase.from("user_charities").insert({
        user_id: user.id,
        charity_id: charityId,
        donation_amount: 0, // Initial donation amount; actual amount calculated from percentage
      });

      if (error) {
        setError(error.message);
      } else {
        const { data } = await supabase
          .from("user_charities")
          .select("*, charity:charities(*)")
          .eq("user_id", user.id)
          .single();
        setUserCharity(data);
        setSuccess("Charity selected!");
      }
    }

    setSaving(false);
    setTimeout(() => setSuccess(""), 3000);
  }

  /**
   * Updates the contribution percentage on the subscription record.
   * This value determines what % of the subscription fee goes to the selected charity.
   * Only updates the local subscription state on success (optimistic UI).
   */
  async function handleUpdatePercent() {
    if (!userCharity || !subscription) return;

    const { error } = await supabase
      .from("subscriptions")
      .update({ charity_percentage: charityPercent })
      .eq("id", subscription.id);

    if (!error) {
      // Optimistic update: merge new percentage into local state without refetching
      setSubscription({ ...subscription, charity_percentage: charityPercent });
      setSuccess("Contribution updated!");
      setTimeout(() => setSuccess(""), 3000);
    }
  }

  // Client-side search filter: matches charity name or description (case-insensitive)
  // description is optional (nullable), so we use optional chaining
  const filtered = charities.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">My Charity</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <Lock className="w-16 h-16 mx-auto mb-4 text-muted opacity-30" />
            <p className="text-lg font-semibold mb-2">Subscription Required</p>
            <p className="text-muted text-sm mb-4">
              You need an active subscription to select a charity
            </p>
            <a href="/dashboard/subscription">
              <Button>Get Subscription</Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Charity</h1>
        <p className="text-muted text-sm mt-1">
          Choose a charity to support with your subscription
        </p>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 text-success text-sm">
          <CheckCircle className="w-4 h-4" />
          {success}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {userCharity?.charity && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Heart className="w-7 h-7 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted">Your selected charity</p>
                  <p className="text-lg font-semibold">
                    {userCharity.charity.name}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contribution percentage slider — only shown when subscription exists */}
      {subscription && (
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Contribution Percentage</h2>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted mb-4">
              Minimum 10% of your subscription goes to charity. You can increase
              this amount.
            </p>
            {/* Range slider: 10% minimum, 50% maximum. Value is local state until "Update" clicked. */}
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={10}
                max={50}
                value={charityPercent}
                onChange={(e) => setCharityPercent(Number(e.target.value))}
                className="flex-1"
              />
              <span className="text-lg font-bold text-primary w-16 text-right">
                {charityPercent}%
              </span>
            </div>
            {/* Disabled when no change has been made to prevent unnecessary DB writes */}
            <Button
              className="mt-4"
              size="sm"
              onClick={handleUpdatePercent}
              disabled={charityPercent === subscription.charity_percentage}
            >
              Update
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Heart className="w-5 h-5 text-muted" />
            <Input
              placeholder="Search charities..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border-0 p-0 focus:ring-0"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length > 0 ? (
            /* Charity card grid — 2 columns on md+, 1 column on mobile */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((charity) => {
                // Check if this charity is the user's currently selected charity
                const isSelected = userCharity?.charity_id === charity.id;
                return (
                  <div
                    key={charity.id}
                    // Selected card gets primary border + background tint
                    className={`p-4 rounded-xl border-2 transition-all cursor-pointer ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    }`}
                    // Clicking any charity card triggers the upsert flow
                    onClick={() => handleSelectCharity(charity.id)}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Heart className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold truncate">{charity.name}</h3>
                        {charity.description && (
                          <p className="text-sm text-muted mt-1 line-clamp-2">
                            {charity.description}
                          </p>
                        )}
                      </div>
                      {/* Checkmark icon indicates currently selected charity */}
                      {isSelected && (
                        <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-muted">
              <Heart className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">
                {search ? "No charities match" : "No charities available"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
