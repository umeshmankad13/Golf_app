"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Button from "@/components/Button";
import { Card } from "@/components/Card";
import {
  Trophy,
  Heart,
  BarChart3,
  ArrowRight,
  Star,
  Users,
  TrendingUp,
  Sparkles,
  Shield,
  Gift,
} from "lucide-react";
import type { User } from "@supabase/supabase-js";
import type { Charity } from "@/types";

/**
 * Landing page with hero section, how-it-works steps, prize pool breakdown,
 * featured charities, trust badges, and CTA. Communicates the platform's
 * purpose: play golf, win prizes, and support charity.
 */
export default function Home() {
  // Track current user to personalize CTAs (logged-in vs. new visitor)
  const [user, setUser] = useState<User | null>(null);
  // Fetch top 3 active charities for the spotlight section
  const [charities, setCharities] = useState<Charity[]>([]);
  const supabase = createClient();

  useEffect(() => {
    // Check if user is authenticated to tailor button text and destinations
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
    // Load featured charities — only active ones, limited to 3 for the landing page
    supabase
      .from("charities")
      .select("*")
      .eq("is_active", true)
      .limit(3)
      .then(({ data }) => setCharities(data || []));
  }, [supabase]);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section — Main value proposition with animated entrance */}
        <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-background to-secondary/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-32">
            <div className="text-center max-w-3xl mx-auto">
              {/* Badge — subtle callout above the headline */}
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-6 animate-fade-in">
                <Star className="w-4 h-4" />
                Play Golf. Win Prizes. Change Lives.
              </div>

              {/* Main headline — primary and secondary text for visual hierarchy */}
              <h1 className="text-4xl md:text-6xl font-bold text-foreground mb-6 animate-fade-in">
                Every Swing{" "}
                <span className="text-primary">Makes a Difference</span>
              </h1>

              {/* Subheadline explaining the three core features */}
              <p className="text-lg md:text-xl text-muted mb-8 animate-fade-in">
                Track your golf performance, enter monthly prize draws, and
                direct a portion of your subscription to the charity you care
                about most.
              </p>

              {/* Primary CTA — adapts based on auth state; pulse-glow draws attention */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in">
                <Link href={user ? "/dashboard/subscription" : "/signup"}>
                  <Button size="lg" className="w-full sm:w-auto animate-pulse-glow text-lg px-8 py-4">
                    {user ? "Manage Subscription" : "Subscribe Now — $9.99/mo"}
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
                {/* Secondary CTA — low-commitment path to explore charities */}
                <Link href="/charities">
                  <Button variant="outline" size="lg" className="w-full sm:w-auto">
                    Browse Charities
                  </Button>
                </Link>
              </div>
              <p className="text-sm text-muted mt-4 animate-fade-in">
                10% of every subscription goes directly to charity
              </p>
            </div>
          </div>
        </section>

        {/* How It Works — Three-step explanation of the platform flow */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                How It Works
              </h2>
              <p className="text-muted max-w-2xl mx-auto">
                Three simple steps to play, win, and give back.
              </p>
            </div>

            {/* Three cards explaining the user journey: Track → Win → Give */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Step 1: Score tracking — Stableford format with best-5 rolling average */}
              <Card className="text-center p-8" hover>
                <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">1. Track Scores</h3>
                <p className="text-muted text-sm">
                  Enter your latest golf scores in Stableford format. Your best
                  5 scores are always tracked.
                </p>
              </Card>

              {/* Step 2: Prize draws — monthly lottery-style matching game */}
              <Card className="text-center p-8" hover>
                <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <Trophy className="w-8 h-8 text-secondary" />
                </div>
                <h3 className="text-xl font-semibold mb-3">2. Win Prizes</h3>
                <p className="text-muted text-sm">
                  Enter monthly draws and match numbers to win from the prize
                  pool. Jackpot rolls over if unclaimed!
                </p>
              </Card>

              {/* Step 3: Charity donation — user chooses where 10%+ goes */}
              <Card className="text-center p-8" hover>
                <div className="w-16 h-16 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <Heart className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-xl font-semibold mb-3">3. Give Back</h3>
                <p className="text-muted text-sm">
                  Choose a charity and direct at least 10% of your subscription.
                  Your gameplay creates real impact.
                </p>
              </Card>
            </div>
          </div>
        </section>

        {/* Prize Pool Distribution — Visual breakdown of how subscription money is split */}
        <section className="py-20 bg-gradient-to-br from-foreground to-gray-800 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Prize Pool Distribution
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                Every subscription feeds the prize pool. Here&apos;s how winnings are distributed.
              </p>
            </div>

            {/* Three-tier prize structure — 40/35/25 split */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Jackpot tier — 40% for matching all 5 numbers; rolls over if unclaimed */}
              <div className="bg-white/5 border border-white/10 text-white rounded-2xl p-8 text-center">
                <div className="text-5xl font-bold text-primary-light mb-4">40%</div>
                <h3 className="text-xl font-semibold mb-2">5-Number Match</h3>
                <p className="text-gray-400 text-sm">Jackpot tier — rolls over if unclaimed</p>
              </div>

              {/* Second tier — 35% split equally among 4-number matches */}
              <div className="bg-white/5 border border-white/10 text-white rounded-2xl p-8 text-center">
                <div className="text-5xl font-bold text-secondary mb-4">35%</div>
                <h3 className="text-xl font-semibold mb-2">4-Number Match</h3>
                <p className="text-gray-400 text-sm">Split equally among winners</p>
              </div>

              {/* Third tier — 25% split equally among 3-number matches */}
              <div className="bg-white/5 border border-white/10 text-white rounded-2xl p-8 text-center">
                <div className="text-5xl font-bold text-accent mb-4">25%</div>
                <h3 className="text-xl font-semibold mb-2">3-Number Match</h3>
                <p className="text-gray-400 text-sm">Split equally among winners</p>
              </div>
            </div>
          </div>
        </section>

        {/* Charity Spotlight — Dynamically loaded from Supabase; only renders if charities exist */}
        {charities.length > 0 && (
          <section className="py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2 bg-accent/10 text-accent px-4 py-1.5 rounded-full text-sm font-medium mb-6">
                  <Heart className="w-4 h-4" />
                  Making an Impact
                </div>
                <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
                  Featured Charities
                </h2>
                <p className="text-muted max-w-2xl mx-auto">
                  Every subscription supports these incredible organizations. Choose the cause closest to your heart.
                </p>
              </div>

              {/* Charity cards — mapped from the first 3 active charities */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {charities.map((charity) => (
                  <Card key={charity.id} className="p-6" hover>
                    <div className="w-full h-40 rounded-xl bg-muted flex items-center justify-center mb-4">
                      <Heart className="w-10 h-10 text-accent" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{charity.name}</h3>
                    <p className="text-muted text-sm line-clamp-2">{charity.description}</p>
                  </Card>
                ))}
              </div>

              <div className="text-center mt-12">
                <Link href="/charities">
                  <Button variant="outline" size="lg">
                    View All Charities
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              </div>
            </div>
          </section>
        )}

        {/* Trust Badges — Social proof and credibility signals */}
        <section className="py-16 bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
              {/* Security badge — Stripe integration for PCI compliance */}
              <div>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-1">Secure Payments</h3>
                <p className="text-muted text-sm">Powered by Stripe — PCI-compliant processing</p>
              </div>
              {/* Fairness badge — transparent draw system */}
              <div>
                <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-6 h-6 text-secondary" />
                </div>
                <h3 className="font-semibold mb-1">Fair Draws</h3>
                <p className="text-muted text-sm">Transparent, verifiable prize draw system</p>
              </div>
              {/* Impact badge — 100% of charity contributions reach causes */}
              <div>
                <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <Gift className="w-6 h-6 text-accent" />
                </div>
                <h3 className="font-semibold mb-1">Real Impact</h3>
                <p className="text-muted text-sm">100% of charity contributions go to causes</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section — Final conversion push; adapts for logged-in vs new users */}
        <section className="py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <Card className="p-12 text-center bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
              <Users className="w-12 h-12 text-primary mx-auto mb-6" />
              <h2 className="text-3xl font-bold mb-4">Ready to Make a Difference?</h2>
              <p className="text-muted max-w-xl mx-auto mb-8">
                Join golfers who play for prizes and give for change.
              </p>
              {/* CTA — links to dashboard for logged-in users, signup for visitors */}
              <Link href={user ? "/dashboard" : "/signup"}>
                <Button size="lg" className="animate-pulse-glow">
                  {user ? "Go to Dashboard" : "Get Started — Subscribe Now"}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <p className="text-sm text-muted mt-4">
                From $9.99/month • Cancel anytime • 10% to charity
              </p>
            </Card>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
