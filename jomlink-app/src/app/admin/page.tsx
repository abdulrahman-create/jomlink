import Link from "next/link";
import {
  Users,
  Briefcase,
  ShieldCheck,
  Scale,
  Wallet,
  ArrowRight,
  AlertTriangle,
  Clock,
  History,
} from "lucide-react";
import { requireAdmin } from "@/lib/rbac";
import {
  getAdminOverviewStats,
  listDisputes,
  listKycRecords,
  listOpportunitiesForAdmin,
  listAuditLogs,
} from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney, formatDate } from "@/lib/constants";

export default async function AdminOverviewPage() {
  await requireAdmin();

  const [stats, openDisputes, pendingKyc, recentOpps, recentAudit] = await Promise.all([
    getAdminOverviewStats(),
    listDisputes("OPEN", 5),
    listKycRecords("PENDING", 5),
    listOpportunitiesForAdmin({ limit: 5 }),
    listAuditLogs({ limit: 5 }),
  ]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Platform Administration
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Central management for members, opportunities, KYC, transactions, disputes, and compliance.
        </p>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card className="border-border bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Total Members
            </CardTitle>
            <Users className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalMembers}</div>
            <Link
              href="/admin/members"
              className="mt-2 inline-flex items-center text-xs text-primary hover:underline"
            >
              View members <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        <Card className="border-border bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Opportunities
            </CardTitle>
            <Briefcase className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOpportunities}</div>
            <Link
              href="/admin/opportunities"
              className="mt-2 inline-flex items-center text-xs text-primary hover:underline"
            >
              Review all <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        <Card className="border-border bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Pending KYC
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingKyc}</div>
            <Link
              href="/admin/kyc"
              className="mt-2 inline-flex items-center text-xs text-primary hover:underline"
            >
              Verify queue <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        <Card className="border-border bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Open Disputes
            </CardTitle>
            <Scale className="h-4 w-4 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.openDisputes}</div>
            <Link
              href="/admin/disputes"
              className="mt-2 inline-flex items-center text-xs text-primary hover:underline"
            >
              Resolve cases <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </CardContent>
        </Card>

        <Card className="border-border bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">
              Escrow In Progress
            </CardTitle>
            <Wallet className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-emerald-700">
              {formatMoney(stats.escrowHeld, "MYR")}
            </div>
            <Link
              href="/admin/transactions"
              className="mt-2 inline-flex items-center text-xs text-primary hover:underline"
            >
              Ledger view <ArrowRight className="ml-1 h-3 w-3" />
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Two Columns: Actionable Queues */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Open Disputes Queue */}
        <Card className="border-border bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <AlertTriangle className="h-4 w-4 text-rose-600" />
                Action Required: Open Disputes
              </CardTitle>
              <CardDescription>
                Disputes hold pending payouts until resolved by an administrator.
              </CardDescription>
            </div>
            <Link
              href="/admin/disputes"
              className="text-xs font-medium text-primary hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {openDisputes.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                No open disputes at this time. All connections running smoothly.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {openDisputes.map((d) => (
                  <div key={d.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm">
                        {d.opportunities?.title ?? `Dispute #${d.id.slice(0, 8)}`}
                      </span>
                      <Badge variant="destructive" className="text-[10px]">
                        {d.status}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground line-clamp-1">
                      Reason: <span className="font-medium text-foreground">{d.reason}</span>
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Raised {formatDate(d.created_at)}</span>
                      <Link
                        href="/admin/disputes"
                        className="text-primary font-medium hover:underline"
                      >
                        Inspect claim →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending KYC Queue */}
        <Card className="border-border bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Clock className="h-4 w-4 text-amber-600" />
                Verification Queue
              </CardTitle>
              <CardDescription>
                Member identity and professional status awaiting verification.
              </CardDescription>
            </div>
            <Link
              href="/admin/kyc"
              className="text-xs font-medium text-primary hover:underline"
            >
              View queue
            </Link>
          </CardHeader>
          <CardContent>
            {pendingKyc.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                No verification requests pending. Queue is clear.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {pendingKyc.map((k) => (
                  <div key={k.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm">
                        {k.users?.full_name ?? "Member"}
                      </span>
                      <Badge variant="warning" className="text-[10px]">
                        PENDING
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Document: {k.document_type || "Government ID / Passport"}
                    </p>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Submitted {formatDate(k.created_at)}</span>
                      <Link
                        href="/admin/kyc"
                        className="text-primary font-medium hover:underline"
                      >
                        Review document →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Second Row: Recent Opportunities & Recent Audit Log */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Opportunities */}
        <Card className="border-border bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Opportunities</CardTitle>
            <Link
              href="/admin/opportunities"
              className="text-xs font-medium text-primary hover:underline"
            >
              View all
            </Link>
          </CardHeader>
          <CardContent>
            {recentOpps.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                No opportunities created yet.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {recentOpps.map((o) => (
                  <div key={o.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm line-clamp-1">{o.title}</span>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {o.is_restricted_category && (
                          <Badge variant="destructive" className="text-[10px]">
                            RESTRICTED
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-[10px]">
                          {o.status}
                        </Badge>
                      </div>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Target: {o.target_entity}</span>
                      <span className="font-semibold text-foreground">
                        {formatMoney(o.offer_amount, o.currency)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Audit Trail */}
        <Card className="border-border bg-white shadow-xs">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="h-4 w-4 text-primary" />
              Recent Audit Log
            </CardTitle>
            <Link
              href="/admin/audit-logs"
              className="text-xs font-medium text-primary hover:underline"
            >
              Full log
            </Link>
          </CardHeader>
          <CardContent>
            {recentAudit.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">
                No administrative actions logged yet.
              </p>
            ) : (
              <div className="divide-y divide-border">
                {recentAudit.map((a) => (
                  <div key={a.id} className="py-3 first:pt-0 last:pb-0 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold font-mono text-primary">
                        {a.action}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {formatDate(a.created_at)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-muted-foreground">
                      <span>Entity: {a.entity} {a.entity_id ? `(#${a.entity_id.slice(0, 8)})` : ""}</span>
                      <span className="text-[11px]">By: {a.users?.full_name || "Admin"}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

