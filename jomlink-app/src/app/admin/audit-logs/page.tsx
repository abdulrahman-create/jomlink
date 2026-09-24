import Link from "next/link";
import { History, Search, ShieldAlert, Filter } from "lucide-react";
import { requireAdmin } from "@/lib/rbac";
import { listAuditLogs } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/constants";

export default async function AdminAuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ action?: string; entity?: string }>;
}) {
  await requireAdmin("audit:read");
  const { action, entity } = await searchParams;

  const logs = await listAuditLogs({
    action: action ?? "ALL",
    entity: entity ?? "ALL",
    limit: 100,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Audit Trail
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Immutable log of all administrative actions, financial approvals, and moderation decisions.
          </p>
        </div>
        <Badge variant="outline" className="text-xs">
          {logs.length} events logged
        </Badge>
      </div>

      {/* Filters */}
      <Card className="border-border bg-white shadow-xs">
        <CardContent className="p-4">
          <form method="get" className="flex flex-wrap items-center gap-3">
            <select
              name="action"
              defaultValue={action ?? "ALL"}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">All Actions</option>
              <option value="MEMBER_SUSPENDED">Member Suspended</option>
              <option value="MEMBER_REINSTATED">Member Reinstated</option>
              <option value="MEMBER_ROLE_UPDATED">Member Role Updated</option>
              <option value="OPPORTUNITY_APPROVED">Opportunity Approved</option>
              <option value="OPPORTUNITY_FLAGGED">Opportunity Flagged</option>
              <option value="OPPORTUNITY_REJECTED">Opportunity Rejected</option>
              <option value="OPPORTUNITY_RESTRICTED_TOGGLED">Restricted Toggled</option>
              <option value="KYC_APPROVED">KYC Approved</option>
              <option value="KYC_REJECTED">KYC Rejected</option>
              <option value="RELATIONSHIP_VERIFIED">Relationship Verified</option>
              <option value="RELATIONSHIP_REJECTED">Relationship Rejected</option>
              <option value="DISPUTE_RAISED">Dispute Raised</option>
              <option value="DISPUTE_UNDER_REVIEW">Dispute Under Review</option>
              <option value="DISPUTE_RESOLVED">Dispute Resolved</option>
            </select>

            <select
              name="entity"
              defaultValue={entity ?? "ALL"}
              className="rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="ALL">All Entities</option>
              <option value="USER">User / Member</option>
              <option value="OPPORTUNITY">Opportunity</option>
              <option value="KYC_RECORD">KYC Record</option>
              <option value="RELATIONSHIP">Relationship</option>
              <option value="DISPUTE">Dispute</option>
            </select>

            <button
              type="submit"
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
            >
              Filter Logs
            </button>
            {((action && action !== "ALL") || (entity && entity !== "ALL")) && (
              <Link
                href="/admin/audit-logs"
                className="rounded-md border border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
              >
                Clear
              </Link>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="border-border bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-slate-50/75 text-xs text-muted-foreground uppercase font-semibold">
              <tr>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Performed By</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono text-xs">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground font-sans">
                    No audit log records match the selected filters.
                  </td>
                </tr>
              ) : (
                logs.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                      {formatDate(l.created_at)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-semibold text-primary">{l.action}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-medium text-foreground">{l.entity}</span>
                      {l.entity_id && (
                        <span className="text-muted-foreground ml-1">
                          #{l.entity_id.slice(0, 8)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-sans text-xs">
                      <span className="font-medium text-foreground">
                        {l.users?.full_name || (l.admin_id ? "Admin" : "System / Member")}
                      </span>
                      {l.users?.email && (
                        <span className="block text-[11px] text-muted-foreground">
                          {l.users.email}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-sans text-xs">
                      {l.details && Object.keys(l.details).length > 0 ? (
                        <pre className="text-[11px] text-slate-700 bg-slate-50 p-1.5 rounded border border-border max-w-md overflow-x-auto whitespace-pre-wrap font-mono">
                          {JSON.stringify(l.details, null, 1)}
                        </pre>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

