"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/Card";
import Button from "@/components/Button";
import Input from "@/components/Input";
import {
  Trophy,
  Plus,
  Play,
  Eye,
  AlertCircle,
  CheckCircle,
} from "lucide-react";
import type { Draw, DrawEntry } from "@/types";

/**
 * Admin draw management page. Create new draws (random or algorithmic),
 * simulate winning numbers, publish draws (calculates matches), and
 * settle draws (distributes prize pool with jackpot rollover).
 *
 * Draw lifecycle (status flow):
 *   pending → published → completed
 *
 * 1. pending: Draw is created with winning numbers but not yet revealed
 *    to users. Admin can simulate (regenerate numbers) or publish.
 * 2. published: Winning numbers are revealed, match counts calculated
 *    for all entries, and winner records created for 3+ matches.
 * 3. completed: Prize pool is distributed to winners via the settle API.
 *
 * Number generation strategies:
 * - Random: Pure random selection from 1-45, 5 unique numbers, sorted.
 * - Algorithmic: Weighted random based on historical entry frequency.
 *   Numbers chosen more often by players get higher weight, creating
 *   a "hot numbers" effect that influences the draw outcome.
 *
 * Data flow:
 * 1. loadDraws() fetches all draws ordered by date (newest first).
 * 2. createDraw() generates numbers and inserts a new draw record.
 * 3. publishDraw() iterates all entries, calculates matches, creates
 *    winner records, and updates draw status to "published".
 * 4. Settle is delegated to a server API route (/api/draw/settle) for
 *    secure prize distribution logic (jackpot rollover, pool splits).
 */
export default function AdminDrawsPage() {
  const [draws, setDraws] = useState<Draw[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [drawDate, setDrawDate] = useState("");
  const [drawType, setDrawType] = useState<"random" | "algorithmic">("random");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [creating, setCreating] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    loadDraws();
  }, []);

  /** Fetch all draws from the database, ordered by draw_date descending. */
  async function loadDraws() {
    const { data } = await supabase
      .from("draws")
      .select("*")
      .order("draw_date", { ascending: false });

    setDraws(data || []);
    setLoading(false);
  }

  /**
   * Create a new draw with the selected date and number generation type.
   * Numbers are generated before the insert so they're stored with the draw.
   * The draw starts in "pending" status — admin must explicitly publish it.
   */
  async function createDraw(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setError("");

    // Generate winning numbers based on the selected strategy
    const numbers = await generateWinningNumbers(drawType);

    const { error: insertError } = await supabase.from("draws").insert({
      draw_date: drawDate,
      winning_numbers: numbers,
      draw_type: drawType,
      status: "pending", // Draw starts as pending until explicitly published
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setSuccess("Draw created successfully!");
      setShowForm(false);
      setDrawDate("");
      loadDraws(); // Refresh the draws list to show the new draw
    }

    setCreating(false);
    // Clear success message after 3 seconds for a clean UX
    setTimeout(() => setSuccess(""), 3000);
  }

  /**
   * Generate 5 unique winning numbers from 1-45.
   * Uses a Set to ensure uniqueness — numbers are added until the Set
   * reaches size 5. Then converted to array and sorted ascending.
   *
   * @param type - "random" for pure random, "algorithmic" for weighted
   * @returns Sorted array of 5 unique numbers between 1-45
   */
  async function generateWinningNumbers(type: string = "random"): Promise<number[]> {
    if (type === "algorithmic") {
      return generateAlgorithmicNumbers();
    }
    // Random generation: use Set to guarantee uniqueness
    const numbers = new Set<number>();
    while (numbers.size < 5) {
      numbers.add(Math.floor(Math.random() * 45) + 1);
    }
    return Array.from(numbers).sort((a, b) => a - b);
  }

  /**
   * Algorithmic number generation: weighted random based on historical
   * entry frequency. Numbers that appear more frequently in user entries
   * get higher weight in the selection pool.
   *
   * Algorithm:
   * 1. Fetch all draw_entries to analyze which numbers players chose.
   * 2. Build a frequency map (freq) counting how often each number was
   *    chosen across all entries. Each number starts at 1 (base weight).
   * 3. Create a weighted array where each number appears proportionally
   *    to its frequency (weight = ceil(freq/2)).
   * 4. Pick 5 unique numbers randomly from the weighted array.
   *
   * This creates a "hot numbers" effect — numbers frequently chosen by
   * players have a slightly higher chance of being drawn, which can
   * create more winners (and thus more excitement) when those numbers
   * are indeed drawn.
   */
  async function generateAlgorithmicNumbers(): Promise<number[]> {
    // Fetch all historical draw entries to analyze number frequency
    const { data: entries } = await supabase
      .from("draw_entries")
      .select("selected_numbers");

    // Initialize frequency map with base weight of 1 for all numbers 1-45
    const freq: Record<number, number> = {};
    for (let i = 1; i <= 45; i++) freq[i] = 1;

    // Count how many times each number appears in all entries
    if (entries) {
      for (const entry of entries) {
        for (const num of entry.selected_numbers) {
          freq[num] = (freq[num] || 1) + 1;
        }
      }
    }

    // Build weighted array: each number appears ceil(freq/2) times
    // Dividing by 2 dampens the weight effect so the algorithm doesn't
    // completely dominate the randomness
    const weighted: number[] = [];
    for (let i = 1; i <= 45; i++) {
      const weight = Math.ceil(freq[i] / 2);
      for (let j = 0; j < weight; j++) {
        weighted.push(i);
      }
    }

    // Pick 5 unique numbers from the weighted pool
    const picked = new Set<number>();
    while (picked.size < 5) {
      const idx = Math.floor(Math.random() * weighted.length);
      picked.add(weighted[idx]);
    }
    return Array.from(picked).sort((a, b) => a - b);
  }

  /**
   * Publish a draw: reveal winning numbers and calculate matches.
   *
   * This is the core business logic step:
   * 1. Fetch the draw's winning numbers.
   * 2. Fetch all entries for this draw.
   * 3. For each entry, count how many of the selected numbers match
   *    the winning numbers.
   * 4. Update each entry's matched_count.
   * 5. For entries with 3+ matches, create a winner record in the
   *    winners table. The prize_amount is set to 0 here — it will be
   *    calculated during the settle phase based on the prize pool.
   * 6. Update the draw status to "published" with a timestamp.
   */
  async function publishDraw(drawId: string) {
    // Fetch the winning numbers for this draw
    const { data: draw } = await supabase
      .from("draws")
      .select("winning_numbers")
      .eq("id", drawId)
      .single();

    if (!draw) return;

    // Fetch all entries for this draw
    const { data: entries } = await supabase
      .from("draw_entries")
      .select("*")
      .eq("draw_id", drawId);

    if (!entries) return;

    // Process each entry: calculate matches and create winner records
    for (const entry of entries) {
      // Count how many of the player's numbers appear in the winning numbers
      const matched = entry.selected_numbers.filter((num: number) =>
        draw.winning_numbers.includes(num)
      ).length;

      // Update the entry's matched count
      await supabase
        .from("draw_entries")
        .update({ matched_count: matched })
        .eq("id", entry.id);

      // Create a winner record for 3+ matches (minimum threshold)
      // Prize percentages: 5 matches = 40%, 4 matches = 35%, 3 matches = 25%
      // The actual prize_amount is calculated later during settle
      if (matched >= 3) {
        const prizePercentage =
          matched === 5 ? 0.4 : matched === 4 ? 0.35 : 0.25;

        await supabase.from("winners").insert({
          draw_id: drawId,
          user_id: entry.user_id,
          draw_entry_id: entry.id,
          matched_count: matched,
          prize_amount: 0, // Will be calculated based on pool during settle
        });
      }
    }

    // Mark the draw as published with a timestamp
    await supabase
      .from("draws")
      .update({ status: "published", published_at: new Date().toISOString() })
      .eq("id", drawId);

    loadDraws();
    setSuccess("Draw published!");
    setTimeout(() => setSuccess(""), 3000);
  }

  /**
   * Simulate a draw by regenerating winning numbers.
   * Used for testing — allows admins to see how different numbers
   * would affect winners before the actual publish. The draw remains
   * in "pending" status after simulation.
   */
  async function simulateDraw(drawId: string, drawType: string = "random") {
    const numbers = await generateWinningNumbers(drawType);
    await supabase
      .from("draws")
      .update({ winning_numbers: numbers })
      .eq("id", drawId);
    loadDraws();
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Draw Management</h1>
          <p className="text-muted text-sm mt-1">
            Create and manage monthly prize draws
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Draw
        </Button>
      </div>

      {/* Success notification banner: auto-dismisses after 3 seconds */}
      {success && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 text-success text-sm">
          <CheckCircle className="w-4 h-4" />
          {success}
        </div>
      )}

      {/* Draw creation form: toggled by the "Create Draw" button */}
      {showForm && (
        <Card>
          <CardContent>
            <form onSubmit={createDraw} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Draw Date"
                  type="date"
                  value={drawDate}
                  onChange={(e) => setDrawDate(e.target.value)}
                  required
                />
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium">Draw Type</label>
                  <select
                    value={drawType}
                    onChange={(e) =>
                      setDrawType(e.target.value as "random" | "algorithmic")
                    }
                    className="w-full px-3 py-2 rounded-lg border border-border bg-white text-sm"
                  >
                    <option value="random">Random</option>
                    <option value="algorithmic">Algorithmic</option>
                  </select>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                  <AlertCircle className="w-4 h-4" />
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <Button type="submit" loading={creating}>
                  Create Draw
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Draws list: shows all draws with status, numbers, and available actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            <h2 className="font-semibold">All Draws</h2>
          </div>
        </CardHeader>
        <CardContent>
          {draws.length > 0 ? (
            <div className="space-y-3">
              {draws.map((draw) => (
                <div
                  key={draw.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border"
                >
                  <div>
                    <p className="font-medium">{draw.draw_date}</p>
                    <p className="text-sm text-muted">
                      Type: {draw.draw_type} | Numbers:{" "}
                      {draw.winning_numbers.join(", ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Status badge: color-coded by draw status */}
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        draw.status === "published"
                          ? "bg-success/10 text-success"
                          : draw.status === "completed"
                          ? "bg-secondary/10 text-secondary"
                          : "bg-accent/10 text-accent"
                      }`}
                    >
                      {draw.status}
                    </span>
                    {/* Pending draws: show Simulate (regenerate numbers) and Publish buttons */}
                    {draw.status === "pending" && (
                      <>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => simulateDraw(draw.id, draw.draw_type)}
                        >
                          <Play className="w-3.5 h-3.5 mr-1" />
                          Simulate
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => publishDraw(draw.id)}
                        >
                          Publish
                        </Button>
                      </>
                    )}
                    {/* Published draws: show Settle button that calls the API route */}
                    {draw.status === "published" && (
                      <Button
                        size="sm"
                        onClick={async () => {
                          // Settle is handled by a server API route for security.
                          // Prize distribution involves financial calculations
                          // (jackpot rollover, pool splits) that should not
                          // run client-side to prevent tampering.
                          const res = await fetch("/api/draw/settle", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ draw_id: draw.id }),
                          });
                          if (res.ok) {
                            setSuccess("Draw settled! Winners calculated.");
                            loadDraws();
                          }
                        }}
                      >
                        Settle Draw
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted">
              <Trophy className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg">No draws created yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
