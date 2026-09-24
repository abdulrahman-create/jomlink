import Link from "next/link";
import { Scale, AlertTriangle, CheckCircle, ExternalLink, ShieldAlert, FileText } from "lucide-react";
import { requireAdmin } from "@/lib/rbac";
import { listDisputes } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney, formatDate } from "@/lib/constants";
import {
  updateDisputeStatusAction,
  resolveDisputeAction,
} from "@/app/actions/disputes";

export default async function AdminDisputesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const admin = await requireAdmin("disputes:read");
  const { status } = await searchParams;

  const disputes = await listDisputes(status ?? "ALL", 50);
  const canResolve = admin.can("disputes:resolve");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Dispute Management
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Investigate contested connections, freeze escrow payments, and enforce resolutions.
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {disputes.length} disputes listed
        </Badge>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-border">
        {["ALL", "OPEN", "UNDER_REVIEW", "RESOLVED"].map((st) => (
          <Link
            key={st}
            href={`/admin/disputes${st === "ALL" ? "" : `?status=${st}`}`}
            className={`pb-3 text-sm font-semibold transition-colors border-b-2 px-2 ${
              (status ?? "ALL") === st
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {st.replace(/_/g, " ")}
          </Link>
        ))}
      </div>

      {/* Dispute Cards */}
      <div className="space-y-4">
        {disputes.length === 0 ? (
          <Card className="border-border bg-white shadow-xs">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No disputes found under this status.
            </CardContent>
          </Card>
        ) : (
          disputes.map((d) => {
            const opp = d.opportunities;
            const isResolved = d.status === "RESOLVED";

            return (
              <Card key={d.id} className="border-border bg-white shadow-xs overflow-hidden">
                <CardHeader className="pb-3 bg-slate-50/50 border-b border-border">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Scale className="h-4 w-4 text-rose-600" />
                      <CardTitle className="text-base font-semibold">
                        {opp?.title ?? `Opportunity #${d.opportunity_id.slice(0, 8)}`}
                      </CardTitle>
                      {opp && (
                        <Link
                          href={`/opportunities/${opp.id}`}
                          target="_blank"
                          className="text-muted-foreground hover:text-primary"
                          title="View opportunity"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isResolved ? (
                        <Badge variant="success" className="text-xs">
                          RESOLVED: {d.outcome}
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-xs">
                          {d.status}
                        </Badge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(d.created_at)}
                      </span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="p-5 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-muted-foreground">Dispute Reason:</span>
                      <p className="font-semibold text-foreground text-sm mt-0.5">{d.reason}</p>
                      {d.description && (
                        <p className="mt-1.5 text-muted-foreground leading-relaxed">
                          {d.description}
                        </p>
                      )}
                    </div>

                    <div className="space-y-1">
                      {opp?.funded_amount ? (
                        <div className="flex items-center justify-between py-1 border-b border-border">
                          <span className="text-muted-foreground">Escrow on Hold:</span>
                          <span className="font-bold text-rose-600">
                            {formatMoney(opp.funded_amount, opp.currency)}
                          </span>
                        </div>
                      ) : null}
                      <div className="flex items-center justify-between py-1 border-b border-border">
                        <span className="text-muted-foreground">Connection Ref:</span>
                        <span className="font-mono text-[11px]">
                          {d.connection_id ? `#${d.connection_id.slice(0, 8)}` : "Direct"}
                        </span>
                      </div>
                      {d.evidence && (
                        <div className="pt-1">
                          <span className="text-muted-foreground">Evidence Submitted:</span>
                          <p className="mt-0.5 font-mono text-[11px] text-slate-700 bg-slate-50 p-2 rounded border border-border">
                            {d.evidence}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Resolution Notes if already resolved */}
                  {isResolved && (
                    <div className="rounded-lg bg-emerald-50 p-3 border border-emerald-200 text-xs text-emerald-900">
                      <div className="font-semibold flex items-center gap-1.5">
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                        Resolution Outcome: {d.outcome}
                      </div>
                      {d.resolution_note && (
                        <p className="mt-1 text-[11px] text-emerald-800">
                          Note: {d.resolution_note}
                        </p>
                      )}
                      {d.resolved_at && (
                        <p className="mt-1 text-[10px] text-emerald-700">
                          Resolved on {formatDate(d.resolved_at)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Actions for unresolved dispute */}
                  {!isResolved && canResolve && (
                    <div className="pt-3 border-t border-border flex flex-wrap items-center justify-between gap-3">
                      {d.status === "OPEN" && (
                        <form action={updateDisputeStatusAction} className="inline-flex">
                          <input type="hidden" name="disputeId" value={d.id} />
                          <input type="hidden" name="status" value="UNDER_REVIEW" />
                          <button
                            type="submit"
                            className="rounded border border-border bg-white px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
                          >
                            Mark Under Review
                          </button>
                        </form>
                      )}

                      <div className="flex flex-wrap items-center gap-2">
                        {/* 1. Full Refund to Seeker */}
                        <form action={resolveDisputeAction} className="inline-flex">
                          <input type="hidden" name="disputeId" value={d.id} />
                          <input type="hidden" name="outcome" value="REFUNDED" />
                          <input
                            type="hidden"
                            name="resolutionNote"
                            value="Full refund of escrow to Seeker following dispute review"
                          />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1 rounded border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-100"
                          >
                            Full Refund to Seeker
                          </button>
                        </form>

                        {/* 2. Full Release to Linker */}
                        <form action={resolveDisputeAction} className="inline-flex">
                          <input type="hidden" name="disputeId" value={d.id} />
                          <input type="hidden" name="outcome" value="COMPLETED" />
                          <input
                            type="hidden"
                            name="resolutionNote"
                            value="Full release of reward escrow to Linker following review"
                          />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1 rounded bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700"
                          >
                            Full Release to Linker
                          </button>
                        </form>

                        {/* 3. 50/50 Split */}
                        <form action={resolveDisputeAction} className="inline-flex">
                          <input type="hidden" name="disputeId" value={d.id} />
                          <input type="hidden" name="outcome" value="PARTIALLY_COMPLETED" />
                          <input
                            type="hidden"
                            name="resolutionNote"
                            value="50/50 split settlement between Seeker and Linker"
                          />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1 rounded border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-100"
                          >
                            50/50 Split Settlement
                          </button>
                        </form>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

