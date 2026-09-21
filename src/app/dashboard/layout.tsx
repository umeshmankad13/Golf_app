"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import AuthGuard from "@/components/AuthGuard";
import { createClient } from "@/lib/supabase/client";
import {
  BarChart3,
  Trophy,
  Heart,
  CreditCard,
  Award,
  Settings,
} from "lucide-react";

/** User dashboard navigation links for the sidebar. */
const sidebarLinks = [
  { href: "/dashboard", label: "Overview", icon: BarChart3 },
  { href: "/dashboard/scores", label: "My Scores", icon: Trophy },
  { href: "/dashboard/draws", label: "Monthly Draws", icon: Award },
  { href: "/dashboard/subscription", label: "Subscription", icon: CreditCard },
  { href: "/dashboard/charity", label: "My Charity", icon: Heart },
  { href: "/dashboard/winnings", label: "Winnings", icon: Award },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

/**
 * User dashboard layout with responsive sidebar (fixed on desktop, floating toggle on mobile) and AuthGuard protection.
 *
 * Data flow:
 * - AuthGuard wraps all children, redirecting unauthenticated users to /login
 * - usePathname() provides the current route for active-link highlighting
 * - sidebarOpen state controls mobile overlay visibility
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  // Controls mobile sidebar overlay open/close state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    // AuthGuard ensures only authenticated users can access any dashboard page.
    // It checks the Supabase session on mount and redirects to /login if absent.
    <AuthGuard>
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* ===== Desktop Sidebar ===== */}
        {/* Fixed left sidebar visible only on lg+ screens. Uses inset-y-0 to span full height. */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-border">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            {/* Brand logo linking back to home */}
            <div className="px-4 mb-6">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <span className="text-lg font-bold">
                  Golf<span className="text-primary">Give</span>
                </span>
              </Link>
            </div>

            {/* Navigation links — each renders with active state when pathname matches */}
            <nav className="flex-1 px-3 space-y-1">
              {sidebarLinks.map((link) => {
                // Exact match: only the current route gets the highlighted style
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted hover:text-foreground hover:bg-muted/10"
                    }`}
                  >
                    <link.icon className="w-5 h-5" />
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* ===== Mobile Sidebar Toggle ===== */}
        {/* Floating action button in the bottom-left corner, visible only below lg breakpoint */}
        <div className="lg:hidden fixed bottom-4 left-4 z-50">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="w-12 h-12 rounded-full bg-primary text-white shadow-lg flex items-center justify-center"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* ===== Mobile Sidebar Overlay ===== */}
        {/* Full-screen overlay with semi-transparent backdrop; clicking backdrop closes sidebar.
            The sidebar itself slides in from the left. Links call setSidebarOpen(false) on click
            so navigation closes the overlay. */}
        {sidebarOpen && (
          <div className="lg:hidden fixed inset-0 z-40">
            {/* Backdrop — click to close */}
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setSidebarOpen(false)}
            />
            {/* Sliding sidebar panel */}
            <aside className="absolute left-0 top-0 bottom-0 w-64 bg-white border-r border-border p-4">
              <nav className="space-y-1">
                {sidebarLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      // Close overlay after navigating
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted hover:text-foreground hover:bg-muted/10"
                      }`}
                    >
                      <link.icon className="w-5 h-5" />
                      {link.label}
                    </Link>
                  );
                })}
              </nav>
            </aside>
          </div>
        )}

        {/* ===== Main Content Area ===== */}
        {/* Offset by lg:pl-64 to account for the fixed desktop sidebar width */}
        <main className="flex-1 lg:pl-64">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
    </AuthGuard>
  );
}
