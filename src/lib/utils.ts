/**
 * Utility Functions
 *
 * Common helpers used throughout the GolfGive app:
 * - cn(): Merges Tailwind CSS classes safely (deduplicates conflicting classes)
 * - formatCurrency(): Formats numbers as INR currency strings
 * - formatDate() / formatScoreDate(): Formats dates for display
 */
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Merges Tailwind CSS classes with clsx for conditional class composition.
 * Uses tailwind-merge to deduplicate conflicting Tailwind classes.
 *
 * Example: cn("px-4", isActive && "px-8", className)
 * - clsx handles conditional classes (false values are excluded)
 * - twMerge handles Tailwind class conflicts (e.g., "px-4 px-8" -> "px-8")
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formats a number as INR currency string.
 * Example: formatCurrency(999) -> "₹999.00"
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(amount);
}

/**
 * Formats a date string or Date object to a readable format.
 * Example: formatDate("2026-01-15") -> "Jan 15, 2026"
 */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Formats a score date for display in the scores section.
 * Same format as formatDate but used semantically for score dates.
 */
export function formatScoreDate(date: string | Date): string {
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
