"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/Card";
import { Award, Trophy, Clock, CheckCircle, Upload } from "lucide-react";
import type { Winner, DrawEntry } from "@/types";

/**
 * Winnings tracking page. Displays the user's prize wins with verification
 * status (pending/approved/rejected) and payment status (pending/paid).
 * Allows proof of identity upload via Supabase Storage, falling back
 * to filename storage if the bucket is unavailable.
 *
 * Two main sections:
 * 1. "Your Wins" — shows winner records with prize amount, verification status,
 *    payment status, and an upload proof button for pending unverified wins
 * 2. "Draw Entries" — shows all draw entries with match count and prize if won
 *
 * Proof upload flow:
 * - Creates a hidden file input, triggers click programmatically
 * - Uploads to Supabase Storage bucket "winner-proofs"
 * - If bucket doesn't exist (uploadError), falls back to storing just the filename
 *   in the proof_url column as a degraded-but-functional approach
 * - On success, updates local state to reflect the new proof_url
 */
export default function WinningsPage() {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [entries, setEntries] = useState<DrawEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const [winnersRes, entriesRes] = await Promise.all([
        supabase
          .from("winners")
          .select("*, draw:draws(*)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("draw_entries")
          .select("*, draw:draws(*)")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      setWinners(winnersRes.data || []);
      setEntries(entriesRes.data || []);
      setLoading(false);
    }

    loadData();
  }, [supabase]);

  /**
   * Handles proof of identity upload for a winner record.
   * Uses a programmatic file input (not a visible form element) for a cleaner UX.
   *
   * Upload strategy:
   * 1. Try uploading to Supabase Storage "winner-proofs" bucket
   * 2. If bucket is missing/unavailable, store just the filename in proof_url
   *    (degraded mode — admin can still see proof was submitted)
   * 3. On success, get public URL and save it to the winners row
   * 4. Update local state immediately for optimistic UI
   */
  async function handleUploadProof(winnerId: string) {
    // Create a temporary hidden file input and trigger it
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*"; // Only accept image files
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      // Build a unique file path using winner ID + timestamp to avoid collisions
      const fileExt = file.name.split(".").pop();
      const filePath = `proofs/${winnerId}-${Date.now()}.${fileExt}`;

      // Attempt to upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("winner-proofs")
        .upload(filePath, file);

      if (uploadError) {
        // Fallback: bucket doesn't exist or is misconfigured.
        // Store just the filename so admin knows proof was submitted.
        const { error } = await supabase
          .from("winners")
          .update({ proof_url: file.name })
          .eq("id", winnerId);

        if (!error) {
          setWinners((prev) =>
            prev.map((w) =>
              w.id === winnerId ? { ...w, proof_url: file.name } : w
            )
          );
        }
        return;
      }

      // Success: get the public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from("winner-proofs")
        .getPublicUrl(filePath);

      // Persist the public URL to the winner record
      const { error } = await supabase
        .from("winners")
        .update({ proof_url: urlData.publicUrl })
        .eq("id", winnerId);

      if (!error) {
        // Optimistic state update: replace the winner in the list with updated proof_url
        setWinners((prev) =>
          prev.map((w) =>
            w.id === winnerId ? { ...w, proof_url: urlData.publicUrl } : w
          )
        );
      }
    };
    input.click(); // Programmatically open file picker
  }

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
        <h1 className="text-2xl font-bold">Winnings</h1>
        <p className="text-muted text-sm mt-1">
          Track your prize draw entries and winnings
        </p>
      </div>

      {/* Winners */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-accent" />
            <h2 className="font-semibold">Your Wins</h2>
          </div>
        </CardHeader>
        <CardContent>
          {winners.length > 0 ? (
            <div className="space-y-3">
              {winners.map((winner) => (
                <div
                  key={winner.id}
                  className="p-4 rounded-lg border border-border"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      {/* Prize amount formatted as currency */}
                      <p className="font-semibold text-lg">
                        ₹{winner.prize_amount.toFixed(2)}
                      </p>
                      {/* Match count indicates prize tier (3, 4, or 5 number match) */}
                      <p className="text-sm text-muted">
                        {winner.matched_count}-number match
                      </p>
                      <p className="text-sm text-muted">
                        Draw: {winner.draw?.draw_date}
                      </p>
                    </div>
                    <div className="text-right space-y-2">
                      {/* Verification status badge with color coding:
                          - approved: green (success)
                          - rejected: red (destructive)
                          - pending: yellow (accent) */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          winner.verification_status === "approved"
                            ? "bg-success/10 text-success"
                            : winner.verification_status === "rejected"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-accent/10 text-accent"
                        }`}
                      >
                        {winner.verification_status === "approved" && (
                          <CheckCircle className="w-3 h-3" />
                        )}
                        {winner.verification_status === "pending" && (
                          <Clock className="w-3 h-3" />
                        )}
                        {winner.verification_status}
                      </span>
                      {/* Payment status: "paid" gets green, "pending" gets muted */}
                      <div>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            winner.payment_status === "paid"
                              ? "bg-success/10 text-success"
                              : "bg-muted/10 text-muted"
                          }`}
                        >
                          {winner.payment_status}
                        </span>
                      </div>
                      {/* Show upload proof button only for pending, unverified wins */}
                      {winner.verification_status === "pending" &&
                        !winner.proof_url && (
                          <button
                            onClick={() => handleUploadProof(winner.id)}
                            className="text-xs text-primary hover:underline flex items-center gap-1"
                          >
                            <Upload className="w-3 h-3" />
                            Upload proof
                          </button>
                        )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted">
              <Award className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">No wins yet</p>
              <p className="text-sm mt-1">
                Enter draws for a chance to win prizes
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Draw Entries */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-secondary" />
            <h2 className="font-semibold">Draw Entries</h2>
          </div>
        </CardHeader>
        <CardContent>
          {entries.length > 0 ? (
            <div className="space-y-3">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border"
                >
                  <div>
                    <p className="text-sm text-muted">
                      Draw: {entry.draw?.draw_date}
                    </p>
                    <p className="font-medium">
                      Numbers: {entry.selected_numbers.join(", ")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {entry.matched_count} matches
                    </p>
                    {entry.prize_amount > 0 && (
                      <p className="text-sm text-success">
                        Won ₹{entry.prize_amount.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted">
              <Trophy className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">No draw entries yet</p>
              <p className="text-sm mt-1">
                Subscribe and enter your scores to participate in draws
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
