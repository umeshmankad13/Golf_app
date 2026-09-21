"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/Card";
import { Trophy, CreditCard, Heart, Award, TrendingUp } from "lucide-react";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";
import type { Profile, Subscription, Score, UserCharity, DrawEntry } from "@/types";

/**
 * User dashboard overview. Displays stats cards (subscription, scores entered,
 * average score, selected charity) and a list of the 5 most recent scores.
 *
 * Data flow:
 * 1. On mount, loadSupabase client is created and used to fetch all data in parallel
 * 2. Five Supabase queries run via Promise.all for performance (profile, subscription,
 *    scores, user charity with joined charity name, and draw entries with joined draw data)
 * 3. Results populate individual state slices that feed into stat cards and lists
 * 4. Average score is computed client-side from the scores array
 */
export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [scores, setScores] = useState<Score[]>([]);
  const [userCharity, setUserCharity] = useState<UserCharity | null>(null);
  const [drawEntries, setDrawEntries] = useState<DrawEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      // Get the currently authenticated user from Supabase
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);

      if (!user) return;

      // Run all 5 queries in parallel to minimize load time.
      // Each query targets a different table, filtered by the current user's ID.
      const [profileRes, subRes, scoresRes, charityRes, drawsRes] = await Promise.all([
        // Profile: basic user info (full_name, etc.)
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        // Active subscription: used to show plan type and gate features
        supabase
          .from("subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .eq("status", "active")
          .single(),
        // Scores: latest 5, ordered by date descending for "recent scores" list
        supabase
          .from("scores")
          .select("*")
          .eq("user_id", user.id)
          .order("score_date", { ascending: false })
          .limit(5),
        // User charity: uses Supabase join syntax to pull in the charity's name/description
        // .single() assumes one charity per user (enforced by DB constraint)
        supabase
          .from("user_charities")
          .select("*, charity:charities(*)")
          .eq("user_id", user.id)
          .single(),
        // Draw entries: all entries by this user, with joined draw data for date info
        supabase
          .from("draw_entries")
          .select("*, draw:draws(*)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      // Update state with query results (null-safe for single queries, fallback [] for lists)
      setProfile(profileRes.data);
      setSubscription(subRes.data);
      setScores(scoresRes.data || []);
      setUserCharity(charityRes.data);
      setDrawEntries(drawsRes.data || []);
      setLoading(false);
    }

    loadData();
  }, [supabase]); // Supabase client is stable (created once), so this effect runs once on mount

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Calculate average Stableford score from all loaded scores.
  // If no scores exist, display a dash placeholder.
  // reduce() sums all score values, then divides by count for the mean.
  const avgScore =
    scores.length > 0
      ? (scores.reduce((sum, s) => sum + s.score, 0) / scores.length).toFixed(1)
      : "-";

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">
          Welcome{profile?.full_name ? `, ${profile.full_name}` : ""}
        </h1>
        <p className="text-muted text-sm mt-1">
          Here&apos;s your golf performance overview
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card hover>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <CreditCard className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted">Subscription</p>
              <p className="font-semibold">
                {subscription ? (
                  <span className="text-success capitalize">
                    {subscription.plan_type}
                  </span>
                ) : (
                  <span className="text-muted">None</span>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card hover>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <p className="text-sm text-muted">Scores Entered</p>
              <p className="font-semibold">{scores.length} / 5</p>
            </div>
          </CardContent>
        </Card>

        <Card hover>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted">Avg Score</p>
              <p className="font-semibold">{avgScore}</p>
            </div>
          </CardContent>
        </Card>

        <Card hover>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="w-12 h-12 rounded-xl bg-pink-500/10 flex items-center justify-center">
              <Heart className="w-6 h-6 text-pink-500" />
            </div>
            <div>
              <p className="text-sm text-muted">Charity</p>
              <p className="font-semibold">
                {userCharity?.charity?.name || (
                  <Link href="/dashboard/charity" className="text-primary hover:underline text-sm">
                    Select one
                  </Link>
                )}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card hover>
          <CardContent className="flex items-center gap-4 py-4">
            <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center">
              <Award className="w-6 h-6 text-secondary" />
            </div>
            <div>
              <p className="text-sm text-muted">Draws Entered</p>
              <p className="font-semibold">{drawEntries.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Scores */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Scores</h2>
            <Link
              href="/dashboard/scores"
              className="text-sm text-primary hover:underline"
            >
              View all
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {scores.length > 0 ? (
            <div className="space-y-3">
              {scores.slice(0, 3).map((score) => (
                <div
                  key={score.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/5"
                >
                  <div>
                    <p className="font-medium">Score: {score.score}</p>
                    <p className="text-sm text-muted">{score.score_date}</p>
                  </div>
                  <div className="text-2xl font-bold text-primary">
                    {score.score}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted">
              <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No scores yet</p>
              <Link
                href="/dashboard/scores"
                className="text-primary text-sm hover:underline"
              >
                Enter your first score
              </Link>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Draw Entries */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Draw Entries</h2>
            <Link
              href="/dashboard/draws"
              className="text-sm text-primary hover:underline"
            >
              View all
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {drawEntries.length > 0 ? (
            <div className="space-y-3">
              {drawEntries.slice(0, 3).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/5"
                >
                  <div>
                    <p className="font-medium">
                      Draw: {entry.draw?.draw_date}
                    </p>
                    <p className="text-sm text-muted">
                      Numbers: {entry.selected_numbers.join(", ")}
                    </p>
                  </div>
                  <div>
                    {entry.matched_count > 0 ? (
                      <span className="text-sm font-medium text-primary">
                        {entry.matched_count} matches
                      </span>
                    ) : (
                      <span className="text-sm text-muted">Pending</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted">
              <Award className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No draw entries yet</p>
              <Link
                href="/dashboard/draws"
                className="text-primary text-sm hover:underline"
              >
                Enter your first draw
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
