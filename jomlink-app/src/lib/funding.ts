import { FEES } from "@/lib/constants";

/**
 * Jomlink Funding & Escrow Arithmetic
 *
 * Business model (blueprint §3–4):
 *   • Seeker pays an ACTIVATION FEE = 10% of the advertised reward, plus the
 *     REWARD ITSELF which is HELD IN ESCROW until a connection completes.
 *   • Linker pays a 3% SERVICE FEE on each successful payout.
 *
 * In Phase 3 the payment gateway is STUBBED/simulated: we compute the exact
 * amounts and record them in `transactions` (type OPPORTUNITY_FUNDING /
 * ACTIVATION_FEE) as if settled, but no real money moves.
 */

export interface FundingBreakdown {
  reward: number; // advertised offer amount (the supply "Reward")
  activationFee: number; // 10% of reward, charged upfront to Seeker
  escrowAmount: number; // total withheld on activation = reward + activationFee
  linkerPayout: number; // reward − 3% linker service fee (on successful release)
  linkerServiceFee: number; // 3% of reward
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
  const activationFee = roundMoney(r * FEES.ACTIVATION_FEE_RATE);
  const linkerServiceFee = roundMoney(r * FEES.LINKER_SERVICE_FEE_RATE);
  return {
    reward: r,
    activationFee,
    escrowAmount: roundMoney(r + activationFee),
    linkerPayout: roundMoney(r - linkerServiceFee),
    linkerServiceFee,
  };
}

/** Human-friendly summary line for the UI. */
export function fundingSummary(reward: number): FundingBreakdown {
  return computeFunding(reward);
}

export function calculateLinkerPayout(reward: number): {
  netPayout: number;
  serviceFee: number;
} {
  const f = computeFunding(reward);
  return { netPayout: f.linkerPayout, serviceFee: f.linkerServiceFee };
}