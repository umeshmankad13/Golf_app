"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Users,
  Trophy,
  Heart,
  Award,
  BarChart3,
  ArrowLeft,
} from "lucide-react";
import AdminGuard from "@/components/AdminGuard";

/**
 * Admin panel navigation links.
 * Each link maps a route to a label and icon. The "Overview" link points
 * to /admin (the admin index page), while the others use nested routes.
 * These links are rendered in the sidebar and highlighted based on the
 * current pathname to show which section is active.
 */
const adminLinks = [
  { href: "/admin", label: "Overview", icon: BarChart3 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/draws", label: "Draws", icon: Trophy },
  { href: "/admin/charities", label: "Charities", icon: Heart },
  { href: "/admin/winners", label: "Winners", icon: Award },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
];

/**
 * Admin panel layout with sidebar navigation and AdminGuard protection.
 *
 * This layout wraps all admin pages. It serves two purposes:
 * 1. Security: AdminGuard checks the user's role before rendering any content.
 *    If the user is not an admin, they are redirected away from admin routes.
 * 2. Navigation: A fixed sidebar provides quick access to all admin sections.
 *    The sidebar is hidden on mobile (hidden lg:flex) and only visible on
 *    large screens, keeping the admin interface clean on smaller devices.
 *
 * Data flow: This layout does not fetch data itself. Each child page
 * (e.g., /admin/users/page.tsx) is responsible for its own data loading
 * via Supabase queries. The layout simply provides the shell and auth guard.
 */
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // usePathname() returns the current URL path, used to determine which
  // sidebar link should be highlighted as "active"
  const pathname = usePathname();

  return (
    /* AdminGuard wraps the entire admin UI — it verifies the logged-in user has admin role */
    <AdminGuard>
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* 
          Sidebar: Fixed on large screens (lg:fixed), full height (lg:inset-y-0).
          Hidden on mobile/tablet to save screen space. The width is fixed at
          lg:w-64 (16rem) so the main content can offset with lg:pl-64.
        */}
        <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 bg-white border-r border-border">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            {/* Branding area: "Back to Dashboard" link and "Admin Panel" title */}
            <div className="px-4 mb-6">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 text-sm text-muted hover:text-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Link>
              <h2 className="text-lg font-bold mt-3">Admin Panel</h2>
            </div>

            {/* Navigation links: Each link is conditionally styled based on
                whether the current pathname matches the link's href exactly.
                The exact match (pathname === link.href) ensures only the
                currently active page gets the highlighted style. */}
            <nav className="flex-1 px-3 space-y-1">
              {adminLinks.map((link) => {
                // Exact match: only highlight when we're on the exact route.
                // For nested routes like /admin/users, the /admin/users link
                // will be active, while /admin will not (since pathname !== "/admin").
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

        {/* 
          Main content area: offset by the sidebar width on large screens
          (lg:pl-64). On mobile, it fills the full width. The inner div
          constrains content to a max width (max-w-7xl) and adds horizontal
          padding for different breakpoints.
        */}
        <main className="flex-1 lg:pl-64">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
    </AdminGuard>
  );
}
