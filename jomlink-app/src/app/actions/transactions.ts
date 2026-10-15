"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  getOpportunityById,
  createTransaction,
  createLedgerEntry,
  createRefund,
  updateOpportunityIfOwned,
  listReleasesDue,
  listAwaitingSeekerConfirmation,
  listAwaitingVerification,
  listVerifiedHeld,
  updateConnection,
  getConnectionById,
} from "@/lib/queries";
import { computeFunding, roundMoney, postingDepositRefund } from "@/lib/funding";
import { doubleEntry, accounts } from "@/lib/ledger";
import { settleRewardRelease } from "@/lib/release";
import { completeAndRelease, verifyCompletionCore } from "@/lib/completion";
import { notify } from "@/lib/notify";
import { FEES, WALLET, COMPLETION } from "@/lib/constants";
import { createBill } from "@/lib/toyyibpay";
import { isOpportunitySelectable } from "@/lib/status";

export type TransactionState = {
  error?: string;
  success?: boolean;
};

/**
 * Release the escrowed reward to the Linker on verified completion.
 * Deducts the 10% linker service fee (→ platform) and pays the net to the Linker.
 */
export async function releaseRewardAction(
  prevState: TransactionState | undefined,
  formData: FormData
): Promise<TransactionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  const oppId = String(formData.get("opportunityId") || "");
  const opp = oppId ? await getOpportunityById(oppId) : null;
  if (!opp) return { error: "Opportunity not found." };
  if (opp.seeker_id !== user.id) {

    return { error: "Only the Seeker can release the reward." };
  }
  if (opp.status !== "COMPLETED") {
    return { error: "Only completed opportunities can release the reward." };
  }

  const linkerId = String(formData.get("linkerId") || "");
  const funding = computeFunding(Number(opp.offer_amount) || 0);

  try {
    await settleRewardRelease({
      opportunityId: opp.id,
      opportunityTitle: opp.title,
      linkerId,
      reward: funding.reward,
      linkerServiceFee: funding.linkerServiceFee,
      linkerPayout: funding.linkerPayout,
    });

    revalidatePath("/opportunities/" + opp.id);
    revalidatePath("/dashboard/wallet");
    return { success: true };
  } catch (e: unknown) {
    console.error("releaseRewardAction error", e);
    return { error: "Could not release the reward." };
  }
}

/**
 * Refund the Seeker on a failed opportunity.
 * Returns the escrowed reward back to the Seeker's wallet. The posting deposit
 * is handled separately (see `cancelOpportunityAction`) — it is only refunded,
 * less the listing fee, when the Seeker cancels before a Linker is selected.
 */
export async function refundOpportunityAction(
  prevState: TransactionState | undefined,
  formData: FormData
): Promise<TransactionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  const oppId = String(formData.get("opportunityId") || "");
  const opp = oppId ? await getOpportunityById(oppId) : null;
  if (!opp) return { error: "Opportunity not found." };
  if (opp.seeker_id !== user.id) {

    return { error: "Only the Seeker can request a refund." };
  }
  if (!["FAILED", "CANCELLED", "EXPIRED"].includes(opp.status)) {
    return { error: "This opportunity is not refundable." };
  }

  // Only the reward that was actually escrowed (on Linker acceptance) is
  // refundable. If no Linker was ever accepted, there is nothing to refund.
  const escrowed = Number(opp.funded_amount || 0);
  if (escrowed <= 0) {
    return {
      error:
        "No reward was escrowed for this opportunity, so there is nothing to refund here. If a Linker was never selected, cancel the opportunity instead to recover the posting deposit (less the listing fee).",
    };
  }

  try {
    // Refund the escrowed reward back to the Seeker's wallet.
    const refundTx = await createTransaction({
      user_id: user.id,
      opportunity_id: opp.id,
      type: "REFUND",
      status: "COMPLETED",
      amount: escrowed,
      currency: "MYR",
      description: `Refund for failed opportunity "${opp.title}"`,
      reference: `OPP-REF-${opp.id.slice(0, 8)}-${Date.now()}`,
    });
    for (const e of doubleEntry(
      accounts.escrow(opp.id),
      accounts.wallet(user.id),
      escrowed
    )) {
      await createLedgerEntry({ transaction_id: refundTx.id, ...e });
    }

    await createRefund({
      transaction_id: refundTx.id,
      recipient_id: user.id,
      amount: escrowed,
      reason: "Opportunity failed / cancelled",
      status: "COMPLETED",
      approved_by: "system",
    });

    // Escrow is now empty.
    await updateOpportunityIfOwned(opp.id, user.id, { funded_amount: 0 });

    revalidatePath("/opportunities/" + opp.id);
    revalidatePath("/dashboard/wallet");
    return { success: true };
  } catch (e: unknown) {
    console.error("refundOpportunityAction error", e);
    return { error: "Could not process the refund." };
  }
}

/**
 * Cancel a posted opportunity BEFORE any Linker is selected.
 *
 * The Seeker's 10% posting deposit is refunded LESS the flat, non-refundable
 * listing fee (RM10). Two transactions are recorded so both movements are
 * transparent in the ledger:
 *   • REFUND (net)          → wallet (deposit − listing fee)
 *   • LISTING_FEE (retained) → platform (the non-refundable RM10)
 *
 * Cancellation is only permitted while the opportunity has no selected Linker
 * (and therefore no escrowed reward). The reward escrow, once held, is handled
 * by `refundOpportunityAction`.
 */
export async function cancelOpportunityAction(
  prevState: TransactionState | undefined,
  formData: FormData
): Promise<TransactionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  const oppId = String(formData.get("opportunityId") || "");
  const opp = oppId ? await getOpportunityById(oppId) : null;
  if (!opp) return { error: "Opportunity not found." };
  if (opp.seeker_id !== user.id) {
    return { error: "Only the Seeker can cancel this opportunity." };
  }
  if (opp.status === "CANCELLED") {
    return { error: "This opportunity is already cancelled." };
  }
  // Once a Linker is selected the reward is escrowed; cancel is not available.
  // `funded_amount` is the real signal — `opportunities` has no `linker_id`
  // column, so reading one is always undefined and silently disables this guard.
  if (Number(opp.funded_amount || 0) > 0 || !isOpportunitySelectable(opp.status)) {
    return {
      error:
        "This opportunity already has a selected Linker. It can no longer be cancelled — a failed or completed connection is refunded through the normal flow instead.",
    };
  }

  // The deposit actually collected at posting.
  const deposit = Number(opp.activation_fee || 0);
  const refundAmount = postingDepositRefund(deposit);
  const listingFee = roundMoney(Math.max(0, deposit - refundAmount));

  try {
    // 1) Refund the refundable portion of the deposit → wallet.
    if (refundAmount > 0) {
      const refundTx = await createTransaction({
        user_id: user.id,
        opportunity_id: opp.id,
        type: "REFUND",
        status: "COMPLETED",
        amount: refundAmount,
        currency: "MYR",
        description: `Posting deposit refund for cancelled opportunity "${opp.title}"`,
        reference: `OPP-CAN-${opp.id.slice(0, 8)}-${Date.now()}`,
      });
      for (const e of doubleEntry(
        accounts.platformActivation,
        accounts.wallet(user.id),
        refundAmount
      )) {
        await createLedgerEntry({ transaction_id: refundTx.id, ...e });
      }

      await createRefund({
        transaction_id: refundTx.id,
        recipient_id: user.id,
        amount: refundAmount,
        reason: "Opportunity cancelled before Linker selection",
        status: "COMPLETED",
        approved_by: "system",
      });
    }

    // 2) Retain the non-refundable listing fee as platform income.
    if (listingFee > 0) {
      const feeTx = await createTransaction({
        user_id: user.id,
        opportunity_id: opp.id,
        type: "LISTING_FEE",
        status: "COMPLETED",
        amount: listingFee,
        fee_raw: listingFee,
        currency: "MYR",
        description: `Non-refundable listing fee for "${opp.title}"`,
        reference: `OPP-LF-${opp.id.slice(0, 8)}-${Date.now()}`,
      });
      for (const e of doubleEntry(
        accounts.wallet(user.id),
        accounts.platformActivation,
        listingFee
      )) {
        await createLedgerEntry({ transaction_id: feeTx.id, ...e });
      }
    }

    // 3) Mark the opportunity cancelled.
    await updateOpportunityIfOwned(opp.id, user.id, { status: "CANCELLED" });

    revalidatePath("/opportunities/" + opp.id);
    revalidatePath("/marketplace");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/wallet");
    return { success: true };
  } catch (e: unknown) {
    console.error("cancelOpportunityAction error", e);
    return { error: "Could not cancel the opportunity. Please try again." };
  }
}

/**
 * 7-day auto-release FALLBACK sweep (§3.9).
 *
 * Since Option A (2026-10-15), the primary release happens immediately when the
 * Seeker marks a connection complete (`markConnectionCompleteAction`). This
 * sweep is the SAFETY NET: it releases any connection that is COMPLETED with
 * `release_status = PENDING_RELEASE` whose `auto_release_at` (completion + 7
 * days) has passed and which no dispute has frozen — i.e. the Seeker never
 * released it. Driven by `GET /api/connections/release-sweep` (cron) or on demand.
 *
 * It also drains any legacy rows left in PENDING_RELEASE by the pre-Option-A
 * two-step flow.
 *
 * For each due connection it:
 *   1. re-reads the connection so a dispute/refund raised between the list
 *      query and the release is not overwritten,
 *   2. moves the money through the shared `settleRewardRelease` core,
 *   3. flips `release_status` → RELEASED so BOTH dashboards (Seeker escrow tile
 *      and Linker incoming payouts) agree the money has left escrow,
 *   4. notifies the Linker their reward has landed.
 *
 * Idempotent: a connection already RELEASED/REFUNDED/VOID/HELD is skipped, so
 * overlapping cron runs cannot double-pay.
 */
export async function runAutoReleaseCheck(): Promise<{ released: number; skipped: number }> {
  const due = await listReleasesDue();
  let released = 0;
  let skipped = 0;

  for (const listed of due) {
    try {
      // Re-read to get the authoritative release_status/status at the moment of
      // release — the list query is a snapshot and a dispute may have landed.
      const conn = await getConnectionById(listed.id);
      if (!conn) {
        skipped++;
        continue;
      }
      const rs = (conn.release_status ?? "").toUpperCase();
      if (
        conn.status !== "COMPLETED" ||
        rs === "RELEASED" ||
        rs === "REFUNDED" ||
        rs === "VOID" ||
        rs === "HELD"
      ) {
        skipped++;
        continue;
      }

      const opp = await getOpportunityById(conn.opportunity_id);
      if (!opp) {
        skipped++;
        continue;
      }

      const reward = Number(conn.agreed_reward ?? opp.offer_amount ?? 0);
      const funding = computeFunding(reward);
      if (funding.reward <= 0) {
        skipped++;
        continue;
      }

      await settleRewardRelease({
        opportunityId: opp.id,
        opportunityTitle: opp.title,
        linkerId: conn.linker_id,
        reward: funding.reward,
        linkerServiceFee: funding.linkerServiceFee,
        linkerPayout: funding.linkerPayout,
      });

      await updateConnection(conn.id, { release_status: "RELEASED" });

      await notify({
        userId: conn.linker_id,
        type: "REWARD_RELEASED",
        title: "Your reward has been released",
        body: `The release window on "${opp.title}" has ended. Your reward is now in your wallet.`,
        data: { connectionId: conn.id, opportunityId: opp.id },
      });

      released++;
    } catch (e: unknown) {
      console.error("runAutoReleaseCheck: release failed for", listed.id, e);
      skipped++;
    }
  }

  if (released > 0) {
    revalidatePath("/dashboard/wallet");
    revalidatePath("/dashboard");
  }

  return { released, skipped };
}

/** The 7-day wait window (days), from constants. */
export async function releaseWaitDays(): Promise<number> {
  return FEES.RELEASE_WAIT_DAYS;
}

/**
 * Verification-gated completion sweep (Phase 14, §5.7).
 *
 * Three timeouts, each protecting one party from being held hostage:
 *   1. AUTO-ADVANCE — a connection in `AWAITING_SEEKER_CONFIRMATION` whose
 *      `evidence_submitted_at + SEEKER_CONFIRM_WINDOW_DAYS` has passed advances
 *      to `AWAITING_VERIFICATION`. Silence is non-objection: a ghosting Seeker
 *      can never block payment.
 *   2. AUTO-VERIFY — a connection in `AWAITING_VERIFICATION` whose
 *      `seeker_confirmed_at + VERIFICATION_WINDOW_DAYS` has passed is verified
 *      (and released, unless HIGH risk → held). The platform can never stall.
 *   3. AUTO-RELEASE — a `VERIFIED` connection whose `release_hold_until` has
 *      passed completes + releases.
 *
 * Distinct from `runAutoReleaseCheck`, which is the legacy 7-day fallback for a
 * COMPLETED-but-unreleased connection. Together they drain the whole money path.
 *
 * Idempotent: each stage skips rows that are no longer in the expected status,
 * and the release core skips any connection already RELEASED/REFUNDED/VOID.
 */
export async function runVerificationSweep(): Promise<{
  advanced: number;
  verified: number;
  released: number;
  held: number;
  skipped: number;
}> {
  const now = new Date();
  let advanced = 0;
  let verified = 0;
  let released = 0;
  let held = 0;
  let skipped = 0;

  // ── 1. Auto-advance seeker-confirmation timeouts ────────────────────────
  const confirmDeadlineMs =
    COMPLETION.SEEKER_CONFIRM_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const pendingConfirm = await listAwaitingSeekerConfirmation(now);
  for (const listed of pendingConfirm) {
    try {
      const conn = await getConnectionById(listed.id);
      if (!conn || conn.status !== "AWAITING_SEEKER_CONFIRMATION") {
        skipped++;
        continue;
      }
      const submitted = conn.evidence_submitted_at
        ? new Date(conn.evidence_submitted_at).getTime()
        : 0;
      if (now.getTime() - submitted < confirmDeadlineMs) {
        skipped++;
        continue;
      }
      await updateConnection(conn.id, {
        status: "AWAITING_VERIFICATION",
        seeker_confirmation_status: "TIMED_OUT",
        seeker_confirmed_at: now.toISOString(),
        verification_status: "PENDING",
      });
      advanced++;
    } catch (e: unknown) {
      console.error("runVerificationSweep: advance failed for", listed.id, e);
      skipped++;
    }
  }

  // ── 2. Auto-verify verification timeouts ────────────────────────────────
  const verifyDeadlineMs =
    COMPLETION.VERIFICATION_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const pendingVerify = await listAwaitingVerification(now);
  for (const listed of pendingVerify) {
    try {
      const conn = await getConnectionById(listed.id);
      if (!conn || conn.status !== "AWAITING_VERIFICATION") {
        skipped++;
        continue;
      }
      const confirmed = conn.seeker_confirmed_at
        ? new Date(conn.seeker_confirmed_at).getTime()
        : 0;
      if (now.getTime() - confirmed < verifyDeadlineMs) {
        skipped++;
        continue;
      }
      const result = await verifyCompletionCore(conn.id);
      if (!result.ok) {
        skipped++;
        continue;
      }
      if (result.held) held++;
      else verified++;
      if (result.released) released++;
    } catch (e: unknown) {
      console.error("runVerificationSweep: verify failed for", listed.id, e);
      skipped++;
    }
  }

  // ── 3. Auto-release verified connections whose mandatory hold elapsed ────
  const heldDue = await listVerifiedHeld(now);
  for (const listed of heldDue) {
    try {
      const conn = await getConnectionById(listed.id);
      if (!conn || conn.status !== "VERIFIED") {
        skipped++;
        continue;
      }
      const result = await completeAndRelease(conn);
      if (!result.ok) {
        skipped++;
        continue;
      }
      if (result.released) released++;
      else skipped++;
    } catch (e: unknown) {
      console.error("runVerificationSweep: release failed for", listed.id, e);
      skipped++;
    }
  }

  if (released > 0 || advanced > 0 || verified > 0) {
    revalidatePath("/dashboard/wallet");
    revalidatePath("/dashboard");
  }

  return { advanced, verified, released, held, skipped };
}

// ── Wallet top-up (ToyyibPay) ────────────────────────────────

/**
 * Start a wallet top-up by creating a ToyyibPay bill.
 *
 * The wallet is NOT credited here — we create a PENDING WALLET_CREDIT
 * transaction and redirect the member to ToyyibPay's hosted payment page.
 * The wallet is credited only when the callback/return confirms payment
 * (see `src/app/api/payments/toyyibpay/*`).
 */
export async function topUpWalletAction(
  prevState: TransactionState | undefined,
  formData: FormData
): Promise<TransactionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  const raw = String(formData.get("amount") || "").trim();
  const amount = roundMoney(Number(raw));

  if (!raw || Number.isNaN(amount) || amount <= 0) {
    return { error: "Enter a valid amount." };
  }
  if (amount < WALLET.TOPUP_MIN) {
    return { error: `Minimum top-up is RM${WALLET.TOPUP_MIN.toFixed(2)}.` };
  }
  if (amount > WALLET.TOPUP_MAX) {
    return { error: `Maximum top-up is RM${WALLET.TOPUP_MAX.toFixed(2)}.` };
  }

  // ToyyibPay echoes this back as `order_id`. Keep it SHORT and alphanumeric —
  // long/reference values with hyphens get dropped by the gateway, which is what
  // stranded top-ups in PENDING. Follow the docs' own sample ('AFR341DFI').
  const reference = `JL${Date.now().toString(36).toUpperCase()}${user.id
    .replace(/-/g, "")
    .slice(0, 6)}`;

  try {
    // 1) Create the ToyyibPay bill (hosted payment page).
    const bill = await createBill({
      billName: "Jomlink Wallet Topup",
      billDescription: `Wallet top-up for ${user.email}`,
      amount,
      externalReferenceNo: reference,
      payerName: user.fullName,
      payerEmail: user.email,
      payerPhone: user.mobile || undefined,
      paymentChannel: "2", // FPX + card
      expiryDays: 3,
    });

    if (!bill.ok || !bill.paymentUrl || !bill.billCode) {
      console.error("topUpWalletAction: createBill failed", bill.error);
      return {
        error: `Could not start the payment: ${bill.error ?? "unknown error"}`,
      };
    }

    // 2) Record a PENDING transaction so we can reconcile the callback. We store
    //    the ToyyibPay BillCode in `gateway_ref` — the gateway ALWAYS echoes its
    //    own bill code back, so reconciliation never depends on `order_id`.
    await createTransaction({
      user_id: user.id,
      type: "WALLET_CREDIT",
      status: "PENDING",
      amount,
      currency: "MYR",
      description: "Wallet top-up (awaiting payment)",
      reference,
      gateway: "toyyibpay",
      gateway_ref: bill.billCode,
    });

    revalidatePath("/dashboard/wallet");

    // 3) Send the member to ToyyibPay.
    redirect(bill.paymentUrl);
  } catch (e: unknown) {
    // redirect() throws a special NEXT_REDIRECT error — let it propagate.
    if (
      e &&
      typeof e === "object" &&
      "digest" in e &&
      String((e as { digest?: string }).digest).startsWith("NEXT_REDIRECT")
    ) {
      throw e;
    }
    console.error("topUpWalletAction error", e);
    return { error: "Could not start the payment. Please try again." };
  }
}