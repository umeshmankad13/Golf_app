"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { LogOut, Menu, X, Trophy, Heart, BarChart3 } from "lucide-react";
import type { User } from "@supabase/supabase-js";

/**
 * Top navigation bar with auth-aware links, mobile hamburger menu,
 * and dynamic nav items based on user role (subscriber vs admin).
 *
 * Behavior:
 * - On mount: Fetches current user and their role from the profiles table
 * - Subscribes to auth state changes (login/logout) to update the UI
 * - Shows different nav links depending on auth state and role
 * - Mobile: Hamburger menu toggle for responsive navigation
 */
export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string>("subscriber");
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    // Fetch the current user on mount
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
      // If user is logged in, also fetch their role from the profiles table
      if (user) {
        supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single()
          .then(({ data }) => {
            if (data) setRole(data.role);
          });
      }
    });

    // Subscribe to auth state changes (e.g., login/logout in another tab)
    // This ensures the navbar stays in sync across the app
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    // Cleanup: Unsubscribe from auth listener when component unmounts
    return () => subscription.unsubscribe();
  }, [supabase]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // Full page reload to clear all client state
    window.location.href = "/";
  };

  // Build nav links based on auth state
  // Logged-in users see: Dashboard, Scores, Charity (+ Admin if admin role)
  // Logged-out users see: Charities only
  const navLinks = user
    ? [
        { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
        { href: "/dashboard/scores", label: "Scores", icon: Trophy },
        { href: "/dashboard/charity", label: "Charity", icon: Heart },
        ...(role === "admin"
          ? [{ href: "/admin", label: "Admin", icon: BarChart3 }]
          : []),
      ]
    : [
        { href: "/charities", label: "Charities", icon: Heart },
      ];

  return (
    <nav className="bg-white/80 backdrop-blur-md border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-foreground">
                Golf<span className="text-primary">Give</span>
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    pathname === link.href
                      ? "bg-primary/10 text-primary"
                      : "text-muted hover:text-foreground hover:bg-muted/10"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <span className="text-sm text-muted">
                  {user.email}
                </span>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-muted hover:text-foreground hover:bg-muted/10 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-muted hover:text-foreground transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-primary text-white hover:bg-primary-dark transition-colors"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>

          <button
            className="md:hidden p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-white">
          <div className="px-4 py-3 space-y-1">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                  pathname === link.href
                    ? "bg-primary/10 text-primary"
                    : "text-muted hover:text-foreground hover:bg-muted/10"
                }`}
              >
                {link.label}
              </Link>
            ))}
            {user ? (
              <button
                onClick={handleLogout}
                className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/10"
              >
                Logout
              </button>
            ) : (
              <>
                <Link
                  href="/login"
                  className="block px-3 py-2 rounded-lg text-sm font-medium text-muted hover:bg-muted/10"
                  onClick={() => setMobileOpen(false)}
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="block px-3 py-2 rounded-lg text-sm font-medium bg-primary text-white text-center"
                  onClick={() => setMobileOpen(false)}
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
