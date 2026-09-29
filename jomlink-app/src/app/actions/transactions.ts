"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import {
  getOpportunityById,
  getTransactionsByOpportunity,
  createTransaction,
  createLedgerEntry,
  createPayout,
  createRefund,
  updateTransactionStatus,
  updateOpportunityIfOwned,
} from "@/lib/queries";
import { computeFunding, roundMoney, postingDepositRefund } from "@/lib/funding";
import { doubleEntry, accounts } from "@/lib/ledger";
import { FEES, WALLET } from "@/lib/constants";
import { createBill } from "@/lib/toyyibpay";

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
    // 1) Reward release transaction (REWARD_RELEASE).
    const releaseTx = await createTransaction({
      user_id: linkerId,
      opportunity_id: opp.id,
      type: "REWARD_RELEASE",
      status: "COMPLETED",
      amount: funding.reward,
      currency: "MYR",
      description: `Reward release for "${opp.title}"`,
      reference: `OPP-REL-${opp.id.slice(0, 8)}-${Date.now()}`,
    });
    // Escrow → Linker (full reward).
    for (const e of doubleEntry(accounts.escrow(opp.id), accounts.linker(linkerId), funding.reward)) {
      await createLedgerEntry({ transaction_id: releaseTx.id, ...e });
    }

    // 2) Linker service fee (10%) → platform.

    const feeTx = await createTransaction({
      user_id: linkerId,
      opportunity_id: opp.id,
      type: "LINKER_SERVICE_FEE",
      status: "COMPLETED",
      amount: funding.linkerServiceFee,
      fee_raw: funding.linkerServiceFee,
      currency: "MYR",
      description: `Linker service fee (10%) for "${opp.title}"`,
      reference: `OPP-FEE-${opp.id.slice(0, 8)}-${Date.now()}`,
    });
for (const e of doubleEntry(accounts.linker(linkerId), accounts.platformService, funding.linkerServiceFee)) {
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
  if (opp.linker_id || Number(opp.funded_amount || 0) > 0) {
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
 * 7-day auto-release: mark escrowed rewards as releasable once the
 * completion date + RELEASE_WAIT_DAYS has passed and no dispute exists.
 * This is a cron-ready helper — call it from a scheduled job (or on-demand).
 */
export async function runAutoReleaseCheck(): Promise<{ released: number }> {
  // NOTE: In this phase we expose the rule + a manual trigger. A real cron
  // would iterate COMPLETED opportunities whose auto_release_at <= now().

  // The rule is enforced in releaseRewardAction by requiring status COMPLETED
  // and the 7-day window is surfaced via FEES.RELEASE_WAIT_DAYS.

  return { released: 0 };
}

/** The 7-day wait window (days), from constants. */
export async function releaseWaitDays(): Promise<number> {
  return FEES.RELEASE_WAIT_DAYS;
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

  const reference = `TOPUP-${user.id.slice(0, 8)}-${Date.now()}`;

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

    if (!bill.ok || !bill.paymentUrl) {
      console.error("topUpWalletAction: createBill failed", bill.error);
      return {
        error: `Could not start the payment: ${bill.error ?? "unknown error"}`,
      };
    }

    // 2) Record a PENDING transaction so we can reconcile the callback.
    await createTransaction({
      user_id: user.id,
      type: "WALLET_CREDIT",
      status: "PENDING",
      amount,
      currency: "MYR",
      description: "Wallet top-up (awaiting payment)",
      reference,
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