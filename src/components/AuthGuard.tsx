/**
 * Client-Side Authentication Guard
 *
 * Wraps protected content and checks if the user is authenticated.
 * If not logged in, redirects to /login with a redirect query parameter
 * so the user can be sent back to their original page after logging in.
 *
 * Shows a loading spinner while checking auth state to prevent flash
 * of unprotected content.
 *
 * Used in: Dashboard layout, any page requiring authentication
 */
"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  useEffect(() => {
    // Check if user is authenticated
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        // Not logged in - redirect to login with the current path as redirect target
        router.push(`/login?redirect=${pathname}`);
      } else {
        // User is authenticated - show the protected content
        setLoading(false);
      }
    });
  }, [supabase, router, pathname]);

  // Show spinner while checking auth state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // User is authenticated - render the children
  return <>{children}</>;
}
