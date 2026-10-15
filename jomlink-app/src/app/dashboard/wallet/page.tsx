import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Wallet, ArrowUpRight, ArrowDownLeft, Coins, Clock } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import {
  getTransactionsByUser,
  getPayoutsByRecipient,
  getRefundsByRecipient,
  getConnectionsByUser,
  getConnectionsForSeeker,
  getUserById,
} from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/constants";
import { computeFunding } from "@/lib/funding";
import { TopUpForm } from "./top-up-form";
import { PayoutRequestPanel } from "./payout-request-panel";
import type {
  TransactionRow,
  PayoutRow,
  RefundRow,
} from "@/lib/jomlink-types";

export const metadata = { title: "Wallet · Jomlink" };

const TX_TYPE_LABEL: Record<string, string> = {
  OPPORTUNITY_FUNDING: "Reward escrow",
  POSTING_DEPOSIT: "Posting deposit",
  LISTING_FEE: "Listing fee",
  ACTIVATION_FEE: "Activation fee",
  REWARD_RELEASE: "Reward release",
  LINKER_SERVICE_FEE: "Linker service fee",
  REFUND: "Refund",
  PAYOUT: "Payout",
  WALLET_CREDIT: "Wallet top-up",
  WALLET_DEBIT: "Wallet debit",
  WITHDRAWAL: "Bank withdrawal",
};

function money(n: number | null | undefined) {
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
  }).format(Number(n ?? 0));
}

// Money IN = funds arriving in the member's wallet.
const MONEY_IN = new Set([
  "REFUND",
  "PAYOUT",
  "REWARD_RELEASE",
  "WALLET_CREDIT",
]);

// Classify a transaction for colour-coding and the +/− sign.
// PENDING is shown separately (amber) regardless of direction because the money
// has not actually settled yet.
function txDirection(
  t: TransactionRow
): "in" | "out" | "pending" {
  if (t.status === "PENDING") return "pending";
  return MONEY_IN.has(t.type) ? "in" : "out";
}

export default async function WalletPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const [transactions, payouts, refunds, myConnections, seekerConnections, userRow] = await Promise.all([
    getTransactionsByUser(user.id),
    getPayoutsByRecipient(user.id),
    getRefundsByRecipient(user.id),
    getConnectionsByUser(user.id),
    getConnectionsForSeeker(user.id),
    getUserById(user.id),
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
      t.type === "POSTING_DEPOSIT" ||
      t.type === "LISTING_FEE" ||
      t.type === "ACTIVATION_FEE" ||
      t.type === "LINKER_SERVICE_FEE" ||
      t.type === "WALLET_DEBIT" ||
      t.type === "WITHDRAWAL"
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

  // Pending escrow (Seeker side): the reward of each funded connection that has
  // NOT yet left escrow. This is derived from the connection's `release_status`
  // — the same source of truth the Linker side uses — rather than from the
  // all-time `OPPORTUNITY_FUNDING` transactions. Those funding rows are written
  // once, at funding time, and never updated on release, so summing them made
  // the tile show "pending forever" even after the reward had been released.
  const heldEscrowConnections = (
    seekerConnections as {
      status?: string | null;
      release_status?: string | null;
      agreed_reward?: number | null;
      opportunities?: { offer_amount?: number | null } | null;
    }[]
  ).filter((c) => {
    const rs = (c.release_status ?? "").toUpperCase();
    // Still held: not yet released, not refunded, not void, and not frozen by a
    // dispute. A FAILED connection is refunded (VOID) so it is excluded too.
    return (
      c.status !== "DISPUTED" &&
      c.status !== "FAILED" &&
      rs !== "RELEASED" &&
      rs !== "REFUNDED" &&
      rs !== "VOID" &&
      rs !== "HELD"
    );
  });
  const pendingEscrow = heldEscrowConnections.reduce((sum, c) => {
    const reward = Number(c.agreed_reward ?? c.opportunities?.offer_amount ?? 0);
    return sum + computeFunding(reward).reward;
  }, 0);
  const pendingPayouts = payouts
    .filter((p: PayoutRow) => p.status !== "RELEASED" && p.status !== "COMPLETED")
    .reduce((sum: number, p: PayoutRow) => sum + Number(p.net_amount || 0), 0);

  // Linker earnings awaiting release. A Linker is paid the escrowed reward of
  // each connection they won, less the platform service fee. Those figures are
  // not yet `payouts` rows (a payout is only created at release), so sum them
  // from the connections themselves and note the next scheduled release date.
  // This is what lets a Linker see "how much I will receive, and when".
  const incomingConnections = (
    myConnections as {
      status?: string | null;
      release_status?: string | null;
      agreed_reward?: number | null;
      auto_release_at?: string | null;
      opportunities?: { offer_amount?: number | null } | null;
    }[]
  ).filter((c) => {
    const rs = (c.release_status ?? "").toUpperCase();
    // Only money still on its way: not yet released, not refunded, not void,
    // and no open dispute holding it.
    return (
      c.status !== "DISPUTED" &&
      c.status !== "FAILED" &&
      rs !== "RELEASED" &&
      rs !== "REFUNDED" &&
      rs !== "VOID" &&
      rs !== "HELD"
    );
  });
  const incomingPayoutTotal = incomingConnections.reduce((sum, c) => {
    const reward = Number(c.agreed_reward ?? c.opportunities?.offer_amount ?? 0);
    return sum + computeFunding(reward).linkerPayout;
  }, 0);
  const nextReleaseAt = incomingConnections
    .map((c) => c.auto_release_at)
    .filter((d): d is string => !!d)
    .sort()[0] ?? null;

  // A pending bank-withdrawal request (if any) awaiting admin payment. The
  // wallet is debited only at settlement, so this is displayed separately from
  // the balance rather than subtracted from it.
  const pendingRequest = (payouts as PayoutRow[]).find(
    (p) => p.status === "PENDING" && p.method === "BANK_TRANSFER"
  );
  const pendingRequestAmount = pendingRequest ? Number(pendingRequest.net_amount) : null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Wallet</h1>
        <p className="mt-1 text-muted-foreground">
          Track your funding, rewards, fees and refunds.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left (2/3): the money the member cares about first — balance +
            withdraw, so the withdrawal panel sits above the fold instead of
            being buried at the bottom of a tall right-hand column. */}
        <div className="space-y-4 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="min-w-0 overflow-hidden">
              <CardContent className="min-w-0 p-5">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                  <Wallet className="h-4 w-4 shrink-0" aria-hidden="true" /> Balance
                </p>
                <p className="mt-1 text-xl font-bold tabular-nums leading-tight break-words sm:text-2xl">
                  {money(balance)}
                </p>
                {pendingTopUps > 0 && (
                  <p className="mt-0.5 text-xs text-warning">
                    {money(pendingTopUps)} top-up pending
                  </p>
                )}
              </CardContent>
            </Card>
            <Card className="min-w-0 overflow-hidden">
              <CardContent className="min-w-0 p-5">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                  <Coins className="h-4 w-4 shrink-0 text-warning" aria-hidden="true" /> Pending escrow
                </p>
                <p className="mt-1 text-xl font-bold tabular-nums leading-tight break-words text-warning sm:text-2xl">
                  {money(pendingEscrow)}
                </p>
                {pendingPayouts > 0 && (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {money(pendingPayouts)} payout pending
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Withdraw to bank — promoted under the balance so it is visible
              without scrolling. */}
          <PayoutRequestPanel
            balance={balance}
            bankName={userRow?.bank_name ?? null}
            bankAccountNo={userRow?.bank_account_no ?? null}
            bankAccountName={userRow?.bank_account_name ?? null}
            pendingRequestAmount={pendingRequestAmount}
          />
        </div>

        {/* Right (1/3): top-up + secondary stat tiles. */}
        <div className="space-y-4">
          <Suspense fallback={<div className="h-72 animate-pulse rounded-xl bg-muted" />}>
            <TopUpForm />
          </Suspense>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
            <Card className="min-w-0 overflow-hidden">
              <CardContent className="min-w-0 p-5">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                  <Coins className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> Total topped up
                </p>
                <p className="mt-1 text-xl font-bold tabular-nums leading-tight break-words sm:text-2xl">
                  {money(totalToppedUp)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Lifetime wallet credits
                </p>
              </CardContent>
            </Card>
            <Card className="min-w-0 overflow-hidden">
              <CardContent className="min-w-0 p-5">
                <p className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                  <Clock className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" /> Incoming payouts
                </p>
                <p className="mt-1 text-xl font-bold tabular-nums leading-tight break-words text-primary sm:text-2xl">
                  {money(incomingPayoutTotal)}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {incomingPayoutTotal > 0
                    ? nextReleaseAt
                      ? `Net of service fee · next release ${formatDate(nextReleaseAt)}`
                      : "Net of service fee · releases when work is verified complete"
                    : "No rewards awaiting release"}
                </p>
              </CardContent>
            </Card>
          </div>
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
              {transactions.map((t: TransactionRow) => {
                const dir = txDirection(t);
                const tone =
                  dir === "in"
                    ? {
                        accent: "border-l-success",
                        text: "text-success",
                        sign: "+",
                        badge: "success" as const,
                      }
                    : dir === "out"
                    ? {
                        accent: "border-l-destructive",
                        text: "text-destructive",
                        sign: "−",
                        badge: "secondary" as const,
                      }
                    : {
                        accent: "border-l-warning",
                        text: "text-warning",
                        sign: "",
                        badge: "warning" as const,
                      };
                const Icon =
                  dir === "in"
                    ? ArrowDownLeft
                    : dir === "out"
                    ? ArrowUpRight
                    : Clock;
                return (
                  <li
                    key={t.id}
                    className={`flex items-center justify-between gap-3 border-l-2 py-3 pl-3 ${tone.accent}`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted ${tone.text}`}
                        aria-hidden="true"
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {TX_TYPE_LABEL[t.type] ?? t.type}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {t.description ?? t.reference ?? ""}
                        </p>
                        <p className="text-xs text-muted-foreground">{formatDate(t.created_at)}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className={`text-sm font-semibold tabular-nums ${tone.text}`}>
                        {tone.sign}
                        {money(t.amount)}
                      </p>
                      <Badge variant={tone.badge}>{t.status}</Badge>
                    </div>
                  </li>
                );
              })}
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
                {payouts.map((p: PayoutRow) => {
                  const isWithdrawal = p.method === "BANK_TRANSFER" && Number(p.service_fee) === 0;
                  const done = p.status === "COMPLETED" || p.status === "PAID" || p.status === "RELEASED";
                  return (
                    <li key={p.id} className="flex items-center justify-between py-3">
                      <div>
                        <p className="text-sm font-semibold">
                          {isWithdrawal ? "Bank withdrawal" : "Reward payout"} ·{" "}
                          {formatDate(p.requested_at ?? p.created_at)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isWithdrawal
                            ? `Amount ${money(p.net_amount)}`
                            : `Fee ${money(p.service_fee)} · Net ${money(p.net_amount)}`}
                          {done && p.released_at ? ` · paid ${formatDate(p.released_at)}` : ""}
                        </p>
                      </div>
                      <Badge variant={done ? "success" : "warning"}>{p.status}</Badge>
                    </li>
                  );
                })}
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