"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/Card";
import Button from "@/components/Button";
import { Award, AlertCircle, CheckCircle, Lock } from "lucide-react";
import type { Draw, DrawEntry, Subscription } from "@/types";

/**
 * Draw entry page. Users pick 5 numbers (1-45) for the monthly prize draw.
 * Shows a number picker grid, prize breakdown, and past entries.
 * Requires an active subscription — shows a lock screen if unsubscribed.
 *
 * Key behaviors:
 * - Number picker is a 9-column grid of 1-45 buttons
 * - toggleNumber() manages selection state (max 5, toggle on/off)
 * - Submission goes through /api/draw server endpoint (not direct Supabase)
 *   to enforce server-side rules (one entry per draw, subscription check)
 * - hasEntered flag disables the submit button if user already entered this draw
 */
export default function DrawsPage() {
  const [activeDraw, setActiveDraw] = useState<Draw | null>(null);
  const [entries, setEntries] = useState<DrawEntry[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  /**
   * Loads three data sources in parallel:
   * 1. The latest published draw (active draw for entry)
   * 2. All of the user's past draw entries (with joined draw data for dates)
   * 3. The user's active subscription (for gating)
   */
  async function loadData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const [drawRes, entriesRes, subRes] = await Promise.all([
      // Fetch the most recent "published" draw — this is the one users can enter
      supabase
        .from("draws")
        .select("*")
        .eq("status", "published")
        .order("draw_date", { ascending: false })
        .limit(1)
        .single(),
      // All entries by this user, newest first, with draw info joined
      supabase
        .from("draw_entries")
        .select("*, draw:draws(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
      // Active subscription check
      supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single(),
    ]);

    setActiveDraw(drawRes.data);
    setEntries(entriesRes.data || []);
    setSubscription(subRes.data);
    setLoading(false);
  }

  /**
   * Toggles a number in/out of the selected set.
   * - If already selected: removes it (deselect)
   * - If not selected and < 5 selected: adds it
   * - If not selected and already 5 selected: no-op (prevents exceeding max)
   * Uses functional state update to avoid stale closure issues.
   */
  function toggleNumber(num: number) {
    setSelectedNumbers((prev) => {
      if (prev.includes(num)) {
        return prev.filter((n) => n !== num);
      }
      if (prev.length >= 5) return prev; // Max 5 numbers enforced
      return [...prev, num];
    });
  }

  /**
   * Submits the draw entry to the server API.
   * Numbers are sorted ascending before sending for consistent storage.
   * The /api/draw endpoint handles:
   *   - Verifying active subscription
   *   - Checking for duplicate entry in this draw
   *   - Inserting the draw_entries row
   */
  async function enterDraw() {
    if (!activeDraw || selectedNumbers.length !== 5) return;
    setSubmitting(true);
    setError("");

    // POST to server-side API (not direct Supabase) for security/validation
    const res = await fetch("/api/draw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        draw_id: activeDraw.id,
        // Sort numbers for consistent storage and display
        selected_numbers: selectedNumbers.sort((a, b) => a - b),
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error);
    } else {
      setSuccess("You entered the draw! Good luck!");
      setSelectedNumbers([]); // Clear selection after successful entry
      loadData(); // Refresh entries list to show the new entry
    }

    setSubmitting(false);
    // Auto-dismiss notifications after 5 seconds
    setTimeout(() => {
      setSuccess("");
      setError("");
    }, 5000);
  }

  // Check if user has already entered the current active draw (prevents duplicate entries)
  const hasEntered = entries.some((e) => e.draw_id === activeDraw?.id);

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
        <h1 className="text-2xl font-bold">Monthly Draws</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <Lock className="w-16 h-16 mx-auto mb-4 text-muted opacity-30" />
            <p className="text-lg font-semibold mb-2">Subscription Required</p>
            <p className="text-muted text-sm mb-4">
              You need an active subscription to enter draws
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
        <h1 className="text-2xl font-bold">Monthly Draws</h1>
        <p className="text-muted text-sm mt-1">
          Pick 5 numbers (1-45) and enter the monthly prize draw
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {success && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 text-success text-sm">
          <CheckCircle className="w-4 h-4" />
          {success}
        </div>
      )}

      {activeDraw ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold">Draw: {activeDraw.draw_date}</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-success/10 text-success">
                  Active
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted mb-4">
                Select exactly 5 numbers from 1 to 45
              </p>

              {/* Number picker grid: 9 columns x 5 rows = 45 buttons (1-45) */}
              {/* Array.from generates [1, 2, ..., 45] for mapping */}
              <div className="grid grid-cols-9 gap-2 mb-6">
                {Array.from({ length: 45 }, (_, i) => i + 1).map((num) => {
                  const isSelected = selectedNumbers.includes(num);
                  return (
                    <button
                      key={num}
                      onClick={() => toggleNumber(num)}
                      // Selected numbers get a scaled-up primary style; unselected get muted
                      className={`w-10 h-10 rounded-lg text-sm font-medium transition-all ${
                        isSelected
                          ? "bg-primary text-white scale-110 shadow-md"
                          : "bg-muted/10 text-foreground hover:bg-primary/10 hover:scale-105"
                      }`}
                    >
                      {num}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center justify-between">
                <p className="text-sm text-muted">
                  Selected: {selectedNumbers.length} / 5
                </p>
                {selectedNumbers.length > 0 && (
                  <p className="text-sm font-medium">
                    {selectedNumbers.sort((a, b) => a - b).join(", ")}
                  </p>
                )}
              </div>

              <Button
                className="w-full mt-4"
                disabled={selectedNumbers.length !== 5 || hasEntered}
                loading={submitting}
                onClick={enterDraw}
              >
                {hasEntered ? "Already Entered" : "Enter Draw"}
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <h2 className="font-semibold">Prize Breakdown</h2>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-lg bg-accent/5">
                  <span className="text-sm">5 Number Match</span>
                  <span className="font-bold text-accent">40% of pool</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-secondary/5">
                  <span className="text-sm">4 Number Match</span>
                  <span className="font-bold text-secondary">35% of pool</span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-lg bg-primary/5">
                  <span className="text-sm">3 Number Match</span>
                  <span className="font-bold text-primary">25% of pool</span>
                </div>
                <div className="p-3 rounded-lg bg-muted/5 text-sm text-muted">
                  5-match jackpot rolls over if unclaimed!
                </div>
              </CardContent>
            </Card>

            {entries.length > 0 && (
              <Card>
                <CardHeader>
                  <h2 className="font-semibold">Your Entries</h2>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {entries.slice(0, 5).map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-muted/5 text-sm"
                      >
                        <span className="text-muted">
                          {entry.draw?.draw_date}
                        </span>
                        <span className="font-medium">
                          {entry.selected_numbers.join(", ")}
                        </span>
                        <span>
                          {entry.matched_count > 0 ? (
                            <span className="text-primary font-medium">
                              {entry.matched_count} matches
                            </span>
                          ) : (
                            <span className="text-muted">Pending</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Award className="w-16 h-16 mx-auto mb-4 text-muted opacity-30" />
            <p className="text-lg font-semibold mb-2">No Active Draw</p>
            <p className="text-muted text-sm">
              Check back later for the next monthly draw
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
