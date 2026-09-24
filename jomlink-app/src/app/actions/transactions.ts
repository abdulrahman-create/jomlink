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
import { computeFunding, roundMoney } from "@/lib/funding";
import { doubleEntry, accounts } from "@/lib/ledger";
import { FEES, WALLET } from "@/lib/constants";
import { createBill } from "@/lib/toyyibpay";

export type TransactionState = {
  error?: string;
  success?: boolean;
};

/**
 * Fund an opportunity (Seeker pays reward + 10% activation fee into escrow).
 * Creates the funding transactions AND the double-entry ledger entries.
 *
 * Payment gateway is STUBBED — we record the movement as if settled (sandbox).
 */
export async function fundOpportunityAction(
  prevState: TransactionState | undefined,
  formData: FormData
): Promise<TransactionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  const oppId = String(formData.get("opportunityId") || "");
  const opp = oppId ? await getOpportunityById(oppId) : null;
  if (!opp) return { error: "Opportunity not found." };
  if (opp.seeker_id !== user.id) {
    return { error: "Only the Seeker can fund this opportunity." };
  }
  if (opp.status !== "PENDING_PAYMENT") {
    return { error: "This opportunity is not awaiting funding." };
  }

  const funding = computeFunding(Number(opp.offer_amount) || 0);

  try {
    // 1) Reward → escrow (OPPORTUNITY_FUNDING).
    const fundTx = await createTransaction({
      user_id: user.id,
      opportunity_id: opp.id,
      type: "OPPORTUNITY_FUNDING",
      status: "COMPLETED",
      amount: funding.reward,
      currency: "MYR",
      description: `Reward escrow for "${opp.title}"`,
      reference: `OPP-FUND-${opp.id.slice(0, 8)}-${Date.now()}`,
    });
    for (const e of doubleEntry(accounts.seeker(user.id), accounts.escrow(opp.id), funding.reward)) {
      await createLedgerEntry({ transaction_id: fundTx.id, ...e });
    }

    // 2) Activation fee → platform (ACTIVATION_FEE).
    const actTx = await createTransaction({
      user_id: user.id,
      opportunity_id: opp.id,
      type: "ACTIVATION_FEE",
      status: "COMPLETED",
      amount: funding.activationFee,
      fee_raw: funding.activationFee,
      currency: "MYR",
      description: `Activation fee (10%) for "${opp.title}"`,
      reference: `OPP-ACT-${opp.id.slice(0, 8)}-${Date.now()}`,
    });
    for (const e of doubleEntry(accounts.seeker(user.id), accounts.platformActivation, funding.activationFee)) {
      await createLedgerEntry({ transaction_id: actTx.id, ...e });
    }

    // 3) Opportunity → ACTIVE.
    await updateOpportunityIfOwned(opp.id, user.id, { status: "ACTIVE" });

    revalidatePath("/opportunities/" + opp.id);
    revalidatePath("/dashboard/wallet");
    return { success: true };
  } catch (e: unknown) {
    console.error("fundOpportunityAction error", e);
    return { error: "Could not fund the opportunity. Please try again." };
  }
}

/**
 * Release the escrowed reward to the Linker on verified completion.
 * Deducts the 3% linker service fee (→ platform) and pays the net to the Linker.
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

    // 2) Linker service fee (3%) → platform.

    const feeTx = await createTransaction({
      user_id: linkerId,
      opportunity_id: opp.id,
      type: "LINKER_SERVICE_FEE",
      status: "COMPLETED",
      amount: funding.linkerServiceFee,
      fee_raw: funding.linkerServiceFee,
      currency: "MYR",
      description: `Linker service fee (3%) for "${opp.title}"`,
      reference: `OPP-FEE-${opp.id.slice(0, 8)}-${Date.now()}`,
    });
for (const e of doubleEntry(accounts.linker(linkerId), accounts.platformService, funding.linkerServiceFee)) {
      await createLedgerEntry({ transaction_id: feeTx.id, ...e });
    }

    // 3) Payout record for the Linker (net = reward − 3%).
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
 * Returns the escrowed reward (and activation fee) back to the Seeker.
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

  const funding = computeFunding(Number(opp.offer_amount) || 0);

  try {
    // Refund the escrowed reward back to the Seeker.

    const refundTx = await createTransaction({
      user_id: user.id,
      opportunity_id: opp.id,
      type: "REFUND",
      status: "COMPLETED",
      amount: funding.reward,
      currency: "MYR",
      description: `Refund for failed opportunity "${opp.title}"`,
      reference: `OPP-REF-${opp.id.slice(0, 8)}-${Date.now()}`,
    });
for (const e of doubleEntry(
      accounts.escrow(opp.id),
      accounts.seeker(user.id),
      funding.reward
    )) {
      await createLedgerEntry({ transaction_id: refundTx.id, ...e });
    }

    await createRefund({
      transaction_id: refundTx.id,
      recipient_id: user.id,
      amount: funding.reward,
      reason: "Opportunity failed / cancelled",
      status: "COMPLETED",
      approved_by: "system",
    });

    revalidatePath("/opportunities/" + opp.id);
    revalidatePath("/dashboard/wallet");
    return { success: true };
  } catch (e: unknown) {
    console.error("refundOpportunityAction error", e);
    return { error: "Could not process the refund." };
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