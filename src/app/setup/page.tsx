"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Navbar from "@/components/Navbar";
import Button from "@/components/Button";
import Input from "@/components/Input";
import { Card, CardContent } from "@/components/Card";
import {
  Shield,
  Mail,
  Lock,
  User,
  AlertCircle,
  CheckCircle,
  Copy,
} from "lucide-react";

/**
 * One-time admin setup page. Creates the first admin account by signing up
 * a new user and promoting them to admin role via direct DB update or
 * the /api/seed-admin fallback. Displays credentials on success.
 */
export default function SetupPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  // Two-step UI: "form" shows the setup form, "done" shows credentials
  const [step, setStep] = useState<"form" | "done">("form");
  const router = useRouter();
  const supabase = createClient();

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    // Step 1: Fix the CHECK constraint on profiles.role via RPC
    // The default schema only allows 'subscriber' — we need to add 'admin'
    // to the constraint before we can assign it. Uses exec_sql for raw DDL.
    await supabase.rpc("exec_sql", {
      query: `
        ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
        ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('subscriber', 'admin'));
      `,
    });

    // Step 2: Sign up the user via Supabase Auth
    // This creates the auth user and triggers the profiles row creation
    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // Step 3: Wait for the database trigger to create the profiles row
      // The trigger runs asynchronously, so we need a brief delay before updating
      await new Promise((r) => setTimeout(r, 1000));

      // Step 4: Promote the user to admin by updating their profile role
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ role: "admin", updated_at: new Date().toISOString() })
        .eq("id", data.user.id);

      if (updateError) {
        // Fallback: if direct DB update fails (e.g., RLS blocks it),
        // try the server-side API route which has elevated permissions
        const res = await fetch("/api/seed-admin", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${data.session?.access_token}`,
          },
          body: JSON.stringify({ email }),
        });

        if (!res.ok) {
          setError(
            "Account created but could not set admin role. Please run the SQL fix in Supabase dashboard."
          );
          setLoading(false);
          return;
        }
      }
    }

    setSuccess("Admin account created successfully!");
    setStep("done");
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8">
            <div className="text-center mb-8">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">Admin Setup</h1>
              <p className="text-muted text-sm mt-1">
                Create the administrator account for the platform
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm mb-6">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            {success && step === "done" && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 text-success text-sm">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  {success}
                </div>

                {/* Credentials display — shown after successful admin creation */}
                {/* User should copy these before navigating away */}
                <div className="p-4 rounded-lg bg-muted/50 space-y-2">
                  <p className="text-sm font-medium">Your admin credentials:</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Email:</span>
                    <code className="bg-background px-2 py-0.5 rounded text-xs">
                      {email}
                    </code>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted">Password:</span>
                    <code className="bg-background px-2 py-0.5 rounded text-xs">
                      {password}
                    </code>
                  </div>
                </div>

                {/* Action buttons — copy credentials to clipboard or navigate to login */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `Email: ${email}\nPassword: ${password}`
                      );
                    }}
                    variant="outline"
                    className="flex-1"
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                  <Button
                    onClick={() => router.push("/login")}
                    className="flex-1"
                  >
                    Go to Login
                  </Button>
                </div>
              </div>
            )}

            {step === "form" && (
              <>
                <form onSubmit={handleCreateAdmin} className="space-y-4">
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                    <Input
                      type="text"
                      placeholder="Admin full name"
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
                      placeholder="Admin email"
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
                    Create Admin Account
                  </Button>
                </form>

                <p className="text-center text-sm text-muted mt-6">
                  Already set up?{" "}
                  <Link
                    href="/login"
                    className="text-primary hover:underline font-medium"
                  >
                    Sign in
                  </Link>
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
