"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/Card";
import Button from "@/components/Button";
import Input from "@/components/Input";
import { Settings, AlertCircle, CheckCircle } from "lucide-react";

/**
 * User settings page. Allows editing the profile full name.
 * Email is display-only (cannot be changed from here).
 *
 * Data flow:
 * 1. On mount: fetch user email from auth + full_name from profiles table
 * 2. Email is shown disabled — it lives in Supabase Auth, not the profiles table
 * 3. On save: UPDATE profiles table with new full_name + updated_at timestamp
 * 4. Success/error feedback auto-dismisses after 3 seconds
 */
export default function SettingsPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const supabase = createClient();

  useEffect(() => {
    // Load user data: email from auth, full_name from profiles table
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;
      // Email comes from Supabase Auth (not editable here)
      setEmail(user.email || "");

      // Full name comes from the profiles table (user-editable)
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (profile) {
        setFullName(profile.full_name || "");
      }
      setLoading(false);
    });
  }, [supabase]);

  /**
   * Saves profile changes to the profiles table.
   * Only updates full_name and updated_at — email is not modified.
   * Uses .eq("id", user.id) to ensure row-level security is satisfied.
   */
  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error: updateError } = await supabase
      .from("profiles")
      .update({ full_name: fullName, updated_at: new Date().toISOString() })
      .eq("id", user.id);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess("Profile updated!");
    }

    setSaving(false);
    // Auto-dismiss success message after 3 seconds
    setTimeout(() => setSuccess(""), 3000);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted text-sm mt-1">Manage your account</p>
      </div>

      {success && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 text-success text-sm">
          <CheckCircle className="w-4 h-4" />
          {success}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">Profile</h2>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-4">
            {/* Full name: editable text input synced to profiles table */}
            <Input
              label="Full Name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
            />
            {/* Email: disabled, read-only display from Supabase Auth */}
            <Input
              label="Email"
              value={email}
              disabled
              className="opacity-60"
            />
            <p className="text-xs text-muted">
              Email cannot be changed from here
            </p>
            <Button type="submit" loading={saving}>
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
