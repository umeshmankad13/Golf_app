"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/Card";
import {
  Users,
  Trophy,
  Heart,
  Banknote,
  TrendingUp,
} from "lucide-react";

/**
 * Admin reports and analytics page. Displays 8 stat cards covering:
 * total users, active subscriptions (monthly/yearly), total/published draws,
 * total winners, and total prize paid. Includes revenue estimate and
 * charity impact panels.
 *
 * Data flow:
 * 1. On mount, 8 parallel Supabase queries fire to gather all metrics.
 *    Using { count: "exact", head: true } for count-only queries avoids
 *    fetching row data, improving performance for aggregate stats.
 * 2. The prize sum query fetches actual prize_amount values (not head:true)
 *    because we need to sum the values, not just count them.
 * 3. Results are stored in a single stats state object and rendered as
 *    stat cards in a responsive 4-column grid.
 *
 * Revenue calculation:
 * - Monthly plans: ₹9.99/subscriber/month
 * - Yearly plans: ₹99/subscriber/year (approx ₹8.25/month, offering savings)
 * - Total revenue = (monthlySubs x ₹9.99) + (yearlySubs x ₹99)
 *
 * Revenue split (core business rule):
 * - 10% goes to the charity pool (funds charity donations)
 * - 90% goes to the prize pool (funds winner payouts)
 */
export default function AdminReportsPage() {
  // Stats state: holds all computed metrics. Each field maps to a stat card
  // displayed in the grid below. TotalPrizePaid is the sum of all prize amounts.
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSubscriptions: 0,
    monthlySubs: 0,
    yearlySubs: 0,
    totalDraws: 0,
    publishedDraws: 0,
    totalWinners: 0,
    totalPrizePaid: 0, // Sum of all prize_amounts across all winners
  });
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadStats() {
      // Fire 8 queries in parallel for maximum performance.
      // Queries 1-2, 5-7 use count:exact + head:true for efficient counting.
      // Queries 3-4 are filtered versions of query 2 (monthly vs yearly subs).
      // Query 6 is a filtered version of query 5 (published/completed draws).
      // Query 8 fetches actual prize data for summing (not just counting).
      const [
        usersRes,
        activeSubsRes,
        monthlyRes,
        yearlyRes,
        drawsRes,
        pubDrawsRes,
        winnersRes,
        prizesRes,
      ] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase
          .from("subscriptions")
          .select("id", { count: "exact", head: true })
          .eq("status", "active"),
        supabase
          .from("subscriptions")
          .select("id", { count: "exact", head: true })
          .eq("status", "active")
          .eq("plan_type", "monthly"),
        supabase
          .from("subscriptions")
          .select("id", { count: "exact", head: true })
          .eq("status", "active")
          .eq("plan_type", "yearly"),
        supabase.from("draws").select("id", { count: "exact", head: true }),
        supabase
          .from("draws")
          .select("id", { count: "exact", head: true })
          .in("status", ["published", "completed"]),
        supabase
          .from("winners")
          .select("id", { count: "exact", head: true }),
        // Fetch all prize amounts for summing (no head:true needed)
        supabase.from("winners").select("prize_amount"),
      ]);

      // Sum all prize amounts using reduce(). The || 0 fallback handles
      // null prize_amount values in individual records.
      const totalPrizePaid =
        prizesRes.data?.reduce((sum: number, w: any) => sum + (w.prize_amount || 0), 0) || 0;

      setStats({
        totalUsers: usersRes.count || 0,
        activeSubscriptions: activeSubsRes.count || 0,
        monthlySubs: monthlyRes.count || 0,
        yearlySubs: yearlyRes.count || 0,
        totalDraws: drawsRes.count || 0,
        publishedDraws: pubDrawsRes.count || 0,
        totalWinners: winnersRes.count || 0,
        totalPrizePaid,
      });
      setLoading(false);
    }

    loadStats();
  }, [supabase]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Revenue calculations based on subscription counts and pricing.
  // These are estimates - actual revenue may vary due to refunds,
  // prorated charges, or promotional discounts.
  const totalRevenue =
    stats.monthlySubs * 9.99 + stats.yearlySubs * 99;
  // Business rule: 10% of revenue goes to charity, 90% to prizes
  const charityPool = totalRevenue * 0.1;
  const prizePool = totalRevenue * 0.9;

  // Stat cards array: maps each metric to its display configuration.
  // This data-driven approach avoids repeating JSX for each card and
  // makes it trivial to add, remove, or reorder stats.
  const reportCards = [
    {
      title: "Total Users",
      value: stats.totalUsers,
      icon: Users,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Active Subscriptions",
      value: stats.activeSubscriptions,
      icon: Banknote,
      color: "text-secondary",
      bg: "bg-secondary/10",
    },
    {
      title: "Monthly Plans",
      value: stats.monthlySubs,
      icon: TrendingUp,
      color: "text-accent",
      bg: "bg-accent/10",
    },
    {
      title: "Yearly Plans",
      value: stats.yearlySubs,
      icon: TrendingUp,
      color: "text-pink-500",
      bg: "bg-pink-500/10",
    },
    {
      title: "Total Draws",
      value: stats.totalDraws,
      icon: Trophy,
      color: "text-secondary",
      bg: "bg-secondary/10",
    },
    {
      title: "Published Draws",
      value: stats.publishedDraws,
      icon: Trophy,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      title: "Total Winners",
      value: stats.totalWinners,
      icon: Heart,
      color: "text-pink-500",
      bg: "bg-pink-500/10",
    },
    {
      title: "Total Prize Paid",
      value: `₹${stats.totalPrizePaid.toFixed(2)}`,
      icon: Banknote,
      color: "text-accent",
      bg: "bg-accent/10",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        <p className="text-muted text-sm mt-1">
          Platform performance metrics and statistics
        </p>
      </div>

      {/* 
        Stat cards grid: 1 column on mobile, 2 on sm, 4 on lg.
        Each card shows an icon, title, and computed value.
      */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {reportCards.map((card) => (
          <Card key={card.title} hover>
            <CardContent className="py-4">
              <div className="flex items-center gap-3 mb-3">
                <div
                  className={`w-10 h-10 rounded-lg ${card.bg} flex items-center justify-center`}
                >
                  <card.icon className={`w-5 h-5 ${card.color}`} />
                </div>
                <p className="text-sm text-muted">{card.title}</p>
              </div>
              <p className="text-2xl font-bold">{card.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 
        Two-panel layout: Revenue Estimate and Charity Impact.
        These show computed financial metrics based on subscription data.
        Displayed side-by-side on large screens (lg:grid-cols-2).
      */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Estimate Panel: breaks down revenue by plan type */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Revenue Estimate</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Monthly revenue: count of monthly subs x price per month */}
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/5">
                <span className="text-sm text-muted">Monthly Revenue</span>
                <span className="font-semibold">
                  ₹{(stats.monthlySubs * 9.99).toFixed(2)}
                </span>
              </div>
              {/* Yearly revenue: count of yearly subs x price per year */}
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/5">
                <span className="text-sm text-muted">Yearly Revenue</span>
                <span className="font-semibold">
                  ₹{(stats.yearlySubs * 99).toFixed(2)}
                </span>
              </div>
              {/* Total revenue: highlighted with primary border for emphasis */}
              <div className="flex justify-between items-center p-3 rounded-lg bg-primary/5 border border-primary/20">
                <span className="text-sm font-medium">Estimated Total</span>
                <span className="font-bold text-primary">
                  ₹{totalRevenue.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Charity Impact Panel: shows how revenue is split between charity and prizes */}
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Charity Impact</h2>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Charity pool: 10% of total revenue allocated to charity donations */}
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/5">
                <span className="text-sm text-muted">Charity Pool (10%)</span>
                <span className="font-semibold">
                  ₹{charityPool.toFixed(2)}
                </span>
              </div>
              {/* Prize pool: 90% of total revenue allocated to winner payouts */}
              <div className="flex justify-between items-center p-3 rounded-lg bg-muted/5">
                <span className="text-sm text-muted">Prize Pool (90%)</span>
                <span className="font-semibold">
                  ₹{prizePool.toFixed(2)}
                </span>
              </div>
              {/* Total impact: summary of winners paid from the prize pool */}
              <div className="flex justify-between items-center p-3 rounded-lg bg-pink-500/5 border border-pink-500/20">
                <span className="text-sm font-medium text-pink-500">
                  Total Impact
                </span>
                <span className="font-bold text-pink-500">
                  {stats.totalWinners} winners paid
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
