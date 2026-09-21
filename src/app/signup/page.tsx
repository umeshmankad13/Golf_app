"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import Button from "@/components/Button";
import Input from "@/components/Input";
import { Card, CardContent } from "@/components/Card";
import { Trophy, Mail, Lock, User, AlertCircle, CheckCircle } from "lucide-react";

/** Registration page. Creates a Supabase auth user and upserts a profile row. */
export default function SignupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    // Step 1: Create the auth user via Supabase
    // full_name is passed as user metadata (not in profiles table yet)
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Step 2: Upsert the profiles row with subscriber role
    // A database trigger may also create this row, so we use upsert to avoid conflicts
    if (data.user) {
      await supabase
        .from("profiles")
        .upsert(
          {
            id: data.user.id,
            email: data.user.email!,
            full_name: fullName,
            role: "subscriber",
          },
          { onConflict: "id" }
        );
    }

    // Step 3: Handle post-signup flow
    // If Supabase auto-confirms the user, data.session exists → go straight to dashboard
    // Otherwise, show success message (user must confirm email first)
    if (data.session) {
      window.location.href = "/dashboard";
    } else if (data.user) {
      setLoading(false);
      setSuccess("Account created! You can now sign in.");
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8">
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">Create Your Account</h1>
              <p className="text-muted text-sm mt-1">
                Start playing, winning, and giving today
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm mb-6">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {success && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 text-success text-sm mb-6">
                <CheckCircle className="w-4 h-4 flex-shrink-0" />
                {success}
              </div>
            )}

            <form onSubmit={handleSignup} className="space-y-4">
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <Input
                  type="text"
                  placeholder="Full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="pl-10"
                />
              </div>
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
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                <Input
                  type="password"
                  placeholder="Password (min 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pl-10"
                />
              </div>
              <Button type="submit" loading={loading} className="w-full">
                Create Account
              </Button>
            </form>

            <div className="flex items-start gap-2 mt-4 p-3 rounded-lg bg-primary/5 text-sm text-muted">
              <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <span>
                By signing up, you agree to our terms. Choose your charity and
                subscription plan after signup.
              </span>
            </div>

            <p className="text-center text-sm text-muted mt-6">
              Already have an account?{" "}
              <Link href="/login" className="text-primary hover:underline font-medium">
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}