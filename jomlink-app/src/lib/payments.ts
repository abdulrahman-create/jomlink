import {
  findPaymentTransaction,
  updateTransactionStatus,
  createLedgerEntry,
} from "@/lib/queries";
import { doubleEntry, accounts } from "@/lib/ledger";
import { getBillTransactions, interpretBillOutcome } from "@/lib/toyyibpay";
import type { TransactionRow } from "@/lib/jomlink-types";

/**
 * Shared wallet top-up settlement.
 *
 * The callback route, the return route, and the reconciliation job all funnel
 * through here so the wallet is credited exactly once, with the same ledger
 * entries, regardless of which path confirms the payment first.
 *
 * A top-up is created PENDING before the member is sent to ToyyibPay; it only
 * becomes COMPLETED once the gateway confirms the bill is actually paid.
 */
export type SettleResult =
  | { outcome: "credited"; amount: number; tx: TransactionRow }
  | { outcome: "already"; tx: TransactionRow }
  | { outcome: "pending"; tx: TransactionRow }
  | { outcome: "failed"; tx: TransactionRow }
  | { outcome: "not_found" };

/**
 * Reconcile a single top-up against ToyyibPay and credit the wallet if paid.
 *
 * @param tx        the PENDING transaction row
 * @param billCode  the ToyyibPay BillCode to verify (falls back to tx.gateway_ref)
 * @param verify    when true, re-check the gateway before crediting (used by the
 *                  return handler + reconcile job; the hash-verified callback
 *                  already proved payment, so it can pass verify=false)
 */
export async function settleTopUp(
  tx: TransactionRow,
  billCode: string | undefined,
  verify: boolean
): Promise<SettleResult> {
  // Idempotency — never credit twice.
  if (tx.status === "COMPLETED") {
    return { outcome: "already", tx };
  }

  const code = billCode || tx.gateway_ref || undefined;
  if (verify) {
    if (!code) return { outcome: "pending", tx };
    const billTx = await getBillTransactions(code);
    const outcome = interpretBillOutcome(billTx);
    if (outcome === "pending") return { outcome: "pending", tx };
    if (outcome === "failed") {
      await updateTransactionStatus(tx.id, "FAILED");
      return { outcome: "failed", tx };
    }
    // outcome === "paid" → fall through and credit.
  }

  const amount = Number(tx.amount);
  await updateTransactionStatus(tx.id, "COMPLETED");
  for (const e of doubleEntry(
    accounts.externalFunding,
    accounts.wallet(tx.user_id),
    amount
  )) {
    await createLedgerEntry({ transaction_id: tx.id, ...e });
  }
  return { outcome: "credited", amount, tx };
}

/**
 * Credit a top-up that a hash-verified callback already proved is paid.
 * Kept separate so the callback does not pay for a redundant gateway round-trip
 * on the happy path.
 */
export async function creditVerifiedTopUp(
  tx: TransactionRow
): Promise<SettleResult> {
  return settleTopUp(tx, tx.gateway_ref ?? undefined, false);
}

export { findPaymentTransaction };
