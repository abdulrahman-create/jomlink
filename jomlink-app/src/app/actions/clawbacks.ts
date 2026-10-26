"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/rbac";
import { recordAuditLog, AUDIT_ACTIONS } from "@/lib/audit";
import {
  createClawback,
  createTransaction,
  getClawbackById,
  getClawbacksByConnection,
  getConnectionById,
  getOpportunityById,
  getReleasedPayoutForConnection,
  getWalletBalance,
  recordLedgerEntries,
  updateClawback,
} from "@/lib/queries";
import { accounts, doubleEntry } from "@/lib/ledger";
import { planClawback, isWithinClawbackWindow } from "@/lib/clawback";
import { formatMYR } from "@/lib/constants";
import { notify } from "@/lib/notify";

/**
 * Post-release clawback (§5.12.1, §11.7).
 *
 * Permission: `finance:payout` — the same authority that releases money may
 * recover it. A clawback moves value out of a member's wallet, so it must never
 * be reachable with a lesser permission.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
 *   • It never pushes a wallet negative.
 *   • It never recovers more than the platform actually released for the job.
 *   • It never marks a clawback "RECOVERED" unless the full amount came back.
 *   • When the wallet cannot cover it, the remainder is recorded as
 *     `amount_outstanding` and flagged for manual review — it is a receivable,
 *     not a silent write-off and not a licence to debit unrelated funds.
 */
export async function openClawbackAction(formData: FormData) {
  const admin = await requireAdmin("finance:payout");

  const connectionId = String(formData.get("connectionId") || "");
  const rawAmount = String(formData.get("amount") || "");
  const reason = String(formData.get("reason") || "").trim();

  if (!connectionId) throw new Error("Connection ID is required");
  if (!reason) throw new Error("A clawback reason is required");

  const conn = await getConnectionById(connectionId);
  if (!conn) throw new Error("Connection not found");

  const opp = await getOpportunityById(conn.opportunity_id);
  if (!opp) throw new Error("Opportunity not found");

  // Only released money can be clawed back.
  if (conn.release_status !== "RELEASED") {
    throw new Error(
      "Only a released reward can be clawed back. Use a normal dispute while escrow is still held."
    );
  }

  const payout = await getReleasedPayoutForConnection(conn.id);
  if (!payout) {
    throw new Error("No released payout found for this connection.");
  }

  // Inside DISPUTE_WINDOW of the release, measured from the actual payout.
  const releasedAt = payout.released_at ?? payout.created_at;
  if (!isWithinClawbackWindow(releasedAt)) {
    throw new Error(
      "The clawback window has closed for this payout. Escalate to manual review instead."
    );
  }

  // One open clawback per connection — otherwise the same money is recovered twice.
  const existing = await getClawbacksByConnection(conn.id);
  if (existing.some((c) => c.status === "PENDING" || c.status === "PARTIAL")) {
    throw new Error("This connection already has an open clawback.");
  }

  const balance = await getWalletBalance(conn.linker_id);
  const plan = planClawback({
    amount: Number(rawAmount),
    walletBalance: balance,
    capAmount: Number(payout.net_amount),
  });
  if (!plan.ok) throw new Error(plan.error);

  // 1. Record the decision first — the recoverable amount is derived from it.
  const clawback = await createClawback({
    connection_id: conn.id,
    opportunity_id: opp.id,
    dispute_id: null,
    linker_id: conn.linker_id,
    amount: plan.targetAmount,
    reason,
    decided_by: admin.user.id,
    decided_at: new Date().toISOString(),
    amount_recovered: 0,
    amount_outstanding: plan.targetAmount,
    status: "PENDING",
    recovery_method: plan.recoverFromWallet > 0 ? "WALLET_DEBIT" : "NONE",
    requires_manual_review: plan.requiresManualReview,
    original_payout_id: payout.id,
  });

  // 2. Recover what the wallet can actually cover, via the normal ledger.
  if (plan.recoverFromWallet > 0) {
    const tx = await createTransaction({
      user_id: conn.linker_id,
      opportunity_id: opp.id,
      connection_id: conn.id,
      type: "CLAWBACK",
      status: "COMPLETED",
      amount: plan.recoverFromWallet,
      currency: opp.currency,
      description: `Clawback recovery: ${reason}`,
    });

    const entries = doubleEntry(
      accounts.wallet(conn.linker_id),
      accounts.platformClawback,
      plan.recoverFromWallet
    );
    if (entries.length > 0) {
      await recordLedgerEntries(tx.id, entries);
    }

    await updateClawback(clawback.id, {
      amount_recovered: plan.recoverFromWallet,
      amount_outstanding: plan.outstanding,
      status: plan.status,
      recovery_transaction_id: tx.id,
      // §11.7: an internal wallet debit is our own ledger, not a provider
      // reversal, so record that plainly rather than implying a gateway action.
      provider_response: "Recovered from member wallet balance (internal ledger).",
    });
  }

  await recordAuditLog({
    adminId: admin.user.id,
    action: AUDIT_ACTIONS.CLAWBACK_OPENED,
    entity: "CLAWBACK",
    entityId: clawback.id,
    details: {
      connectionId: conn.id,
      opportunityId: opp.id,
      linkerId: conn.linker_id,
      target: plan.targetAmount,
      recovered: plan.recoverFromWallet,
      outstanding: plan.outstanding,
      status: plan.status,
      requiresManualReview: plan.requiresManualReview,
      reason,
      admin: admin.user.email,
    },
  });

  // 3. Tell the Linker plainly what was taken and what remains.
  await notify({
    userId: conn.linker_id,
    type: "PAYOUT_PAID",
    title: "A completed payout was clawed back",
    body:
      plan.recoverFromWallet > 0
        ? `${formatMYR(plan.recoverFromWallet)} was recovered from your wallet. ${
            plan.outstanding > 0
              ? `${formatMYR(plan.outstanding)} remains outstanding and is under review.`
              : "The recovery is now complete."
          } Reason: ${reason}`
        : `A recovery of ${formatMYR(plan.targetAmount)} was recorded against you and is under review. Reason: ${reason}`,
    data: { clawbackId: clawback.id, connectionId: conn.id },
  });

  revalidatePath(`/admin/transactions`);
  revalidatePath(`/dashboard/connections/${conn.id}`);
  revalidatePath(`/dashboard/wallet`);
}

/**
 * Re-attempt recovery on a clawback that is still short of its target — e.g.
 * the Linker has since earned more into their wallet.
 */
export async function recoverClawbackAction(formData: FormData) {
  const admin = await requireAdmin("finance:payout");

  const clawbackId = String(formData.get("clawbackId") || "");
  if (!clawbackId) throw new Error("Clawback ID is required");

  const clawback = await getClawbackById(clawbackId);
  if (!clawback) throw new Error("Clawback not found");
  if (clawback.status === "RECOVERED" || clawback.status === "CANCELLED") {
    // Idempotent: nothing to do on a settled or withdrawn clawback.
    revalidatePath("/admin/transactions");
    return;
  }

  const outstanding = Number(clawback.amount_outstanding);
  if (outstanding <= 0) return;

  const balance = await getWalletBalance(clawback.linker_id);
  const plan = planClawback({
    amount: outstanding,
    walletBalance: balance,
    capAmount: outstanding,
  });
  if (!plan.ok) throw new Error(plan.error);

  if (plan.recoverFromWallet <= 0) {
    throw new Error("The Linker's wallet balance still cannot cover any recovery.");
  }

  const opp = await getOpportunityById(clawback.opportunity_id);

  const tx = await createTransaction({
    user_id: clawback.linker_id,
    opportunity_id: clawback.opportunity_id,
    connection_id: clawback.connection_id,
    type: "CLAWBACK",
    status: "COMPLETED",
    amount: plan.recoverFromWallet,
    currency: opp?.currency ?? "MYR",
    description: `Clawback recovery (follow-up): ${clawback.reason}`,
  });

  const entries = doubleEntry(
    accounts.wallet(clawback.linker_id),
    accounts.platformClawback,
    plan.recoverFromWallet
  );
  if (entries.length > 0) {
    await recordLedgerEntries(tx.id, entries);
  }

  const totalRecovered = Number(clawback.amount_recovered) + plan.recoverFromWallet;
  const remaining = Math.max(0, Number(clawback.amount) - totalRecovered);
  const status = remaining <= 0 ? "RECOVERED" : "PARTIAL";

  await updateClawback(clawback.id, {
    amount_recovered: Math.round((totalRecovered + Number.EPSILON) * 100) / 100,
    amount_outstanding: Math.round((remaining + Number.EPSILON) * 100) / 100,
    status,
    requires_manual_review: remaining > 0,
    recovery_transaction_id: tx.id,
    provider_response: "Recovered from member wallet balance (internal ledger).",
  });

  await recordAuditLog({
    adminId: admin.user.id,
    action: AUDIT_ACTIONS.CLAWBACK_RECOVERED,
    entity: "CLAWBACK",
    entityId: clawback.id,
    details: {
      recoveredNow: plan.recoverFromWallet,
      totalRecovered,
      remaining,
      status,
      admin: admin.user.email,
    },
  });

  revalidatePath("/admin/transactions");
  revalidatePath(`/dashboard/wallet`);
}

/**
 * Withdraw a clawback that cannot be recovered (e.g. the money is gone and
 * legal/counsel says no further recovery is permitted). Nothing is deleted —
 * the audit trail keeps the original decision and the reason for closing it.
 */
export async function cancelClawbackAction(formData: FormData) {
  const admin = await requireAdmin("finance:payout");

  const clawbackId = String(formData.get("clawbackId") || "");
  const note = String(formData.get("note") || "").trim();
  if (!clawbackId) throw new Error("Clawback ID is required");
  if (!note) throw new Error("Record why the remaining balance is not recoverable");

  const clawback = await getClawbackById(clawbackId);
  if (!clawback) throw new Error("Clawback not found");
  if (clawback.status === "RECOVERED") {
    throw new Error("This clawback is already fully recovered.");
  }
  if (clawback.status === "CANCELLED") return;

  await updateClawback(clawback.id, {
    status: "CANCELLED",
    requires_manual_review: false,
    review_note: note,
  });

  await recordAuditLog({
    adminId: admin.user.id,
    action: AUDIT_ACTIONS.CLAWBACK_CLOSED,
    entity: "CLAWBACK",
    entityId: clawback.id,
    details: {
      recovered: clawback.amount_recovered,
      writtenOff: clawback.amount_outstanding,
      note,
      admin: admin.user.email,
    },
  });

  revalidatePath("/admin/transactions");
}
