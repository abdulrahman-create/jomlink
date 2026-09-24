import type { ReputationRow } from "@/lib/jomlink-types";

/**
 * Jomlink Reputation Helpers
 *
 * Reputation metrics are computed from completed connections + reviews and
 * stored in `reputation_metrics`. This module provides pure helpers to
 * recompute derived values so they stay consistent.
 */

export interface ReputationInput {
  completedCount: number;
  successfulCount: number;
  cancellationCount: number;
  disputeCount: number;
  averageRating: number;
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Recompute the derived reputation metrics from raw counters.
 */
export function recomputeReputation(input: ReputationInput): {
  successRate: number;
  responseRate: number;
} {
  const numerator = input.successfulCount;
  const denominator = input.completedCount || 1; // avoid div-by-zero
  const successRate = round2((numerator / denominator) * 100);

  // Response rate heuristic: completed introductions responded-to vs completed.
  const responseRate = round2(Math.min(100, (input.completedCount / (input.cancellationCount + input.completedCount || 1)) * 100));

  return { successRate, responseRate };
}

/**
 * Build the values object suitable for `upsertReputation` after a change.
 */
export function buildReputationValues(row: Pick<
  ReputationRow,
  | "completed_count"
  | "successful_count"
  | "success_rate"
  | "average_rating"
  | "response_rate"
  | "cancellation_count"
  | "dispute_count"
  | "on_time_count"
>): Record<string, unknown> {
  const { successRate, responseRate } = recomputeReputation({
    completedCount: row.completed_count,
    successfulCount: row.successful_count,
    cancellationCount: row.cancellation_count,
    disputeCount: row.dispute_count,
    averageRating: row.average_rating,
  });

  return {
    completed_count: row.completed_count,
    successful_count: row.successful_count,
    success_rate: successRate,
    average_rating: row.average_rating,
    response_rate: responseRate,
    cancellation_count: row.cancellation_count,
    dispute_count: row.dispute_count,
    on_time_count: row.on_time_count,
  };
}

/** Human-friendly label for a success-rate band. */
export function reputationLabel(successRate: number | null | undefined): string {
  const s = Number(successRate ?? 0);
  if (s >= 90) return "Exceptional";
  if (s >= 75) return "Very good";
  if (s >= 50) return "Good";
  return "Building";
}