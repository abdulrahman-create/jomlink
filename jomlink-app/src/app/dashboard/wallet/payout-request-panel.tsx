"use client";

import * as React from "react";
import { useActionState } from "react";
import { Banknote, Loader2, Landmark, CheckCircle2, ShieldAlert } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  updateBankDetailsAction,
  requestPayoutAction,
  type PayoutState,
} from "@/app/actions/payouts";

const initialState: PayoutState = {};

function money(n: number | null | undefined) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
  }).format(Number(n ?? 0));
}

/**
 * Bank payout panel for the wallet. Two steps:
 *   1. Save the member's bank account (bank name / account no / holder).
 *   2. Request a withdrawal of the available balance to that account.
 * The request is queued for an administrator to transfer.
 */
export function PayoutRequestPanel({
  balance,
  bankName,
  bankAccountNo,
  bankAccountName,
  pendingRequestAmount,
  kycVerified,
}: {
  balance: number;
  bankName: string | null;
  bankAccountNo: string | null;
  bankAccountName: string | null;
  pendingRequestAmount: number | null;
  /** §11.9.2 rule 2 — money-out requires a verified identity. */
  kycVerified: boolean;
}) {
  const [bankState, bankAction, bankPending] = useActionState<
    PayoutState,
    FormData
  >(updateBankDetailsAction, initialState);
  const [payState, payAction, payPending] = useActionState<
    PayoutState,
    FormData
  >(requestPayoutAction, initialState);

  const hasBank = !!(bankName && bankAccountNo && bankAccountName);
  const hasPending = pendingRequestAmount != null && pendingRequestAmount > 0;

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Banknote className="h-4 w-4 text-primary" aria-hidden="true" /> Withdraw to bank
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Bank details */}
        <form action={bankAction} className="space-y-3">
          <p className="flex items-center gap-1.5 text-sm font-semibold">
            <Landmark className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            Bank account
          </p>
          <div className="space-y-2">
            <Label htmlFor="bankName">Bank name *</Label>
            <Input
              id="bankName"
              name="bankName"
              placeholder="e.g. Maybank"
              defaultValue={bankName ?? ""}
              required
            />
            {bankState?.fieldErrors?.bankName && (
              <p className="text-xs text-destructive">{bankState.fieldErrors.bankName[0]}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="bankAccountNo">Account number *</Label>
            <Input
              id="bankAccountNo"
              name="bankAccountNo"
              inputMode="numeric"
              placeholder="e.g. 1234567890"
              defaultValue={bankAccountNo ?? ""}
              required
            />
            {bankState?.fieldErrors?.bankAccountNo && (
              <p className="text-xs text-destructive">
                {bankState.fieldErrors.bankAccountNo[0]}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="bankAccountName">Account holder name *</Label>
            <Input
              id="bankAccountName"
              name="bankAccountName"
              placeholder="As printed on the account"
              defaultValue={bankAccountName ?? ""}
              required
            />
            {bankState?.fieldErrors?.bankAccountName && (
              <p className="text-xs text-destructive">
                {bankState.fieldErrors.bankAccountName[0]}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button type="submit" variant="outline" size="sm" disabled={bankPending}>
              {bankPending ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : null}
              {hasBank ? "Update bank details" : "Save bank details"}
            </Button>
            {bankState?.success && (
              <span className="flex items-center gap-1 text-xs text-success">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                {bankState.message}
              </span>
            )}
          </div>
          {bankState?.error && (
            <p className="text-xs text-destructive">{bankState.error}</p>
          )}
        </form>

        <div className="border-t border-border pt-4">
          {/* Withdrawal request */}
          <form action={payAction} className="space-y-3">
            <p className="text-sm font-semibold">Request a withdrawal</p>
            <p className="text-xs text-muted-foreground">
              Available to withdraw: <strong>{money(balance)}</strong>. An
              administrator will transfer the amount to your bank account.
            </p>
            {!kycVerified && (
              <div className="flex items-start gap-2 rounded-md bg-warning/15 px-3 py-2 text-xs text-warning">
                <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>
                  Identity verification is required before you can withdraw.
                  Submit your document under{" "}
                  <Link href="/dashboard/kyc" className="font-semibold underline">
                    Verification
                  </Link>{" "}
                  and wait for approval.
                </span>
              </div>
            )}
            {hasPending ? (
              <p className="flex items-center gap-1.5 rounded-md bg-warning-bg px-3 py-2 text-xs text-warning">
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                {money(pendingRequestAmount)} withdrawal awaiting payment.
              </p>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (MYR) *</Label>
                  <Input
                    id="amount"
                    name="amount"
                    type="number"
                    min={1}
                    step="0.01"
                    max={balance}
                    placeholder={String(balance)}
                    required
                  />
                  {payState?.fieldErrors?.amount && (
                    <p className="text-xs text-destructive">
                      {payState.fieldErrors.amount[0]}
                    </p>
                  )}
                </div>
                <Button
                  type="submit"
                  size="sm"
                  disabled={payPending || !hasBank || !kycVerified || balance <= 0}
                >
                  {payPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Banknote className="h-4 w-4" aria-hidden="true" />
                  )}
                  Request withdrawal
                </Button>
                {!hasBank && (
                  <p className="text-xs text-muted-foreground">
                    Save your bank details above before requesting a withdrawal.
                  </p>
                )}
                {payState?.error && (
                  <p className="text-xs text-destructive">{payState.error}</p>
                )}
                {payState?.success && (
                  <p className="flex items-center gap-1 text-xs text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    {payState.message}
                  </p>
                )}
              </>
            )}
          </form>
        </div>
      </CardContent>
    </Card>
  );
}
