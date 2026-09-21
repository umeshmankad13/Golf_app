/**
 * Client-Side Admin Authorization Guard
 *
 * Wraps admin-only content and performs a two-step check:
 * 1. Is the user authenticated? (If not, redirect to /login)
 * 2. Does the user have the "admin" role in the profiles table?
 *
 * If the user is not an admin, they are redirected to /dashboard.
 * Shows a loading spinner while performing the auth + role check.
 *
 * Used in: Admin layout to protect all admin routes
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    // Step 1: Check if user is authenticated
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push(`/login?redirect=${pathname}`);
        return;
      }

      // Step 2: Check if user has admin role in the profiles table
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        // Not an admin - redirect to regular dashboard
        router.push("/dashboard");
        return;
      }

      // User is an admin - allow access
      setAuthorized(true);
      setLoading(false);
    });
  }, [supabase, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // Don't render anything if not authorized (will redirect)
  if (!authorized) return null;

  return <>{children}</>;
}
