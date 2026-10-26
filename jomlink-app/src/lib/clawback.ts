import { COMPLETION } from "./constants";

/**
 * Post-release clawback (§5.12.1, §11.7).
 *
 * The problem this closes: a Seeker discovers a week after release that the
 * "meeting" never happened. The reward is already in the Linker's wallet — or
 * already withdrawn to their bank. There is no escrow left to freeze.
 *
 * The blueprint is deliberately careful about what a clawback **is**:
 *
 *   • It is a RECOVERY WORKFLOW, not a silent ledger reversal. (§11.7)
 *   • Do not silently make a wallet negative, or deduct unrelated funds. (§11.7)
 *   • Record the original payout, reason, provider response, amount recovered
 *     and the amount still outstanding. (§11.7)
 *   • Never represent a clawback as completed until it is actually recovered.
 *     (§11.7, §9.5 rule 8)
 *   • If recovery is unavailable or fails → manual review + only the remedies
 *     the Terms and law allow. (§11.7)
 *
 * So this module models recovery as a **two-step** process:
 *   1. `recoverableFromWallet(amount, balance)` — what can be recovered from
 *      the Linker's available wallet balance right now.
 *   2. whatever is left over becomes an outstanding balance (a receivable)
 *      that is recorded and routed to manual review. It is never silently
 *      written off, and never "recovered" by force.
 *
 * Blueprint gives no figure for a cap, so we start at the full awarded net
 * payout for the connection (`capAmount`) — you cannot claw back more than was
 * actually paid out for that job.
 */

export type ClawbackRecoveryStatus =
  /** Nothing recovered yet (usually because the wallet was empty at decision time). */
  | "PENDING"
  /** Some, but not all, of the target amount has been recovered. */
  | "PARTIAL"
  /** The full clawback amount has been recovered. */
  | "RECOVERED"
  /** The decision was withdrawn before any recovery (audited). */
  | "CANCELLED";

export interface ClawbackPlanInput {
  /** The amount the platform has decided should be recovered. */
  amount: number;
  /** Linker's currently available (settled) wallet balance. */
  walletBalance: number;
  /** The net payout actually released to the Linker for this connection. */
  capAmount: number;
}

export interface ClawbackPlan {
  ok: boolean;
  error?: string;
  /** Amount that will actually be recovered from the wallet now. */
  recoverFromWallet: number;
  /** Amount that cannot be recovered and becomes an outstanding receivable. */
  outstanding: number;
  /** What the platform decided to recover, after clamping to the cap. */
  targetAmount: number;
  status: ClawbackRecoveryStatus;
  /** True when a human must follow up (partial/zero recovery). */
  requiresManualReview: boolean;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

/**
 * Work out how much of a clawback can actually be taken from the Linker's
 * wallet right now.
 *
 * Never returns a negative recovery, never recovers more than the wallet holds,
 * and never recovers more than the platform actually paid out for the job.
 */
export function planClawback(input: ClawbackPlanInput): ClawbackPlan {
  const amount = round2(Number(input.amount));
  const balance = Math.max(0, round2(Number(input.walletBalance)));
  const cap = Math.max(0, round2(Number(input.capAmount)));

  const fail = (error: string): ClawbackPlan => ({
    ok: false,
    error,
    recoverFromWallet: 0,
    outstanding: 0,
    targetAmount: 0,
    status: "PENDING",
    requiresManualReview: false,
  });

  if (!Number.isFinite(amount) || amount <= 0) {
    return fail("Enter a clawback amount greater than zero.");
  }
  if (cap <= 0) {
    return fail("Nothing was released to the Linker for this connection, so there is nothing to claw back.");
  }
  if (amount > cap) {
    return fail(
      `The clawback cannot exceed the amount released to the Linker for this connection.`
    );
  }
  if (!Number.isFinite(balance)) {
    return fail("Could not read the Linker's wallet balance.");
  }

  const recoverFromWallet = Math.min(amount, balance);
  const outstanding = round2(amount - recoverFromWallet);

  let status: ClawbackRecoveryStatus;
  if (recoverFromWallet <= 0) status = "PENDING";
  else if (outstanding > 0) status = "PARTIAL";
  else status = "RECOVERED";

  return {
    ok: true,
    recoverFromWallet: round2(recoverFromWallet),
    outstanding,
    targetAmount: amount,
    status,
    // Any shortfall means a person must decide what happens next (§11.7).
    requiresManualReview: outstanding > 0,
  };
}

/**
 * Is this connection still inside the post-release clawback window?
 *
 * The window runs from the moment the reward was released (not from creation),
 * because a clawback only makes sense once money has moved.
 */
export function isWithinClawbackWindow(
  releasedAt: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!releasedAt) return false;
  const released = new Date(releasedAt).getTime();
  if (!Number.isFinite(released)) return false;
  const windowMs = COMPLETION.DISPUTE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  return now.getTime() <= released + windowMs;
}

/** Last moment a clawback may be opened for a payout released at `releasedAt`. */
export function clawbackDeadline(releasedAt: string): Date | null {
  const released = new Date(releasedAt).getTime();
  if (!Number.isFinite(released)) return null;
  return new Date(released + COMPLETION.DISPUTE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
}
