/**
 * Supabase Session Middleware
 *
 * This middleware runs on every request and handles two critical tasks:
 * 1. Session Refresh - Refreshes the Supabase auth token on each request
 *    to keep users logged in (tokens expire after ~1 hour)
 * 2. Route Protection - Redirects unauthenticated users to /login for
 *    protected routes (/dashboard, /admin) and non-admins away from /admin
 */
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  // Start with a pass-through response that we'll modify if needed
  let supabaseResponse = NextResponse.next({
    request,
  });

  // Create a Supabase server client that reads/writes cookies
  // This is different from the browser client - it uses cookies for session management
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // Read all cookies from the incoming request
        getAll() {
          return request.cookies.getAll();
        },
        // Write cookies to both the request (for Supabase to read) and response (for browser)
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Get the current user - this also refreshes the session token if needed
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // === ROUTE PROTECTION LOGIC ===

  // Define which routes require authentication
  const protectedPaths = ["/dashboard", "/admin"];
  const isProtected = protectedPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // If accessing a protected route without being logged in, redirect to login
  // The "redirect" param lets the app return the user to where they were after login
  if (isProtected && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirect", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  // Define which routes require admin role
  const adminPaths = ["/admin"];
  const isAdminRoute = adminPaths.some((path) =>
    request.nextUrl.pathname.startsWith(path)
  );

  // If accessing admin routes, verify the user has admin role in the profiles table
  // Non-admin users get redirected to the regular dashboard
  if (isAdminRoute && user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      return NextResponse.redirect(url);
    }
  }

  // Return the response (either pass-through or with redirect)
  return supabaseResponse;
}
