/**
 * Convenience Type Aliases
 *
 * Instead of writing Database["public"]["Tables"]["profiles"]["Row"] everywhere,
 * we create short aliases like Profile, Subscription, Score, etc.
 *
 * Some types also extend their base Row type with additional nested relations
 * that are fetched via Supabase's embedded selects (e.g., .select("*, charity:charities(*)"))
 */
import { Database } from "./database";

/** User profile row from the profiles table. Contains id, email, name, role (subscriber/admin). */
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

/** Active subscription row. Tracks plan type (monthly/yearly), status, and billing period. */
export type Subscription = Database["public"]["Tables"]["subscriptions"]["Row"];

/** Golf Stableford score entry. Score range is 1-45, max 5 per user (DB trigger enforces this). */
export type Score = Database["public"]["Tables"]["scores"]["Row"];

/** Charity organization. Users choose one to support with their subscription. */
export type Charity = Database["public"]["Tables"]["charities"]["Row"];

/** User-charity association. Links a user to their chosen charity with a nested charity object. */
export type UserCharity = Database["public"]["Tables"]["user_charities"]["Row"] & {
  /** The actual charity record, fetched via Supabase relation select */
  charity?: Charity | null;
};

/** Monthly prize draw. Contains winning_numbers array and status (pending/published/completed). */
export type Draw = Database["public"]["Tables"]["draws"]["Row"];

/** Draw entry - a user's 5 number picks for a specific draw. Includes nested draw info. */
export type DrawEntry = Database["public"]["Tables"]["draw_entries"]["Row"] & {
  /** The draw this entry belongs to, fetched via relation select */
  draw?: Draw | null;
};

/** Prize winner record. Tracks verification status, payment status, and proof uploads. */
export type Winner = Database["public"]["Tables"]["winners"]["Row"] & {
  /** The winner's profile info, fetched via relation select */
  profile?: Profile | null;
  /** The draw they won in, fetched via relation select */
  draw?: Draw | null;
};

/** Prize pool contribution row. Tracks how much each subscription period contributes. */
export type PrizePool = Database["public"]["Tables"]["prize_pool"]["Row"];
