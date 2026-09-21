"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/Card";
import { Users, Trophy, Heart, Award, Banknote } from "lucide-react";
import type { Profile, Subscription, Draw, Winner } from "@/types";

/**
 * Admin dashboard overview. Displays platform-wide stats:
 * total users, active subscriptions, total draws, total winners,
 * and total prize pool paid out.
 *
 * Data flow:
 * 1. On mount, 5 parallel Supabase queries fire to fetch aggregate counts.
 *    - profiles: total registered users
 *    - subscriptions (status=active): paying subscribers
 *    - draws: total draws created (any status)
 *    - winners: total winners (any status)
 *    - winners (payment_status=paid): sum of prize_amounts paid out
 * 2. Results are aggregated into a single stats object and rendered as
 *    a responsive grid of stat cards (5 columns on large screens).
 *
 * Why parallel queries: Using Promise.all() lets all 5 queries execute
 * concurrently instead of sequentially, significantly reducing load time
 * compared to awaiting each query one after another.
 */
export default function AdminDashboard() {
  // Stats state: initialized to zero values, populated after queries complete.
  // Each stat maps to a metric displayed on a Card component below.
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSubscriptions: 0,
    totalDraws: 0,
    totalWinners: 0,
    totalPrizePool: 0, // Sum of all prize_amounts where payment_status = "paid"
  });
  const [loading, setLoading] = useState(true);
  // createClient() returns a Supabase browser client configured with
  // the project's anon key, stored in component scope so it persists
  // across re-renders and is passed to the useEffect dependency array.
  const supabase = createClient();

  useEffect(() => {
    async function loadStats() {
      // Fire 4 count queries in parallel using Promise.all.
      // { count: "exact", head: true } tells Supabase to return only the
      // count (no row data), which is more efficient for aggregate stats.
      const [usersRes, subsRes, drawsRes, winnersRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase
          .from("subscriptions")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),
        supabase.from("draws").select("id", { count: "exact", head: true }),
        supabase.from("winners").select("id", { count: "exact", head: true }),
      ]);

      // Separate query to get actual prize amounts (not just a count).
      // We need the full prize_amount values to sum them, so we can't
      // use head:true here — we need the data rows.
      const { data: prizeData } = await supabase
        .from("winners")
        .select("prize_amount")
        .eq("payment_status", "paid");

      // Reduce the prize data to a single total. Using reduce() is the
      // standard pattern for summing arrays in JavaScript. The fallback
      // to 0 handles the case where prizeData is null/empty.
      const totalPaid = prizeData
        ? prizeData.reduce((sum, w) => sum + (w.prize_amount || 0), 0)
        : 0;

      // Update state with all computed values. The || 0 fallback handles
      // cases where Supabase returns null for count (e.g., empty table).
      setStats({
        totalUsers: usersRes.count || 0,
        activeSubscriptions: subsRes.count || 0,
        totalDraws: drawsRes.count || 0,
        totalWinners: winnersRes.count || 0,
        totalPrizePool: totalPaid,
      });
      setLoading(false);
    }

    loadStats();
  }, [supabase]); // supabase client is stable (created once), but included for exhaustive deps

  // Loading spinner: shown while async queries are in flight
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Card data array: Each card object maps a stat to its visual representation.
  // This pattern avoids repeating JSX for each card and makes it easy to
  // add/remove/reorder stats without changing the rendering logic.
  // Color classes use Tailwind's opacity modifier (/10) for the background
  // and full opacity for the text, creating a soft tinted icon effect.
  const cards = [
    {
      label: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      color: "bg-primary/10 text-primary",
    },
    {
      label: "Active Subscriptions",
      value: stats.activeSubscriptions,
      icon: Banknote,
      color: "bg-secondary/10 text-secondary",
    },
    {
      label: "Total Draws",
      value: stats.totalDraws,
      icon: Trophy,
      color: "bg-accent/10 text-accent",
    },
    {
      label: "Total Winners",
      value: stats.totalWinners,
      icon: Award,
      color: "bg-pink-500/10 text-pink-500",
    },
    {
      label: "Prize Pool Paid",
      // Format as currency with 2 decimal places
      value: `₹${stats.totalPrizePool.toFixed(2)}`,
      icon: Banknote,
      color: "bg-green-500/10 text-green-500",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p className="text-muted text-sm mt-1">
          Platform overview and key metrics
        </p>
      </div>

      {/* 
        Responsive grid: 1 column on mobile, 2 on sm, 5 on lg.
        Each Card renders a stat with an icon, label, and value.
        The `hover` prop on Card enables a subtle hover animation.
      */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((card) => (
          <Card key={card.label} hover>
            <CardContent className="flex items-center gap-4 py-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.color}`}
              >
                <card.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-muted">{card.label}</p>
                <p className="text-2xl font-bold">{card.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
