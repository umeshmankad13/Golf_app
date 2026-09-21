"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import Button from "@/components/Button";
import Input from "@/components/Input";
import { Card, CardContent } from "@/components/Card";
import { Trophy, Mail, Lock, AlertCircle } from "lucide-react";

/** Login page with email/password authentication via Supabase. */
export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    // Authenticate with Supabase using email + password
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    // Full page reload to /dashboard ensures auth state is fresh across all components
    // (as opposed to router.push which may retain stale client state)
    window.location.href = "/dashboard";
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8">
            {/* Header — brand icon + welcome text */}
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">Welcome Back</h1>
              <p className="text-muted text-sm mt-1">
                Sign in to your GolfGive account
              </p>
            </div>

            {/* Error banner — shown when Supabase returns an auth error */}
            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm mb-6">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {/* Login form — email and password fields with icon prefixes */}
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Email field with mail icon */}
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <Input
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10"
                />
              </div>

              {/* Password field with lock icon */}
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <Input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pl-10"
                />
              </div>

              {/* Submit button — shows loading spinner while authenticating */}
              <Button type="submit" loading={loading} className="w-full">
                Sign In
              </Button>
            </form>

            {/* Forgot password link */}
            <div className="text-center mt-4">
              <Link href="/forgot-password" className="text-sm text-primary hover:underline">
                Forgot your password?
              </Link>
            </div>

            {/* Signup prompt — directs new users to registration */}
            <p className="text-center text-sm text-muted mt-4">
              Don&apos;t have an account?{" "}
              <Link href="/signup" className="text-primary hover:underline font-medium">
                Sign up
              </Link>
            </p>

            {/* Admin setup link — hidden link for first-time admin setup */}
            <p className="text-center text-xs text-muted/60 mt-4">
              First time?{" "}
              <Link href="/setup" className="text-primary/60 hover:underline">
                Set up admin
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
