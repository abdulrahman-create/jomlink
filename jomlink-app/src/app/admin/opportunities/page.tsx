import Link from "next/link";
import {
  Briefcase,
  Search,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { requireAdmin } from "@/lib/rbac";
import { listOpportunitiesForAdmin } from "@/lib/queries";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatMoney, formatDate } from "@/lib/constants";
import {
  moderateOpportunityAction,
  toggleRestrictedCategoryAction,
} from "@/app/actions/admin";

export default async function AdminOpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; category?: string }>;
}) {
  const admin = await requireAdmin("opportunities:read");
  const { q, status, category } = await searchParams;

  const opportunities = await listOpportunitiesForAdmin({
    search: q,
    status: status ?? "ALL",
    category: category ?? "ALL",
    limit: 50,
  });

  const canModerate = admin.can("opportunities:moderate");
  const canCompliance = admin.can("compliance:write");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Opportunity Moderation & Controls
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monitor listings, enforce restricted category policies, and moderate compliance.
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {opportunities.length} opportunities listed
        </Badge>
      </div>

      {/* Filter / Search Bar */}
      <Card className="border-border bg-white shadow-xs">
        <CardContent className="p-4">
          <form method="get" className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <input
                type="text"
                name="q"
                defaultValue={q ?? ""}
                placeholder="Search title or target entity..."
                className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <select
              name="status"
              defaultValue={status ?? "ALL"}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="PENDING_PAYMENT">Pending Payment</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="DISPUTED">Disputed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>

            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
            >
              Filter
            </button>
            {(q || (status && status !== "ALL") || (category && category !== "ALL")) && (
              <Link
                href="/admin/opportunities"
                className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
              >
                Clear
              </Link>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Opportunities List */}
      <div className="space-y-3">
        {opportunities.length === 0 ? (
          <Card className="border-border bg-white shadow-xs">
            <CardContent className="py-12 text-center text-sm text-muted-foreground">
              No opportunities found matching your criteria.
            </CardContent>
          </Card>
        ) : (
          opportunities.map((opp) => (
            <Card key={opp.id} className="border-border bg-white shadow-xs overflow-hidden">
              <CardContent className="p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-1.5 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-base text-foreground">
                        {opp.title}
                      </h3>
                      <Link
                        href={`/opportunities/${opp.id}`}
                        target="_blank"
                        className="text-muted-foreground hover:text-primary"
                        title="View public page"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>
                      <Badge variant="outline" className="text-xs">
                        {opp.status}
                      </Badge>
                      {opp.is_restricted_category && (
                        <Badge variant="destructive" className="text-xs flex items-center gap-1">
                          <ShieldAlert className="h-3 w-3" /> RESTRICTED
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground">
                      Target Entity: <span className="font-medium text-foreground">{opp.target_entity}</span> · Category: <span className="font-medium text-foreground">{opp.category}</span>
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Seeker: <span className="font-medium text-foreground">{opp.users?.full_name || "Unknown"}</span> ({opp.users?.email})
                    </p>
                    {opp.business_description && (
                      <p className="text-xs text-slate-600 line-clamp-2 mt-1">
                        {opp.business_description}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className="text-right">
                      <span className="text-sm font-bold text-foreground">
                        {formatMoney(opp.offer_amount, opp.currency)}
                      </span>
                      {opp.funded_amount ? (
                        <div className="text-[11px] text-emerald-600 font-medium">
                          Escrow: {formatMoney(opp.funded_amount, opp.currency)}
                        </div>
                      ) : null}
                      <div className="text-[11px] text-muted-foreground">
                        Created {formatDate(opp.created_at)}
                      </div>
                    </div>

                    {/* Moderation Actions */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-2">
                      {canCompliance && (
                        <form action={toggleRestrictedCategoryAction}>
                          <input type="hidden" name="opportunityId" value={opp.id} />
                          <input
                            type="hidden"
                            name="isRestricted"
                            value={opp.is_restricted_category ? "false" : "true"}
                          />
                          <button
                            type="submit"
                            className="rounded border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
                          >
                            {opp.is_restricted_category ? "Unmark Restricted" : "Mark Restricted"}
                          </button>
                        </form>
                      )}

                      {canModerate && opp.status !== "ACTIVE" && opp.status !== "COMPLETED" && (
                        <form action={moderateOpportunityAction}>
                          <input type="hidden" name="opportunityId" value={opp.id} />
                          <input type="hidden" name="status" value="ACTIVE" />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                          >
                            <CheckCircle2 className="h-3 w-3" /> Approve
                          </button>
                        </form>
                      )}

                      {canModerate && opp.status !== "CANCELLED" && (
                        <form action={moderateOpportunityAction}>
                          <input type="hidden" name="opportunityId" value={opp.id} />
                          <input type="hidden" name="status" value="CANCELLED" />
                          <input type="hidden" name="reason" value="Violation of platform guidelines" />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1 rounded border border-rose-300 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                          >
                            <XCircle className="h-3 w-3" /> Reject & Refund
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

