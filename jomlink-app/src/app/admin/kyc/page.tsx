import Link from "next/link";
import { ShieldCheck, UserCheck, CheckCircle2, XCircle, Clock, ExternalLink, FileSearch } from "lucide-react";
import { requireAdmin } from "@/lib/rbac";
import { listKycRecords, listRelationshipsForAdmin } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/constants";
import { reviewKycAction, reviewRelationshipAction } from "@/app/actions/admin";

export default async function AdminKycPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string }>;
}) {
  const admin = await requireAdmin("kyc:read");
  const { tab = "kyc", status } = await searchParams;

  const [kycRecords, relationships] = await Promise.all([
    listKycRecords(status ?? "ALL", 50),
    listRelationshipsForAdmin({ status: status ?? "ALL", limit: 50 }),
  ]);

  const canWrite = admin.can("kyc:write");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            KYC & Relationship Verification
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Verify member identity documents and declared professional relationships.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border">
        <Link
          href="/admin/kyc?tab=kyc"
          className={`pb-3 text-sm font-semibold transition-colors border-b-2 px-1 ${
            tab === "kyc"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Identity KYC Records ({kycRecords.length})
        </Link>
        <Link
          href="/admin/kyc?tab=relationships"
          className={`pb-3 text-sm font-semibold transition-colors border-b-2 px-1 ${
            tab === "relationships"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Declared Relationships ({relationships.length})
        </Link>
      </div>

      {tab === "kyc" ? (
        /* KYC Queue */
        <Card className="border-border bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-slate-50/75 text-xs text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Document Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {kycRecords.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No KYC records found.
                    </td>
                  </tr>
                ) : (
                  kycRecords.map((k) => (
                    <tr key={k.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">
                          {k.users?.full_name || "Unknown Member"}
                        </div>
                        <div className="text-xs text-muted-foreground">{k.users?.email}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-xs text-foreground">
                          {k.document_type || "Passport / National ID"}
                        </div>
                        {k.document_ref && (
                          <div className="mt-1 flex items-center gap-2">
                            <span className="text-[11px] text-muted-foreground font-mono">
                              Ref: {k.document_ref}
                            </span>
                            <a
                              href={`/api/admin/kyc/${k.id}/document`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                            >
                              <FileSearch className="h-3 w-3" aria-hidden="true" />
                              View document
                            </a>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {k.status === "VERIFIED" ? (
                          <Badge variant="success" className="text-xs">
                            VERIFIED
                          </Badge>
                        ) : k.status === "REJECTED" ? (
                          <Badge variant="destructive" className="text-xs">
                            REJECTED
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="text-xs">
                            {k.status}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {formatDate(k.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canWrite && k.status !== "VERIFIED" && (
                          <div className="inline-flex items-center gap-1.5">
                            <form action={reviewKycAction} className="inline-flex">
                              <input type="hidden" name="kycId" value={k.id} />
                              <input type="hidden" name="status" value="VERIFIED" />
                              <button
                                type="submit"
                                className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                              >
                                <CheckCircle2 className="h-3 w-3" /> Approve
                              </button>
                            </form>

                            <form action={reviewKycAction} className="inline-flex">
                              <input type="hidden" name="kycId" value={k.id} />
                              <input type="hidden" name="status" value="REJECTED" />
                              <input type="hidden" name="notes" value="Insufficient documentation" />
                              <button
                                type="submit"
                                className="inline-flex items-center gap-1 rounded border border-rose-300 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                              >
                                <XCircle className="h-3 w-3" /> Reject
                              </button>
                            </form>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        /* Declared Relationships Queue */
        <Card className="border-border bg-white shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-slate-50/75 text-xs text-muted-foreground uppercase font-semibold">
                <tr>
                  <th className="px-4 py-3">Linker</th>
                  <th className="px-4 py-3">Target Entity</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Degree</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {relationships.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No declared relationships found.
                    </td>
                  </tr>
                ) : (
                  relationships.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-foreground">
                          {r.users?.full_name || "Linker"}
                        </div>
                        <div className="text-xs text-muted-foreground">{r.users?.email}</div>
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">
                        {r.entity_name}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {r.category.replace(/_/g, " ")}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {r.connection_degree}
                      </td>
                      <td className="px-4 py-3">
                        {r.verified ? (
                          <Badge variant="success" className="text-xs">
                            VERIFIED
                          </Badge>
                        ) : r.verification_status === "REJECTED" ? (
                          <Badge variant="destructive" className="text-xs">
                            REJECTED
                          </Badge>
                        ) : (
                          <Badge variant="warning" className="text-xs">
                            {r.verification_status || "PENDING"}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canWrite && !r.verified && (
                          <div className="inline-flex items-center gap-1.5">
                            <form action={reviewRelationshipAction} className="inline-flex">
                              <input type="hidden" name="relationshipId" value={r.id} />
                              <input type="hidden" name="status" value="VERIFIED" />
                              <button
                                type="submit"
                                className="inline-flex items-center gap-1 rounded bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                              >
                                <CheckCircle2 className="h-3 w-3" /> Verify
                              </button>
                            </form>

                            <form action={reviewRelationshipAction} className="inline-flex">
                              <input type="hidden" name="relationshipId" value={r.id} />
                              <input type="hidden" name="status" value="REJECTED" />
                              <button
                                type="submit"
                                className="inline-flex items-center gap-1 rounded border border-rose-300 px-2 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50"
                              >
                                <XCircle className="h-3 w-3" /> Reject
                              </button>
                            </form>
                          </div>
                        )}
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

