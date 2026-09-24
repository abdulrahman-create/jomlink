"use client";

import * as React from "react";
import { useActionState } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2, Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { WALLET } from "@/lib/constants";
import {
  topUpWalletAction,
  type TransactionState,
} from "@/app/actions/transactions";

const initialState: TransactionState = {};

/** Messages shown after returning from the ToyyibPay payment page. */
const PAYMENT_MESSAGES: Record<
  string,
  { tone: "success" | "warning" | "error"; text: string }
> = {
  success: { tone: "success", text: "Payment received. Your wallet has been topped up." },
  pending: {
    tone: "warning",
    text: "Payment is still pending confirmation. Your balance will update once it clears.",
  },
  failed: { tone: "error", text: "Payment was not completed. No funds were added." },
  unknown: { tone: "error", text: "We could not match that payment to a top-up." },
  error: { tone: "error", text: "Something went wrong confirming your payment." },
};

/**
 * Wallet top-up form. Preset chips fill the amount field; the form posts to the
 * `topUpWalletAction` server action, which creates a ToyyibPay bill and
 * redirects the member to the hosted payment page.
 */
export function TopUpForm() {
  const [state, action, pending] = useActionState<TransactionState, FormData>(
    topUpWalletAction,
    initialState
  );
  const [amount, setAmount] = React.useState("");
  const searchParams = useSearchParams();
  const payment = searchParams.get("payment");
  const paymentMessage = payment ? PAYMENT_MESSAGES[payment] : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Wallet className="h-4 w-4 text-primary" aria-hidden="true" /> Top up wallet
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          {paymentMessage && (
            <p
              role={paymentMessage.tone === "success" ? "status" : "alert"}
              className={
                paymentMessage.tone === "success"
                  ? "rounded-md bg-success-bg px-3 py-2 text-sm text-success"
                  : paymentMessage.tone === "warning"
                  ? "rounded-md bg-warning-bg px-3 py-2 text-sm text-warning"
                  : "rounded-md bg-destructive-bg px-3 py-2 text-sm text-destructive"
              }
            >
              {paymentMessage.text}
            </p>
          )}

          {state?.error && (
            <p
              role="alert"
              className="rounded-md bg-destructive-bg px-3 py-2 text-sm text-destructive"
            >
              {state.error}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            {WALLET.TOPUP_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setAmount(String(preset))}
                className="rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-primary-soft hover:text-primary"
              >
                RM{preset}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <Label htmlFor="topup-amount">Amount (MYR)</Label>
            <Input
              id="topup-amount"
              name="amount"
              type="number"
              inputMode="decimal"
              min={WALLET.TOPUP_MIN}
              max={WALLET.TOPUP_MAX}
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder={`${WALLET.TOPUP_MIN}.00`}
            />
            <p className="text-xs text-muted-foreground">
              Min RM{WALLET.TOPUP_MIN.toFixed(2)} · Max RM
              {WALLET.TOPUP_MAX.toFixed(2)}. You&apos;ll be redirected to ToyyibPay
              to pay by FPX or card.
            </p>
          </div>

          <Button type="submit" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />{" "}
                Redirecting…
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" aria-hidden="true" /> Continue to payment
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

