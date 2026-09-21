"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/Card";
import Button from "@/components/Button";
import {
  Award,
  CheckCircle,
  XCircle,
  Banknote,
  Clock,
} from "lucide-react";
import type { Winner } from "@/types";

/**
 * Admin winner management page. View all winners with filter by
 * verification status (all/pending/approved/rejected). Actions:
 * approve, reject (with notes), or mark as paid.
 *
 * Winner verification workflow:
 * 1. After a draw is settled, winners are created with verification_status = "pending".
 * 2. Admin reviews each winner's submission (checks draw entry, proof if provided).
 * 3. Admin approves or rejects the winner:
 *    - Approved: verification_status = "approved", verified_at is set.
 *    - Rejected: verification_status = "rejected", admin_notes captures the reason.
 * 4. After approval, admin can mark the winner as paid:
 *    - payment_status = "paid", paid_at is set.
 *
 * Two independent status tracks:
 * - verification_status: Controls whether the winner is eligible for payment.
 *   Only approved winners can be marked as paid.
 * - payment_status: Tracks whether the prize has been disbursed.
 *   These are separate because verification and payment may happen at
 *   different times (e.g., verification now, bank transfer later).
 *
 * Data loading: Supabase foreign key joins (profile:profiles(*), draw:draws(*))
 * are used to fetch the winner's profile and draw data in a single query
 * instead of making separate queries for each.
 */
export default function AdminWinnersPage() {
  const [winners, setWinners] = useState<Winner[]>([]);
  const [loading, setLoading] = useState(true);
  // Filter state: "all" | "pending" | "approved" | "rejected"
  const [filter, setFilter] = useState("all");
  const supabase = createClient();

  useEffect(() => {
    loadWinners();
  }, []);

  /**
   * Load all winners with joined profile and draw data.
   * Uses Supabase's foreign key join syntax: "profile:profiles(*)" means
   * "join the profiles table on the foreign key and return all columns".
   * This avoids N+1 queries by fetching related data in one request.
   */
  async function loadWinners() {
    const { data } = await supabase
      .from("winners")
      .select("*, profile:profiles(*), draw:draws(*)")
      .order("created_at", { ascending: false });

    setWinners(data || []);
    setLoading(false);
  }

  /**
   * Approve a winner: set verification_status to "approved" and record
   * the timestamp. This makes the winner eligible for payment marking.
   */
  async function approveWinner(id: string) {
    await supabase
      .from("winners")
      .update({
        verification_status: "approved",
        verified_at: new Date().toISOString(),
      })
      .eq("id", id);
    loadWinners();
  }

  /**
   * Reject a winner: prompts for a rejection reason (via browser prompt),
   * then sets verification_status to "rejected" with the reason stored
   * in admin_notes. If the user cancels the prompt (null), the operation
   * is aborted.
   */
  async function rejectWinner(id: string) {
    const notes = prompt("Reason for rejection:");
    if (notes === null) return; // User cancelled the prompt

    await supabase
      .from("winners")
      .update({
        verification_status: "rejected",
        admin_notes: notes,
      })
      .eq("id", id);
    loadWinners();
  }

  /**
   * Mark a winner as paid: set payment_status to "paid" and record
   * the timestamp. This should only be available for winners with
   * verification_status = "approved" (enforced in the UI rendering).
   */
  async function markPaid(id: string) {
    await supabase
      .from("winners")
      .update({
        payment_status: "paid",
        paid_at: new Date().toISOString(),
      })
      .eq("id", id);
    loadWinners();
  }

  /**
   * Client-side filter: filter winners by verification status.
   * "all" shows all winners, otherwise filters to the selected status.
   * The filter counts shown in the tab buttons are computed from the
   * full winners array, not the filtered array, so they always show
   * the correct total per status.
   */
  const filtered =
    filter === "all"
      ? winners
      : winners.filter((w) => w.verification_status === filter);

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
        <h1 className="text-2xl font-bold">Winner Management</h1>
        <p className="text-muted text-sm mt-1">
          Verify submissions and process payouts
        </p>
      </div>

      {/* 
        Filter tabs: each tab shows a status label and a count of winners
        in that status. The count is computed from the full winners array
        so it remains accurate regardless of which filter is active.
      */}
      <div className="flex gap-2">
        {["all", "pending", "approved", "rejected"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${
              filter === f
                ? "bg-primary text-white"
                : "bg-muted/10 text-muted hover:text-foreground"
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f !== "all" && (
              <span className="ml-1.5 text-xs">
                ({winners.filter((w) => w.verification_status === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      <Card>
        <CardContent>
          {filtered.length > 0 ? (
            <div className="space-y-3">
              {filtered.map((winner) => (
                <div
                  key={winner.id}
                  className="p-4 rounded-lg border border-border"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      {/* Winner info: name, email, draw details, and proof if provided */}
                      <p className="font-medium">
                        {(winner.profile as any)?.full_name || "Unknown"}
                      </p>
                      <p className="text-sm text-muted">
                        {(winner.profile as any)?.email}
                      </p>
                      <p className="text-sm text-muted">
                        Draw: {(winner.draw as any)?.draw_date} | Matched:{" "}
                        {winner.matched_count} | Prize: ₹
                        {winner.prize_amount.toFixed(2)}
                      </p>
                      {/* Proof URL: optional evidence uploaded by the winner */}
                      {winner.proof_url && (
                        <p className="text-xs text-muted mt-1">
                          Proof: {winner.proof_url}
                        </p>
                      )}
                      {/* Admin notes: shown in red for rejected winners */}
                      {winner.admin_notes && (
                        <p className="text-xs text-destructive mt-1">
                          Notes: {winner.admin_notes}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Verification status badge: color-coded */}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          winner.verification_status === "approved"
                            ? "bg-success/10 text-success"
                            : winner.verification_status === "rejected"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-accent/10 text-accent"
                        }`}
                      >
                        {winner.verification_status}
                      </span>
                      {/* Payment status badge: green for paid, grey for pending */}
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          winner.payment_status === "paid"
                            ? "bg-success/10 text-success"
                            : "bg-muted/10 text-muted"
                        }`}
                      >
                        {winner.payment_status}
                      </span>
                      <div className="flex gap-1">
                        {/* 
                          Action buttons: context-sensitive based on winner status.
                          - Pending: show Approve/Reject buttons.
                          - Approved + Pending payment: show Mark Paid button.
                          - All other states: no action buttons.
                        */}
                        {winner.verification_status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => approveWinner(winner.id)}
                            >
                              <CheckCircle className="w-3.5 h-3.5 mr-1" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => rejectWinner(winner.id)}
                            >
                              <XCircle className="w-3.5 h-3.5 mr-1" />
                              Reject
                            </Button>
                          </>
                        )}
                        {winner.verification_status === "approved" &&
                          winner.payment_status === "pending" && (
                            <Button
                              size="sm"
                              onClick={() => markPaid(winner.id)}
                            >
                              <Banknote className="w-3.5 h-3.5 mr-1" />
                              Mark Paid
                            </Button>
                          )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted">
              <Award className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">No winners to review</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
