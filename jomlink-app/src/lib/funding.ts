import { FEES } from "@/lib/constants";

/**
 * Jomlink Funding & Escrow Arithmetic
 *
 * Business model (blueprint §3.9, §5.7):
 *   • POSTING: the Seeker pays a REFUNDABLE 10% posting deposit (of the
 *     reward), auto-deducted from their wallet. Posting is blocked when the
 *     wallet cannot cover it. The reward itself is NOT charged at posting.
 *   • CANCELLING BEFORE A LINKER IS SELECTED: the Seeker gets the deposit back
 *     LESS the non-refundable listing fee (RM10). Once a Linker is selected the
 *     deposit is consumed.
 *   • ACCEPTING A LINKER: the Seeker must have FULL SETTLEMENT of the agreed
 *     reward in their wallet; it is then held in ESCROW until completion.
 *   • Linker pays a 10% SERVICE FEE on each successful payout.
 *
 * The payment gateway is STUBBED/simulated: we compute the exact amounts and
 * record them in `transactions` as if settled, but no real money moves.
 */

export interface FundingBreakdown {
  reward: number; // advertised offer amount (the supply "Reward")
  postingDeposit: number; // 10% of reward, refundable less the listing fee
  listingFee: number; // flat, non-refundable listing fee (RM10)
  depositRefund: number; // deposit − listing fee, returned on early cancellation
  escrowAmount: number; // reward held in escrow once a Linker is accepted
  linkerPayout: number; // reward − 10% linker service fee (on successful release)
  linkerServiceFee: number; // 10% of reward
}

/** Round money to 2 decimals (avoid float drift). */
export function roundMoney(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/**
 * Compute the full funding picture for one opportunity.
 * `reward` must be >= 0.
 */
export function computeFunding(reward: number): FundingBreakdown {
  const r = roundMoney(Number(reward) || 0);
  const postingDeposit = roundMoney(r * FEES.POSTING_DEPOSIT_RATE);
  const listingFee = roundMoney(FEES.LISTING_FEE);
  // The refund never exceeds the deposit actually collected.
  const depositRefund = roundMoney(Math.max(0, postingDeposit - listingFee));
  const linkerServiceFee = roundMoney(r * FEES.LINKER_SERVICE_FEE_RATE);
  return {
    reward: r,
    postingDeposit,
    listingFee,
    depositRefund,
    escrowAmount: r,
    linkerPayout: roundMoney(r - linkerServiceFee),
    linkerServiceFee,
  };
}

/** Human-friendly summary line for the UI. */
export function fundingSummary(reward: number): FundingBreakdown {
  return computeFunding(reward);
}

/**
 * The 10% posting deposit for a reward (refundable less the listing fee).
 * Convenience wrapper used by the publish flow.
 */
export function postingDepositFor(reward: number): number {
  return roundMoney((Number(reward) || 0) * FEES.POSTING_DEPOSIT_RATE);
}

/**
 * The amount actually returned to the Seeker when a posted opportunity is
 * cancelled before any Linker is selected: the posting deposit less the flat,
 * non-refundable listing fee.
 */
export function postingDepositRefund(deposit: number): number {
  return roundMoney(Math.max(0, roundMoney(deposit) - roundMoney(FEES.LISTING_FEE)));
}

export function calculateLinkerPayout(reward: number): {
  netPayout: number;
  serviceFee: number;
} {
  const f = computeFunding(reward);
  return { netPayout: f.linkerPayout, serviceFee: f.linkerServiceFee };
}