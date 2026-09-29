import Link from "next/link";
import { ShieldCheck, UserCheck, CheckCircle2, XCircle, Clock, ExternalLink, FileSearch, ScanFace } from "lucide-react";
import { requireAdmin } from "@/lib/rbac";
import {
  listKycRecords,
  listRelationshipsForAdmin,
  listKycBiometrics,
  getBiometricDatasetStats,
} from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/constants";
import { reviewKycAction, reviewRelationshipAction } from "@/app/actions/admin";
import { LabelBiometricForm } from "./label-biometric-form";

export default async function AdminKycPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; status?: string }>;
}) {
  const admin = await requireAdmin("kyc:read");
  const { tab = "kyc", status } = await searchParams;

  const [kycRecords, relationships, biometrics, biometricStats] = await Promise.all([
    listKycRecords(status ?? "ALL", 50),
    listRelationshipsForAdmin({ status: status ?? "ALL", limit: 50 }),
    listKycBiometrics({ labelStatus: "ALL", limit: 50 }),
    getBiometricDatasetStats(),
  ]);

  const canWrite = admin.can("kyc:write");
  const labelledTotal =
    (biometricStats.MATCH ?? 0) +
    (biometricStats.NO_MATCH ?? 0) +
    (biometricStats.UNUSABLE ?? 0);

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
        <Link
          href="/admin/kyc?tab=biometrics"
          className={`pb-3 text-sm font-semibold transition-colors border-b-2 px-1 ${
            tab === "biometrics"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          }`}
        >
          Biometric Dataset ({labelledTotal}/{biometrics.length} labelled)
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
      ) : tab === "biometrics" ? (
        /* Biometric dataset queue (face + ID, for ML training) */
        <div className="space-y-4">
          <Card className="border-border bg-white shadow-xs">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <ScanFace className="h-5 w-5 text-primary" aria-hidden="true" />
                Biometric dataset
              </CardTitle>
              <CardDescription>
                Consented face + ID captures. Label each pair to build the ground-truth
                training set for Jomlink&apos;s own automated face-match model.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-xl font-bold">{biometrics.length}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Unlabelled</p>
                  <p className="text-xl font-bold">{biometricStats.UNLABELLED ?? 0}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">Match</p>
                  <p className="text-xl font-bold text-success">{biometricStats.MATCH ?? 0}</p>
                </div>
                <div className="rounded-lg border border-border p-3">
                  <p className="text-xs text-muted-foreground">No match / unusable</p>
                  <p className="text-xl font-bold text-destructive">
                    {(biometricStats.NO_MATCH ?? 0) + (biometricStats.UNUSABLE ?? 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-white shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-slate-50/75 text-xs text-muted-foreground uppercase font-semibold">
                  <tr>
                    <th className="px-4 py-3">Member</th>
                    <th className="px-4 py-3">Captures</th>
                    <th className="px-4 py-3">Quality</th>
                    <th className="px-4 py-3">Label</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {biometrics.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No biometric captures yet.
                      </td>
                    </tr>
                  ) : (
                    biometrics.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="font-semibold text-foreground">
                            {b.users?.full_name || "Member"}
                          </div>
                          <div className="text-xs text-muted-foreground">{b.users?.email}</div>
                          <div className="text-[11px] text-muted-foreground">
                            {formatDate(b.created_at)}
                            {b.purge_requested_at ? " · PURGE REQUESTED" : ""}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          <div className="flex flex-col gap-1">
                            <a
                              href={`/api/admin/kyc/biometrics/${b.id}/selfie`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                            >
                              <FileSearch className="h-3 w-3" aria-hidden="true" />
                              Face
                            </a>
                            <a
                              href={`/api/admin/kyc/biometrics/${b.id}/id`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline"
                            >
                              <FileSearch className="h-3 w-3" aria-hidden="true" />
                              ID document
                            </a>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {b.face_confidence != null ? (
                            <>
                              <div>Confidence: {Math.round(Number(b.face_confidence))}%</div>
                              <div>
                                Box: {b.face_width ?? 0}×{b.face_height ?? 0}px
                              </div>
                            </>
                          ) : (
                            <span>—</span>
                          )}
                          <div className="mt-1">
                            {b.liveness_passed ? (
                              <Badge variant="success" className="text-[10px]">
                                Liveness signal
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px]">
                                No liveness signal
                              </Badge>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              b.label_status === "MATCH"
                                ? "success"
                                : b.label_status === "NO_MATCH"
                                  ? "destructive"
                                  : "outline"
                            }
                            className="text-xs"
                          >
                            {b.label_status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right">
                          {canWrite ? (
                            <LabelBiometricForm biometricId={b.id} current={b.label_status} />
                          ) : (
                            <span className="text-xs text-muted-foreground">View only</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>

          <p className="text-xs text-muted-foreground">
            Data-collection pipeline only — no automated face matching runs today. Labels
            (MATCH / NO_MATCH / UNUSABLE) are the training ground-truth for the future model.
            Purge-requested captures must be deleted by the retention job.
          </p>
        </div>
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

