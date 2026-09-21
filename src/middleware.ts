/**
 * Next.js Root Middleware
 *
 * This middleware currently acts as a passthrough - it does nothing.
 * The actual route protection is handled by:
 * - src/lib/supabase/middleware.ts (server-side session refresh + route guards)
 * - src/components/AuthGuard.tsx (client-side auth check for dashboard)
 * - src/components/AdminGuard.tsx (client-side admin check for admin panel)
 *
 * The matcher config ensures middleware runs on all routes except:
 * - Static files (_next/static, images, favicon, SVGs)
 */
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  return NextResponse.next();
}

// Only run middleware on dynamic routes, skip static assets
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
