"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/Card";
import Button from "@/components/Button";
import Input from "@/components/Input";
import {
  Users,
  Search,
  Edit2,
  Save,
  X,
  Trophy,
  CreditCard,
  Trash2,
  Plus,
} from "lucide-react";
import type { Profile, Subscription, Score } from "@/types";

/**
 * Extended profile type that includes the user's active subscription.
 * This is used by the admin users table to show subscription status
 * inline alongside user info. The subscription can be null if the user
 * has no active subscription.
 */
interface UserWithSub extends Profile {
  subscription: Subscription | null;
}

/**
 * Admin user management page. View all users with search, edit roles,
 * view/add/delete scores for any user, and manage subscriptions
 * (view details, cancel active subscriptions).
 *
 * Data flow:
 * 1. On mount, loadUsers() fetches all profiles from Supabase, then
 *    for each profile, queries the subscriptions table to find the
 *    active subscription. This is a N+1 query pattern (1 query for
 *    profiles, N queries for subscriptions), acceptable here because
 *    admin user lists are typically small.
 * 2. Users are stored in state with their subscription attached.
 * 3. Client-side filtering via the `search` state provides instant
 *    search without additional database queries.
 *
 * Inline editing pattern:
 * - Two separate editing states exist: `editingId` for role edits and
 *   `editingNameId` for name edits. This allows both fields to be
 *   edited independently without conflict.
 * - When editing, an input/select appears in-place of the display text.
 *   Save/Cancel buttons appear next to the input. On save, the update
 *   is written to Supabase, editing state is cleared, and the full
 *   user list is reloaded to reflect changes.
 *
 * Panel system:
 * - The scores panel and subscription panel are conditionally rendered
 *   based on `viewingScores` and `viewingSub` state (each holds a
 *   user ID or null). Only one panel can be open at a time — opening
 *   one closes the other (e.g., viewScores sets viewingSub to null).
 */
export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserWithSub[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  // Role editing state: editingId holds the user ID being edited, editRole holds the new value
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("");
  // Name editing state: separate from role editing to allow independent edits
  const [editingNameId, setEditingNameId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  // Scores panel state: viewingScores holds the user ID whose scores are displayed
  const [viewingScores, setViewingScores] = useState<string | null>(null);
  const [userScores, setUserScores] = useState<Score[]>([]);
  const [newScore, setNewScore] = useState("");
  const [newScoreDate, setNewScoreDate] = useState("");
  // Subscription panel state: viewingSub holds the user ID whose subscription is displayed
  const [viewingSub, setViewingSub] = useState<string | null>(null);
  const [userSub, setUserSub] = useState<Subscription | null>(null);
  const supabase = createClient();

  useEffect(() => {
    loadUsers();
  }, []);

  /**
   * Load all users with their active subscriptions.
   * Two-step query: first fetch all profiles, then for each profile
   * fetch the active subscription. The subscription is attached to
   * the profile object via spread operator (...profile, subscription: sub).
   */
  async function loadUsers() {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (profiles) {
      // N+1 query pattern: for each profile, run a subscription query.
      // Acceptable for admin panels with small user counts.
      // .single() ensures we get one subscription object, not an array.
      const usersWithSubs = await Promise.all(
        profiles.map(async (profile) => {
          const { data: sub } = await supabase
            .from("subscriptions")
            .select("*")
            .eq("user_id", profile.id)
            .eq("status", "active")
            .single();
          return { ...profile, subscription: sub };
        })
      );
      setUsers(usersWithSubs);
    }
    setLoading(false);
  }

  /** Update a user's role in Supabase and refresh the user list. */
  async function saveRole(userId: string) {
    await supabase
      .from("profiles")
      .update({ role: editRole })
      .eq("id", userId);
    setEditingId(null); // Clear editing state
    loadUsers(); // Reload to reflect the change in the UI
  }

  /** Update a user's full name and updated_at timestamp. */
  async function saveName(userId: string) {
    await supabase
      .from("profiles")
      .update({ full_name: editName, updated_at: new Date().toISOString() })
      .eq("id", userId);
    setEditingNameId(null);
    loadUsers();
  }

  /**
   * Open the scores panel for a specific user.
   * Fetches all scores ordered by date (newest first) and resets
   * the new score input fields. Also closes the subscription panel
   * to avoid showing two panels simultaneously.
   */
  async function viewScores(userId: string) {
    setViewingScores(userId);
    setViewingSub(null); // Close subscription panel if open
    const { data } = await supabase
      .from("scores")
      .select("*")
      .eq("user_id", userId)
      .order("score_date", { ascending: false });
    setUserScores(data || []);
    // Reset new score form fields
    setNewScore("");
    setNewScoreDate("");
  }

  /**
   * Add a new score for the selected user.
   * Validates that score is between 1 and 45 (golf score range)
   * and that both score and date are provided before inserting.
   */
  async function addScore(userId: string) {
    if (!newScore || !newScoreDate) return;
    const score = parseInt(newScore);
    // Golf scores must be between 1 and 45 (9-hole max is typically 45)
    if (score < 1 || score > 45) return;

    await supabase.from("scores").insert({
      user_id: userId,
      score,
      score_date: newScoreDate,
    });
    // Reload scores to show the newly added score
    viewScores(userId);
  }

  /** Delete a specific score and refresh the scores panel. */
  async function deleteScore(scoreId: string, userId: string) {
    await supabase.from("scores").delete().eq("id", scoreId);
    viewScores(userId);
  }

  /**
   * Open the subscription panel for a user.
   * Fetches the most recent subscription (up to 5, but only uses the first).
   * Closes the scores panel to avoid showing two panels simultaneously.
   */
  async function viewSubscription(userId: string) {
    setViewingSub(userId);
    setViewingScores(null); // Close scores panel if open
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(5);
    // Only display the most recent subscription
    setUserSub(data?.[0] || null);
  }

  /** Cancel an active subscription by updating its status to "cancelled". */
  async function cancelSubscription(subId: string) {
    await supabase
      .from("subscriptions")
      .update({ status: "cancelled" })
      .eq("id", subId);
    loadUsers(); // Refresh to update subscription status in the table
    setViewingSub(null); // Close the panel
  }

  /**
   * Client-side search filter: filters users by email or full_name.
   * Uses case-insensitive matching via toLowerCase() on both the
   * search term and user fields. This provides instant search feedback
   * without additional database queries.
   */
  const filtered = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">User Management</h1>
        <p className="text-muted text-sm mt-1">
          View and manage platform users
        </p>
      </div>

      {/* User table card with search bar in the header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <Search className="w-5 h-5 text-muted" />
            <input
              type="text"
              placeholder="Search users..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 p-0 border-0 focus:ring-0 text-sm"
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-2 font-medium text-muted">
                    User
                  </th>
                  <th className="text-left py-3 px-2 font-medium text-muted">
                    Role
                  </th>
                  <th className="text-left py-3 px-2 font-medium text-muted">
                    Subscription
                  </th>
                  <th className="text-left py-3 px-2 font-medium text-muted">
                    Joined
                  </th>
                  <th className="text-right py-3 px-2 font-medium text-muted">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-border last:border-0"
                  >
                    {/* User name cell: toggles between display and inline edit mode */}
                    <td className="py-3 px-2">
                      <div>
                        {editingNameId === user.id ? (
                          // Inline name editing: input with save/cancel buttons
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              className="text-xs border border-border rounded px-2 py-1 w-32"
                            />
                            <button
                              onClick={() => saveName(user.id)}
                              className="p-1 text-primary hover:text-primary-dark"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setEditingNameId(null)}
                              className="p-1 text-muted hover:text-foreground"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          // Display mode: show name and email
                          <p className="font-medium">
                            {user.full_name || "No name"}
                          </p>
                        )}
                        <p className="text-xs text-muted">{user.email}</p>
                      </div>
                    </td>
                    {/* Role cell: toggles between display and inline edit mode */}
                    <td className="py-3 px-2">
                      {editingId === user.id ? (
                        // Inline role editing: dropdown with save/cancel
                        <div className="flex items-center gap-1">
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value)}
                            className="text-xs border border-border rounded px-2 py-1"
                          >
                            <option value="subscriber">Subscriber</option>
                            <option value="admin">Admin</option>
                          </select>
                          <button
                            onClick={() => saveRole(user.id)}
                            className="p-1 text-primary hover:text-primary-dark"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 text-muted hover:text-foreground"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        // Display mode: colored badge showing role
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                            user.role === "admin"
                              ? "bg-primary/10 text-primary"
                              : "bg-muted/10 text-muted"
                          }`}
                        >
                          {user.role}
                        </span>
                      )}
                    </td>
                    {/* Subscription status cell: shows plan type or "None" */}
                    <td className="py-3 px-2">
                      {user.subscription ? (
                        <span className="text-success text-xs">
                          {user.subscription.plan_type}
                        </span>
                      ) : (
                        <span className="text-muted text-xs">None</span>
                      )}
                    </td>
                    {/* Join date cell: formatted to locale date string */}
                    <td className="py-3 px-2 text-muted text-xs">
                      {new Date(user.created_at).toLocaleDateString()}
                    </td>
                    {/* Action buttons: edit name, edit role, view scores, view subscription */}
                    <td className="py-3 px-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => {
                            setEditingNameId(user.id);
                            setEditName(user.full_name || "");
                          }}
                          className="p-1.5 rounded-lg hover:bg-muted/10 text-muted hover:text-foreground"
                          title="Edit name"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(user.id);
                            setEditRole(user.role);
                          }}
                          className="p-1.5 rounded-lg hover:bg-muted/10 text-muted hover:text-foreground"
                          title="Edit role"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => viewScores(user.id)}
                          className="p-1.5 rounded-lg hover:bg-muted/10 text-muted hover:text-foreground"
                          title="View scores"
                        >
                          <Trophy className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => viewSubscription(user.id)}
                          className="p-1.5 rounded-lg hover:bg-muted/10 text-muted hover:text-foreground"
                          title="View subscription"
                        >
                          <CreditCard className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* 
        Scores Panel: Conditionally rendered when viewingScores is set.
        Shows the selected user's golf scores with ability to add/delete.
        Uses a Card component with a header (user name + close button)
        and a content area with the add-score form and score list.
      */}
      {viewingScores && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">
                Scores for{" "}
                {/* Look up user name by ID for the panel header */}
                {users.find((u) => u.id === viewingScores)?.full_name ||
                  users.find((u) => u.id === viewingScores)?.email}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setViewingScores(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Add score form: score input (1-45) + date picker + add button */}
            <div className="flex gap-2">
              <Input
                type="number"
                min={1}
                max={45}
                placeholder="Score"
                value={newScore}
                onChange={(e) => setNewScore(e.target.value)}
                className="w-24"
              />
              <Input
                type="date"
                value={newScoreDate}
                onChange={(e) => setNewScoreDate(e.target.value)}
              />
              <Button size="sm" onClick={() => addScore(viewingScores)}>
                <Plus className="w-4 h-4 mr-1" />
                Add
              </Button>
            </div>
            {/* Score list: each score shows the value, date, and a delete button */}
            {userScores.length > 0 ? (
              <div className="space-y-2">
                {userScores.map((score) => (
                  <div
                    key={score.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-muted/5"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-primary">{score.score}</span>
                      <span className="text-sm text-muted">{score.score_date}</span>
                    </div>
                    <button
                      onClick={() => deleteScore(score.id, viewingScores)}
                      className="p-1 text-muted hover:text-destructive"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted text-center py-4">No scores yet</p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 
        Subscription Panel: Conditionally rendered when viewingSub is set.
        Shows the selected user's most recent subscription with plan details,
        status badge, and a cancel button for active subscriptions.
      */}
      {viewingSub && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">
                Subscription for{" "}
                {users.find((u) => u.id === viewingSub)?.full_name ||
                  users.find((u) => u.id === viewingSub)?.email}
              </h2>
              <Button variant="ghost" size="sm" onClick={() => setViewingSub(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {userSub ? (
              <div className="space-y-3">
                {/* Subscription details card: plan type, start date, and status */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-muted/5">
                  <div>
                    <p className="font-medium capitalize">{userSub.plan_type} Plan</p>
                    <p className="text-xs text-muted">
                      Started:{" "}
                      {new Date(
                        // current_period_start may be null for legacy records,
                        // so we fall back to created_at
                        userSub.current_period_start || userSub.created_at
                      ).toLocaleDateString()}
                    </p>
                  </div>
                  {/* Status badge: green for active, red for cancelled/expired */}
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      userSub.status === "active"
                        ? "bg-success/10 text-success"
                        : "bg-destructive/10 text-destructive"
                    }`}
                  >
                    {userSub.status}
                  </span>
                </div>
                {/* Cancel button: only shown for active subscriptions */}
                {userSub.status === "active" && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => cancelSubscription(userSub.id)}
                  >
                    Cancel Subscription
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted text-center py-4">
                No subscription
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
