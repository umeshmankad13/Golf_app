"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/Card";
import Button from "@/components/Button";
import Input from "@/components/Input";
import { Trophy, Plus, Pencil, Trash2, AlertCircle, CheckCircle, Lock } from "lucide-react";
import type { Score, Subscription } from "@/types";

/**
 * Score management page. CRUD for Stableford golf scores (1-45 range).
 * Enforces max 5 scores via the "Add Score" button visibility.
 * A database trigger automatically prunes the oldest score on insert.
 * One score per date is enforced via a unique constraint.
 *
 * State machine for the form:
 * - showForm: toggles the add/edit form visibility
 * - editingId: when set, form is in "edit" mode targeting that score's ID
 * - When editingId is null and showForm is true, form is in "add" mode
 *
 * Validation rules:
 * - Score must be integer between 1 and 45 (Stableford range)
 * - Date is required
 * - Duplicate date rejected by DB unique constraint (error code 23505)
 * - Max 5 scores enforced by hiding "Add Score" button when count >= 5
 */
export default function ScoresPage() {
  const [scores, setScores] = useState<Score[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [scoreValue, setScoreValue] = useState("");
  const [scoreDate, setScoreDate] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadScores();
  }, []);

  /**
   * Fetches the user's scores and active subscription in parallel.
   * Scores are ordered by date descending so the most recent appears first.
   * Subscription data is needed to gate score entry (no subscription = locked).
   */
  async function loadScores() {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    // Parallel fetch: scores list + subscription status
    const [scoresRes, subRes] = await Promise.all([
      supabase
        .from("scores")
        .select("*")
        .eq("user_id", user.id)
        .order("score_date", { ascending: false }),
      supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", user.id)
        .eq("status", "active")
        .single(),
    ]);

    setScores(scoresRes.data || []);
    setSubscription(subRes.data);
    setLoading(false);
  }

  // Clears all form state and hides the form panel
  function resetForm() {
    setScoreValue("");
    setScoreDate("");
    setEditingId(null);
    setShowForm(false);
    setError("");
  }

  // Populates the form with an existing score's data for editing.
  // editingId being set signals the form to use UPDATE instead of INSERT.
  function startEdit(score: Score) {
    setEditingId(score.id);
    setScoreValue(score.score.toString());
    setScoreDate(score.score_date);
    setShowForm(true);
    setError("");
  }

  /**
   * Handles both INSERT (new score) and UPDATE (edit existing score).
   * Flow:
   * 1. Validate score is within 1-45 range and date is provided
   * 2. Check for editingId to determine insert vs update
   * 3. On success: reset form, reload scores, show success toast for 3s
   * 4. On duplicate date (error code 23505): show user-friendly message
   */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validate Stableford score range (1-45)
    const score = parseInt(scoreValue);
    if (score < 1 || score > 45) {
      setError("Score must be between 1 and 45");
      return;
    }

    if (!scoreDate) {
      setError("Please select a date");
      return;
    }

    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    if (editingId) {
      // UPDATE path: modify an existing score by its primary key
      const { error } = await supabase
        .from("scores")
        .update({ score, score_date: scoreDate })
        .eq("id", editingId);

      if (error) {
        setError(error.message);
        setSaving(false);
        return;
      }
      setSuccess("Score updated successfully!");
    } else {
      // INSERT path: create a new score record
      // DB unique constraint on (user_id, score_date) prevents duplicate dates
      const { error } = await supabase.from("scores").insert({
        user_id: user.id,
        score,
        score_date: scoreDate,
      });

      if (error) {
        // PostgreSQL unique_violation error code for duplicate key
        if (error.code === "23505") {
          setError("You already have a score for this date");
        } else {
          setError(error.message);
        }
        setSaving(false);
        return;
      }
      setSuccess("Score added successfully!");
    }

    resetForm();
    loadScores(); // Refresh the scores list to reflect changes
    setSaving(false);
    // Auto-dismiss success message after 3 seconds
    setTimeout(() => setSuccess(""), 3000);
  }

  // Deletes a score after confirmation. Uses Supabase .delete() with row-level filtering.
  // After successful deletion, reloads the scores list to update the UI.
  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to delete this score?")) return;

    const { error } = await supabase.from("scores").delete().eq("id", id);
    if (!error) {
      loadScores();
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!subscription) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">My Scores</h1>
        <Card>
          <CardContent className="py-12 text-center">
            <Lock className="w-16 h-16 mx-auto mb-4 text-muted opacity-30" />
            <p className="text-lg font-semibold mb-2">Subscription Required</p>
            <p className="text-muted text-sm mb-4">
              You need an active subscription to enter scores
            </p>
            <a href="/dashboard/subscription">
              <Button>Get Subscription</Button>
            </a>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Scores</h1>
          <p className="text-muted text-sm mt-1">
            Track your Stableford scores (1-45). Maximum 5 scores retained.
          </p>
        </div>
        {scores.length < 5 && !showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Score
          </Button>
        )}
      </div>

      {/* Success notification — auto-dismisses after 3 seconds via setTimeout in handleSubmit */}
      {success && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 text-success text-sm">
          <CheckCircle className="w-4 h-4" />
          {success}
        </div>
      )}

      {/* Score entry/edit form — conditionally rendered based on showForm state */}
      {showForm && (
        <Card>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* HTML5 number input with min/max attributes for client-side validation */}
                <Input
                  label="Score (1-45)"
                  type="number"
                  min={1}
                  max={45}
                  value={scoreValue}
                  onChange={(e) => setScoreValue(e.target.value)}
                  placeholder="e.g. 32"
                  required
                />
                <Input
                  label="Date"
                  type="date"
                  value={scoreDate}
                  onChange={(e) => setScoreDate(e.target.value)}
                  required
                />
              </div>

              {/* Inline error message display */}
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                {/* Button label changes based on edit vs add mode */}
                <Button type="submit" loading={saving}>
                  {editingId ? "Update Score" : "Add Score"}
                </Button>
                <Button type="button" variant="ghost" onClick={resetForm}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">
              Score History ({scores.length} / 5)
            </h2>
          </div>
        </CardHeader>
        <CardContent>
          {scores.length > 0 ? (
            <div className="space-y-3">
              {scores.map((score, index) => (
                <div
                  key={score.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/20 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-white ${
                        index === 0 ? "bg-primary" : "bg-muted text-muted"
                      }`}
                    >
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-medium text-lg">{score.score}</p>
                      <p className="text-sm text-muted">{score.score_date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => startEdit(score)}
                      className="p-2 rounded-lg hover:bg-muted/10 text-muted hover:text-foreground transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(score.id)}
                      className="p-2 rounded-lg hover:bg-destructive/10 text-muted hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted">
              <Trophy className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">No scores entered yet</p>
              <p className="text-sm mt-1">
                Click &quot;Add Score&quot; to enter your first Stableford score
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
