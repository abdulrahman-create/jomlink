import {
  createTransaction,
  createLedgerEntry,
  createPayout,
} from "@/lib/queries";
import { doubleEntry, accounts } from "@/lib/ledger";

/**
 * Jomlink escrow release core.
 *
 * The single money-movement path for paying an escrowed reward to a Linker.
 * Shared by:
 *   • `markConnectionCompleteAction` — the PRIMARY trigger: the Seeker marks the
 *     connection complete and the reward is released immediately (blueprint §3.9,
 *     §5.12, §5.16/§5.17 "Payment Release" step);
 *   • `releaseRewardAction` — the legacy manual button (kept for a completed
 *     connection that was not released at completion);
 *   • `runAutoReleaseCheck` — the 7-day fallback sweep for a connection that was
 *     completed but never released.
 *
 * Escrow → Linker (full reward), Linker → platform (10% service fee), and a
 * COMPLETED payout record for the net. Callers own any additional state changes
 * (connection `release_status`, notifications).
 *
 * Kept in a plain module (NOT a `"use server"` action file) so it can be called
 * from any server action without being exposed as its own callable endpoint.
 */
export interface RewardReleaseInput {
  opportunityId: string;
  opportunityTitle: string;
  linkerId: string;
  reward: number;
  linkerServiceFee: number;
  linkerPayout: number;
}

export async function settleRewardRelease(
  input: RewardReleaseInput
): Promise<void> {
  const { opportunityId, opportunityTitle, linkerId } = input;
  const funding = {
    reward: input.reward,
    linkerServiceFee: input.linkerServiceFee,
    linkerPayout: input.linkerPayout,
  };

  // 1) Reward release transaction (REWARD_RELEASE) + Escrow → Linker.
  const releaseTx = await createTransaction({
    user_id: linkerId,
    opportunity_id: opportunityId,
    type: "REWARD_RELEASE",
    status: "COMPLETED",
    amount: funding.reward,
    currency: "MYR",
    description: `Reward release for "${opportunityTitle}"`,
    reference: `OPP-REL-${opportunityId.slice(0, 8)}-${Date.now()}`,
  });
  for (const e of doubleEntry(
    accounts.escrow(opportunityId),
    accounts.linker(linkerId),
    funding.reward
  )) {
    await createLedgerEntry({ transaction_id: releaseTx.id, ...e });
  }

  // 2) Linker service fee (10%) → platform.
  const feeTx = await createTransaction({
    user_id: linkerId,
    opportunity_id: opportunityId,
    type: "LINKER_SERVICE_FEE",
    status: "COMPLETED",
    amount: funding.linkerServiceFee,
    fee_raw: funding.linkerServiceFee,
    currency: "MYR",
    description: `Linker service fee (10%) for "${opportunityTitle}"`,
    reference: `OPP-FEE-${opportunityId.slice(0, 8)}-${Date.now()}`,
  });
  for (const e of doubleEntry(
    accounts.linker(linkerId),
    accounts.platformService,
    funding.linkerServiceFee
  )) {
    await createLedgerEntry({ transaction_id: feeTx.id, ...e });
  }

  // 3) Payout record for the Linker (net = reward − 10%).
  await createPayout({
    transaction_id: releaseTx.id,
    recipient_id: linkerId,
    amount: funding.reward,
    service_fee: funding.linkerServiceFee,
    net_amount: funding.linkerPayout,
    method: "BANK_TRANSFER",
    status: "COMPLETED",
    released_at: new Date().toISOString(),
  });
}
