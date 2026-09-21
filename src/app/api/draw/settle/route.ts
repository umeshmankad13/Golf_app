import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/draw/settle — Settles a draw by calculating number matches
 * for all entries and distributing the prize pool.
 *
 * Prize distribution:
 * - 5-number match: 40% of pool + any unclaimed jackpot rollover
 * - 4-number match: 35% of pool
 * - 3-number match: 25% of pool
 *
 * If no 5-match winner, the jackpot rolls over to the next draw.
 * Prizes are split equally among multiple winners in the same tier.
 *
 * Settlement flow:
 * 1. Fetch draw and all entries
 * 2. Calculate prize pool from active subscriber count
 * 3. Fetch any rollover jackpot from previous draw
 * 4. Split pool into three prize tiers
 * 5. Count matches for each entry against winning numbers
 * 6. Distribute prizes equally within each tier
 * 7. Handle jackpot rollover if no 5-match winner
 */
export async function POST(request: Request) {
  // Create a Supabase client instance using session cookies
  const supabase = createClient();

  // Verify the user is authenticated (only admins should call this)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { draw_id } = body;

  if (!draw_id) {
    return NextResponse.json({ error: "Missing draw_id" }, { status: 400 });
  }

  // Fetch the draw record to get winning numbers and current status
  const { data: draw } = await supabase
    .from("draws")
    .select("*")
    .eq("id", draw_id)
    .single();

  if (!draw) {
    return NextResponse.json({ error: "Draw not found" }, { status: 404 });
  }

  // Fetch all user entries for this draw to evaluate matches
  const { data: entries } = await supabase
    .from("draw_entries")
    .select("*")
    .eq("draw_id", draw_id);

  if (!entries || entries.length === 0) {
    return NextResponse.json({ error: "No entries found" }, { status: 404 });
  }

  // Count active subscribers to calculate the prize pool.
  // Each subscriber contributes a fixed monthly amount to the pool.
  const { count: subscriberCount } = await supabase
    .from("subscriptions")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");

  // === STEP 1: Calculate prize pool from active subscribers ===
  // Each subscriber contributes $5/month to the prize pool
  const monthlyContribution = 5;
  const totalPool = (subscriberCount || 1) * monthlyContribution;

  // === STEP 2: Fetch unclaimed jackpot from previous draw ===
  // If the last completed draw had no 5-match winner, its jackpot
  // rolls over and gets added to the current 5-match pool
  const { data: previousJackpot } = await supabase
    .from("draws")
    .select("prize_pool_total")
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  const rolloverAmount = previousJackpot?.prize_pool_total || 0;

  // === STEP 3: Split the prize pool into tiers ===
  // 5-match gets 40% + any rollover jackpot
  // 4-match gets 35%
  // 3-match gets 25%
  const fiveMatchPool = totalPool * 0.4 + rolloverAmount;
  const fourMatchPool = totalPool * 0.35;
  const threeMatchPool = totalPool * 0.25;

  // === STEP 4: Count matches for each entry ===
  // Compare each user's selected_numbers against the winning_numbers
  // and categorize entries into match tiers (5, 4, or 3 matches)
  const results = {
    five_match: [] as any[],
    four_match: [] as any[],
    three_match: [] as any[],
  };

  for (const entry of entries) {
    // Filter selected numbers that appear in winning numbers to count matches
    const matched = entry.selected_numbers.filter((num: number) =>
      draw.winning_numbers.includes(num)
    ).length;

    // Persist the match count on the draw entry record
    await supabase
      .from("draw_entries")
      .update({ matched_count: matched })
      .eq("id", entry.id);

    // Categorize into prize tiers (only 3+ matches win)
    if (matched === 5) results.five_match.push(entry);
    else if (matched === 4) results.four_match.push(entry);
    else if (matched === 3) results.three_match.push(entry);
  }

  // === STEP 5: Distribute prizes to winners ===
  // Prizes are split equally among all winners in each tier.
  // Using upsert with onConflict to handle edge cases gracefully.
  const winners: any[] = [];

  // 5-match winners
  if (results.five_match.length > 0) {
    // Divide the 5-match pool equally among all 5-match winners
    const prizeEach = fiveMatchPool / results.five_match.length;
    for (const entry of results.five_match) {
      // Upsert ensures no duplicate winner records per draw+user combination
      const { data: winner } = await supabase
        .from("winners")
        .upsert(
          {
            draw_id,
            user_id: entry.user_id,
            draw_entry_id: entry.id,
            matched_count: 5,
            prize_amount: prizeEach,
          },
          { onConflict: "draw_id,user_id" }
        )
        .select()
        .single();
      if (winner) winners.push(winner);
    }
  }

  // 4-match winners
  if (results.four_match.length > 0) {
    const prizeEach = fourMatchPool / results.four_match.length;
    for (const entry of results.four_match) {
      const { data: winner } = await supabase
        .from("winners")
        .upsert(
          {
            draw_id,
            user_id: entry.user_id,
            draw_entry_id: entry.id,
            matched_count: 4,
            prize_amount: prizeEach,
          },
          { onConflict: "draw_id,user_id" }
        )
        .select()
        .single();
      if (winner) winners.push(winner);
    }
  }

  // 3-match winners
  if (results.three_match.length > 0) {
    const prizeEach = threeMatchPool / results.three_match.length;
    for (const entry of results.three_match) {
      const { data: winner } = await supabase
        .from("winners")
        .upsert(
          {
            draw_id,
            user_id: entry.user_id,
            draw_entry_id: entry.id,
            matched_count: 3,
            prize_amount: prizeEach,
          },
          { onConflict: "draw_id,user_id" }
        )
        .select()
        .single();
      if (winner) winners.push(winner);
    }
  }

  // === STEP 6: Handle jackpot rollover ===
  // If no one matched all 5 numbers, the 5-match pool (40% + previous rollover)
  // carries forward to the next draw as an accumulated jackpot
  const totalDistributed =
    results.five_match.length > 0
      ? fiveMatchPool
      : 0 +
        results.four_match.length > 0
      ? fourMatchPool
      : 0 +
        results.three_match.length > 0
      ? threeMatchPool
      : 0;

  // If no 5-match winner, the entire 5-match pool rolls over to the next draw
  const jackpotRollover =
    results.five_match.length === 0 ? fiveMatchPool : 0;

  // Update the draw status to "completed" and store the rollover amount
  // so the next draw can inherit it
  await supabase
    .from("draws")
    .update({
      status: "completed",
      prize_pool_total: jackpotRollover,
    })
    .eq("id", draw_id);

  // Return a summary of the settlement for logging/display purposes
  return NextResponse.json({
    totalPool,
    fiveMatchPool,
    fourMatchPool,
    threeMatchPool,
    winners: winners.length,
    jackpotRollover,
    results: {
      fiveMatch: results.five_match.length,
      fourMatch: results.four_match.length,
      threeMatch: results.three_match.length,
    },
  });
}
