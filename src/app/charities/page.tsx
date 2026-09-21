"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/Card";
import { Heart, Search, ExternalLink } from "lucide-react";
import type { Charity } from "@/types";

/**
 * Public charity directory page. Displays all active charities with
 * search/filter functionality. Accessible to unauthenticated visitors.
 */
export default function CharitiesPage() {
  const [charities, setCharities] = useState<Charity[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadCharities() {
      // Fetch all active charities ordered alphabetically
      const { data } = await supabase
        .from("charities")
        .select("*")
        .eq("is_active", true)
        .order("name");

      setCharities(data || []);
      setLoading(false);
    }

    loadCharities();
  }, [supabase]);

  // Client-side search filter — matches against name or description
  // Case-insensitive for better UX
  const filtered = charities.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Page header — explains that subscriptions support these charities */}
          <div className="text-center mb-12">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Our Charities
            </h1>
            <p className="text-muted max-w-2xl mx-auto">
              Every subscription supports these incredible organizations. Choose
              one when you sign up and direct your contribution where it matters
              most.
            </p>
          </div>

          {/* Search bar — client-side filtering for quick results */}
          <div className="max-w-md mx-auto mb-12">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted" />
              <input
                type="text"
                placeholder="Search charities..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
              />
            </div>
          </div>

          {/* Content — three states: loading, results, or empty */}
          {loading ? (
            // Loading spinner — shown while Supabase query is in progress
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : filtered.length > 0 ? (
            // Charity grid — responsive columns with hover effects
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map((charity) => (
                <Card key={charity.id} hover className="h-full">
                  <CardContent className="pt-6">
                    <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                      <Heart className="w-7 h-7 text-primary" />
                    </div>
                    <h3 className="text-xl font-semibold mb-2">
                      {charity.name}
                    </h3>
                    {/* Description clamped to 3 lines for consistent card heights */}
                    {charity.description && (
                      <p className="text-muted text-sm mb-4 line-clamp-3">
                        {charity.description}
                      </p>
                    )}
                    {/* External link to charity website — opens in new tab */}
                    {charity.website_url && (
                      <a
                        href={charity.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline"
                      >
                        Visit website
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            // Empty state — different message depending on search vs no data
            <div className="text-center py-20 text-muted">
              <Heart className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">
                {search ? "No charities match your search" : "No charities available yet"}
              </p>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
