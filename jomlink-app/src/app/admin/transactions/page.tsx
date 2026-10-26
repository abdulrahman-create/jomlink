import Link from "next/link";
import { requireAdmin } from "@/lib/rbac";
import {
  listAllTransactionsAdmin,
  listAllPayoutsAdmin,
  listAllRefundsAdmin,
  listPendingPayoutRequestsAdmin,
} from "@/lib/queries";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney, formatDate } from "@/lib/constants";
import { MarkPayoutPaidButton } from "./mark-paid-button";

export default async function AdminTransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireAdmin("finance:read");
  const { tab = "transactions" } = await searchParams;

  const [transactions, payouts, refunds, payoutRequests] = await Promise.all([
    listAllTransactionsAdmin(50),
    listAllPayoutsAdmin(50),
    listAllRefundsAdmin(50),
    listPendingPayoutRequestsAdmin(100),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Financials, Escrow & Ledger
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor escrow balances, double-entry ledger transactions, linker payouts, and refunds.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border">
        <Link
          href="/admin/transactions?tab=transactions"
          className={`pb-3 text-sm font-semibold transition-colors border-b-2 px-1 ${
            tab === "transactions"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Transactions ({transactions.length})
        </Link>
        <Link
          href="/admin/transactions?tab=payouts"
          className={`pb-3 text-sm font-semibold transition-colors border-b-2 px-1 ${
            tab === "payouts"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Payouts ({payouts.length})
        </Link>
        <Link
          href="/admin/transactions?tab=requests"
          className={`pb-3 text-sm font-semibold transition-colors border-b-2 px-1 ${
            tab === "requests"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Withdrawal requests ({payoutRequests.length})
        </Link>
        <Link
          href="/admin/transactions?tab=refunds"
          className={`pb-3 text-sm font-semibold transition-colors border-b-2 px-1 ${
            tab === "refunds"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Refunds ({refunds.length})
        </Link>
      </div>

      {tab === "transactions" && (
        <Card className="border-border bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-slate-50/75 text-xs text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono text-xs">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground font-sans">
                      No transactions recorded.
                    </td>
                  </tr>
                ) : (
                  transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap font-sans">
                        {formatDate(t.created_at)}
                      </td>
                      <td className="px-4 py-3 font-sans text-xs">
                        <span className="font-semibold text-foreground">
                          {t.users?.full_name || "Unknown"}
                        </span>
                        <span className="block text-[11px] text-muted-foreground">
                          {t.users?.email}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px]">
                          {t.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {formatMoney(t.amount, t.currency || "MYR")}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={t.status === "COMPLETED" ? "success" : "secondary"}
                          className="text-[10px]"
                        >
                          {t.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-sans text-xs text-muted-foreground max-w-xs truncate">
                        {t.description || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "payouts" && (
        <Card className="border-border bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-slate-50/75 text-xs text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Recipient</th>
                  <th className="px-4 py-3">Gross Amount</th>
                  <th className="px-4 py-3">Service Fee</th>
                  <th className="px-4 py-3">Net Payout</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {payouts.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No payouts recorded yet.
                    </td>
                  </tr>
                ) : (
                  payouts.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {formatDate(p.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-foreground">
                          {p.users?.full_name || "Linker"}
                        </span>
                        <span className="block text-[11px] text-muted-foreground">
                          {p.users?.email}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono">
                        {formatMoney(p.amount, "MYR")}
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground">
                        {formatMoney(p.service_fee, "MYR")}
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-emerald-700">
                        {formatMoney(p.net_amount, "MYR")}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="success" className="text-[10px]">
                          {p.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "requests" && (
        <Card className="border-border bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-slate-50/75 text-xs text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Requested</th>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Bank Account</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {payoutRequests.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No pending withdrawal requests.
                    </td>
                  </tr>
                ) : (
                  payoutRequests.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {formatDate(p.requested_at ?? p.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-foreground">
                          {p.users?.full_name || "Member"}
                        </span>
                        <span className="block text-[11px] text-muted-foreground">
                          {p.users?.email}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-foreground">
                        {formatMoney(p.net_amount, "MYR")}
                      </td>
                      <td className="px-4 py-3">
                        {p.bank ? (
                          <>
                            <span className="font-semibold text-foreground">
                              {p.bank.bank_name}
                            </span>
                            <span className="block text-[11px] text-muted-foreground">
                              {p.bank.bank_account_no} · {p.bank.bank_account_name}
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">No bank details</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="warning" className="text-[10px]">
                          {p.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <MarkPayoutPaidButton payoutId={p.id} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {tab === "refunds" && (
        <Card className="border-border bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-slate-50/75 text-xs text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Recipient</th>
                  <th className="px-4 py-3">Amount Refunded</th>
                  <th className="px-4 py-3">Reason</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-xs">
                {refunds.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No refunds recorded.
                    </td>
                  </tr>
                ) : (
                  refunds.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {formatDate(r.created_at)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-foreground">
                          {r.users?.full_name || "Seeker"}
                        </span>
                        <span className="block text-[11px] text-muted-foreground">
                          {r.users?.email}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono font-bold text-rose-700">
                        {formatMoney(r.amount, "MYR")}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {r.reason || "Dispute / Cancellation Refund"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-[10px]">
                          {r.status}
                        </Badge>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

