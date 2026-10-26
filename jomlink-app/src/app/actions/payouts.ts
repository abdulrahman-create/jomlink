"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  getWalletBalance,
  updateBankDetails,
  getUserById,
  getPayoutsByRecipient,
  createPayout,
  createTransaction,
  isKycSatisfiedForPayout,
} from "@/lib/queries";
import { recordAuditLog, AUDIT_ACTIONS } from "@/lib/audit";
import { notify } from "@/lib/notify";
import { formatMYR } from "@/lib/constants";

export type PayoutState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  success?: boolean;
  message?: string;
};

// ── Bank details ────────────────────────────────────────────
const BankDetailsSchema = z.object({
  bankName: z.string().trim().min(2, "Enter your bank name").max(120),
  bankAccountNo: z
    .string()
    .trim()
    .min(6, "Enter a valid account number")
    .max(40)
    // Digits (with optional spaces/dashes) only — no letters.
    .regex(/^[0-9 -]+$/, "Account number may contain digits, spaces and dashes only"),
  bankAccountName: z
    .string()
    .trim()
    .min(2, "Enter the account holder name")
    .max(120),
});

export async function updateBankDetailsAction(
  prevState: PayoutState | undefined,
  formData: FormData
): Promise<PayoutState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  const parsed = BankDetailsSchema.safeParse({
    bankName: formData.get("bankName"),
    bankAccountNo: formData.get("bankAccountNo"),
    bankAccountName: formData.get("bankAccountName"),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await updateBankDetails(user.id, {
      bank_name: parsed.data.bankName,
      bank_account_no: parsed.data.bankAccountNo,
      bank_account_name: parsed.data.bankAccountName,
    });
    revalidatePath("/dashboard/wallet");
    return { success: true, message: "Bank details saved." };
  } catch (e: unknown) {
    console.error("updateBankDetailsAction error", e);
    return { error: "Could not save your bank details. Please try again." };
  }
}

// ── Withdrawal request ──────────────────────────────────────
// Members withdraw their available (settled) wallet balance to their saved bank
// account. The request is recorded as a PENDING payout row; an admin settles it
// (flips to PAID + pays out). We do NOT debit the wallet here — the balance is
// debited at settlement via a WITHDRAWAL transaction, so an un-actioned request
// never silently drains the wallet.
const WithdrawSchema = z.object({
  amount: z.coerce
    .number()
    .positive("Enter an amount to withdraw")
    .max(1_000_000_000),
});

export async function requestPayoutAction(
  prevState: PayoutState | undefined,
  formData: FormData
): Promise<PayoutState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  const parsed = WithdrawSchema.safeParse({ amount: formData.get("amount") });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const amount = Math.round((parsed.data.amount + Number.EPSILON) * 100) / 100;

  // Bank details must be on file before a transfer can be made. These live on
  // the user row and are not part of the normalized `getCurrentUser()` shape.
  const row = await getUserById(user.id);
  if (!row?.bank_name || !row?.bank_account_no || !row?.bank_account_name) {
    return {
      error:
        "Add your bank account details first — an administrator needs them to transfer the payout.",
    };
  }

  // §11.9.2 rule 2 — KYC-before-payout. Identity verification is a hard
  // precondition for money-out, so refuse the REQUEST up front instead of
  // queuing work that the settlement screen would only block later. The
  // authoritative check still runs at settlement (`markPayoutPaidAction`);
  // this is the member-facing early warning.
  //
  // `isKycSatisfiedForPayout` honours the dev/test bypass
  // (`KYC_DEV_BYPASS=true`), which is impossible to enable in production.
  if (!(await isKycSatisfiedForPayout(user.id))) {
    await recordAuditLog({
      adminId: null,
      action: AUDIT_ACTIONS.PAYOUT_SCREEN_BLOCKED,
      entity: "USER",
      entityId: user.id,
      details: {
        stage: "request",
        code: "KYC_NOT_VERIFIED",
        userId: user.id,
        email: user.email,
        amount,
      },
    });
    return {
      error:
        "Verify your identity before withdrawing. Payouts require a verified account — submit your identity document under Verification and wait for approval.",
    };
  }

  const balance = await getWalletBalance(user.id);
  if (amount > balance) {
    return {
      error: `You can withdraw up to ${formatMYR(
        balance
      )}. Your requested ${formatMYR(amount)} exceeds your available balance.`,
    };
  }

  // One open request at a time — a second pending request would double-count.
  const existing = await getPayoutsByRecipient(user.id);
  if (
    existing.some(
      (p: { status: string; method: string | null }) =>
        p.status === "PENDING" && p.method === "BANK_TRANSFER"
    )
  ) {
    return {
      error:
        "You already have a withdrawal request awaiting payment. It will be processed by an administrator.",
    };
  }

  try {
    // The payout row carries the request. `transaction_id` is not null in the
    // schema, so we create a PENDING WITHDRAWAL transaction as the anchor and
    // link the two. The transaction is only COMPLETED at admin settlement.
    const tx = await createTransaction({
      user_id: user.id,
      type: "WITHDRAWAL",
      status: "PENDING",
      amount,
      currency: "MYR",
      description: "Bank withdrawal request",
      reference: `WD-REQ-${user.id.slice(0, 8)}-${Date.now()}`,
    });

    await createPayout({
      transaction_id: tx.id,
      recipient_id: user.id,
      amount,
      service_fee: 0,
      net_amount: amount,
      method: "BANK_TRANSFER",
      status: "PENDING",
      requested_at: new Date().toISOString(),
      note: "Member withdrawal request",
    });

    await recordAuditLog({
      adminId: null,
      action: AUDIT_ACTIONS.PAYOUT_REQUESTED,
      entity: "PAYOUT",
      entityId: tx.id,
      details: { userId: user.id, amount, email: user.email },
    });

    // Let admins know a payout is waiting.
    await notify({
      userId: user.id,
      type: "PAYOUT_REQUESTED",
      title: "Withdrawal request received",
      body: `Your request to withdraw ${formatMYR(
        amount
      )} to your bank account is being reviewed.`,
      data: { amount },
    });

    revalidatePath("/dashboard/wallet");
    revalidatePath("/admin/transactions");
    return {
      success: true,
      message: `Withdrawal request for ${formatMYR(
        amount
      )} submitted. An administrator will transfer it to your bank account.`,
    };
  } catch (e: unknown) {
    console.error("requestPayoutAction error", e);
    return { error: "Could not submit your withdrawal request. Please try again." };
  }
}
