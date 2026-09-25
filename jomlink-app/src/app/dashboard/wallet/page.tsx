import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Wallet, ArrowUpRight, ArrowDownLeft, Coins } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import {
  getTransactionsByUser,
  getPayoutsByRecipient,
  getRefundsByRecipient,
} from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/constants";
import { TopUpForm } from "./top-up-form";
import type {
  TransactionRow,
  PayoutRow,
  RefundRow,
} from "@/lib/jomlink-types";

export const metadata = { title: "Wallet · Jomlink" };

const TX_TYPE_LABEL: Record<string, string> = {
  OPPORTUNITY_FUNDING: "Opportunity funding",
  ACTIVATION_FEE: "Activation fee",
  REWARD_RELEASE: "Reward release",
  LINKER_SERVICE_FEE: "Linker service fee",
  REFUND: "Refund",
  PAYOUT: "Payout",
  WALLET_CREDIT: "Wallet top-up",
  WALLET_DEBIT: "Wallet debit",
};

function money(n: number | null | undefined) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
  }).format(Number(n ?? 0));
}

export default async function WalletPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [transactions, payouts, refunds] = await Promise.all([
    getTransactionsByUser(user.id),
    getPayoutsByRecipient(user.id),
    getRefundsByRecipient(user.id),
  ]);

  // Balance counts SETTLED money only. A top-up is created as PENDING before the
  // member is redirected to ToyyibPay, so counting it here would show funds that
  // have not actually been paid. Only COMPLETED transactions affect the balance.
  const settled = transactions.filter(
    (t: TransactionRow) => t.status === "COMPLETED"
  );

  const inAmount = settled.reduce((sum: number, t: TransactionRow) => {
    return t.type === "REFUND" ||
      t.type === "PAYOUT" ||
      t.type === "REWARD_RELEASE" ||
      t.type === "WALLET_CREDIT"
      ? sum + Number(t.amount || 0)
      : sum;
  }, 0);
  const outAmount = settled.reduce((sum: number, t: TransactionRow) => {
    return t.type === "OPPORTUNITY_FUNDING" ||
      t.type === "ACTIVATION_FEE" ||
      t.type === "LINKER_SERVICE_FEE" ||
      t.type === "WALLET_DEBIT"
      ? sum + Number(t.amount || 0)
      : sum;
  }, 0);
  const balance = inAmount - outAmount;

  // Total topped up by this member (settled only).
  const totalToppedUp = settled
    .filter((t: TransactionRow) => t.type === "WALLET_CREDIT")
    .reduce((sum: number, t: TransactionRow) => sum + Number(t.amount || 0), 0);

  // Top-ups started but not yet confirmed (awaiting ToyyibPay payment).
  const pendingTopUps = transactions
    .filter(
      (t: TransactionRow) =>
        t.type === "WALLET_CREDIT" && t.status === "PENDING"
    )
    .reduce((sum: number, t: TransactionRow) => sum + Number(t.amount || 0), 0);

  // Pending escrow: rewards funded but not yet released or refunded.
  const pendingEscrow = settled
    .filter((t: TransactionRow) => t.type === "OPPORTUNITY_FUNDING")
    .reduce((sum: number, t: TransactionRow) => sum + Number(t.amount || 0), 0);
  const pendingPayouts = payouts
    .filter((p: PayoutRow) => p.status !== "RELEASED" && p.status !== "COMPLETED")
    .reduce((sum: number, p: PayoutRow) => sum + Number(p.net_amount || 0), 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Wallet</h1>
        <p className="mt-1 text-muted-foreground">
          Track your funding, rewards, fees and refunds.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-5">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
              <Wallet className="h-4 w-4" aria-hidden="true" /> Balance
            </p>
            <p className="mt-1 text-2xl font-bold">{money(balance)}</p>
            {pendingTopUps > 0 && (
              <p className="mt-0.5 text-xs text-warning">
                {money(pendingTopUps)} top-up pending
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
              <ArrowDownLeft className="h-4 w-4 text-success" aria-hidden="true" /> In
            </p>
            <p className="mt-1 text-2xl font-bold text-success">{money(inAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
              <ArrowUpRight className="h-4 w-4 text-destructive" aria-hidden="true" /> Out
            </p>
            <p className="mt-1 text-2xl font-bold text-destructive">{money(outAmount)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
              <Coins className="h-4 w-4 text-warning" aria-hidden="true" /> Pending escrow
            </p>
            <p className="mt-1 text-2xl font-bold text-warning">{money(pendingEscrow)}</p>
            {pendingPayouts > 0 && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {money(pendingPayouts)} payout pending
              </p>
            )}
          </CardContent>
        </Card>
          </div>
        </div>

        {/* Top-up panel */}
        <div className="space-y-4">
          <Suspense fallback={<div className="h-72 animate-pulse rounded-xl bg-muted" />}>
            <TopUpForm />
          </Suspense>
          <Card>
            <CardContent className="p-5">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                <Coins className="h-4 w-4 text-primary" aria-hidden="true" /> Total topped up
              </p>
              <p className="mt-1 text-2xl font-bold">{money(totalToppedUp)}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Lifetime wallet credits
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No transactions yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {transactions.map((t: TransactionRow) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      {TX_TYPE_LABEL[t.type] ?? t.type}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {t.description ?? t.reference ?? ""}
                    </p>
                    <p className="text-xs text-muted-foreground">{formatDate(t.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold">{money(t.amount)}</p>
                    <Badge
                      variant={
                        t.status === "COMPLETED"
                          ? "success"
                          : t.status === "PENDING"
                          ? "warning"
                          : "secondary"
                      }
                    >
                      {t.status}
                    </Badge>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            {payouts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No payouts yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {payouts.map((p: PayoutRow) => (
                  <li key={p.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-semibold">{formatDate(p.created_at)}</p>
                      <p className="text-xs text-muted-foreground">
                        Fee {money(p.service_fee)} · Net {money(p.net_amount)}
                      </p>
                    </div>
                    <Badge variant={p.status === "COMPLETED" ? "success" : "warning"}>
                      {p.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Refunds</CardTitle>
          </CardHeader>
          <CardContent>
            {refunds.length === 0 ? (
              <p className="text-sm text-muted-foreground">No refunds yet.</p>
            ) : (
              <ul className="divide-y divide-border">
                {refunds.map((r: RefundRow) => (
                  <li key={r.id} className="flex items-center justify-between py-3">
                    <div>
                      <Coins className="mb-1 h-4 w-4 text-primary" aria-hidden="true" />
                      <p className="text-sm font-semibold">{money(r.amount)}</p>
                      <p className="text-xs text-muted-foreground">{r.reason}</p>
                    </div>
                    <Badge variant={r.status === "COMPLETED" ? "success" : "warning"}>
                      {r.status}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}