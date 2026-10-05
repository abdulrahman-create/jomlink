import {
  createTransaction,
  createLedgerEntry,
  getTransactionsByOpportunity,
  getWalletBalance,
} from "@/lib/queries";
import { postingDepositFor } from "@/lib/funding";
import { doubleEntry, accounts } from "@/lib/ledger";
import { formatMYR } from "@/lib/constants";
import type { OpportunityRow } from "@/lib/jomlink-types";

/**
 * Jomlink Posting Deposit — shared charging routine.
 *
 * The REFUNDABLE 10% posting deposit is charged in exactly ONE place so every
 * code path that actually posts an opportunity (Seeker posting directly, Seeker
 * publishing a draft, or an ADMIN approving a draft) charges identically:
 *
 *   • blueprint §3.9 — deposit auto-deducted from the Seeker's wallet at post.
 *   • posting is BLOCKED when the wallet cannot cover the deposit.
 *   • the reward itself is NOT charged here (it is escrowed later).
 */
export type ChargePostingDepositResult =
  | { ok: true; deposit: number }
  | { ok: false; error: string };

export async function chargePostingDeposit(
  seekerId: string,
  opp: Pick<OpportunityRow, "id" | "title" | "offer_amount">
): Promise<ChargePostingDepositResult> {
  const deposit = postingDepositFor(Number(opp.offer_amount) || 0);

  // Idempotency guard — a posting deposit is charged at most ONCE per
  // opportunity. `activation_fee` is the intended marker, but it is unreliable:
  // it is a nullable column that is never reset on cancellation, and the wallet
  // balance alone cannot tell "never charged" from "charged, then refunded".
  // So we also consult the ledger: if a POSTING_DEPOSIT row already exists for
  // this opportunity we treat the deposit as collected and never charge twice.
  const existing = (await getTransactionsByOpportunity(
    opp.id
  )) as Array<{ type?: string | null }>;
  const depositAlreadyPaid = existing.some(
    (t) => t.type === "POSTING_DEPOSIT"
  );
  if (depositAlreadyPaid) {
    return { ok: false, error: "already-paid" };
  }

  // Posting is blocked unless the wallet can cover the 10% deposit.
  const balance = await getWalletBalance(seekerId);
  if (balance < deposit) {
    return {
      ok: false,
      error: `Insufficient wallet credit. Posting requires a ${formatMYR(
        deposit
      )} deposit (10% of the reward), but the Seeker's balance is ${formatMYR(
        balance
      )}. Ask them to top up and try again.`,
    };
  }

  // Posting deposit → platform (POSTING_DEPOSIT). Refundable less the listing
  // fee if the Seeker cancels before selecting a Linker.
  const depositTx = await createTransaction({
    user_id: seekerId,
    opportunity_id: opp.id,
    type: "POSTING_DEPOSIT",
    status: "COMPLETED",
    amount: deposit,
    fee_raw: deposit,
    currency: "MYR",
    description: `Posting deposit (10%) for "${opp.title}"`,
    reference: `OPP-DEP-${opp.id.slice(0, 8)}-${Date.now()}`,
  });
  for (const e of doubleEntry(
    accounts.wallet(seekerId),
    accounts.platformActivation,
    deposit
  )) {
    await createLedgerEntry({ transaction_id: depositTx.id, ...e });
  }

  return { ok: true, deposit };
}
