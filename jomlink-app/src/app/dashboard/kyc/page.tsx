import { getCurrentUser } from "@/lib/auth";
import { getKycRecordsByUser } from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Clock, CheckCircle2, XCircle } from "lucide-react";
import { formatDate } from "@/lib/constants";
import { KycForm } from "./kyc-form";

export const metadata = { title: "Identity Verification" };

const STATUS_BADGE: Record<string, { variant: "success" | "warning" | "destructive" | "outline"; label: string }> = {
  VERIFIED: { variant: "success", label: "Verified" },
  PENDING: { variant: "warning", label: "Pending review" },
  REJECTED: { variant: "destructive", label: "Rejected" },
  UNVERIFIED: { variant: "outline", label: "Not submitted" },
  EXPIRED: { variant: "outline", label: "Expired" },
  SUSPENDED: { variant: "destructive", label: "Suspended" },
};

export default async function KycPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const records = await getKycRecordsByUser(user.id);
  const latest = records[0] ?? null;
  const isVerified = user.profile?.verifiedBadge === true;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Identity Verification</h1>
          <p className="mt-1 text-muted-foreground">
            Verify your identity to earn the Jomlink Verified badge.
          </p>
        </div>
        <Badge variant={isVerified ? "verified" : "outline"}>
          {isVerified ? "Verified" : user.profile?.verificationStatus ?? "UNVERIFIED"}
        </Badge>
      </div>

      {/* Current status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />
            Verification status
          </CardTitle>
          <CardDescription>
            A verified badge tells other members your identity has been confirmed by Jomlink.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isVerified ? (
            <div className="flex items-center gap-2 rounded-md bg-success-bg px-3 py-3 text-sm text-success">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              Your identity is verified. You can now display the Jomlink Verified badge on your profile.
            </div>
          ) : latest?.status === "PENDING" ? (
            <div className="flex items-center gap-2 rounded-md bg-warning-bg px-3 py-3 text-sm text-warning">
              <Clock className="h-5 w-5" aria-hidden="true" />
              Your document is pending admin review. This usually takes 1-2 working days..
            </div>
          ) : latest?.status === "REJECTED" ? (
            <div className="flex items-center gap-2 rounded-md bg-destructive-bg px-3 py-3 text-sm text-destructive">
              <XCircle className="h-5 w-5" aria-hidden="true" />
              Your last submission was rejected. Please submit a clearer document..
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              You have not submitted an identity document yet. Submit one below to begin verification..
            </p>
          )}
        </CardContent>
      </Card>

      {/* Submission form - only when not already verified */}
      {!isVerified && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Submit an identity document</CardTitle>
            <CardDescription>
              Upload a government-issued ID (passport, MyKad, driving licence) for admin review..
            </CardDescription>
          </CardHeader>
          <CardContent>
            <KycForm />
          </CardContent>
        </Card>
      )}

      {/* Submission history */}
      {records.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Submission history</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y divide-border">
              {records.map((r) => {
                const b = STATUS_BADGE[r.status] ?? STATUS_BADGE.UNVERIFIED;
                return (
                  <li key={r.id} className="flex items-center justify-between gap-4 py-3">
                    <div>
                      <div className="text-sm font-medium text-foreground">
                        {r.document_type?.replace(/_/g, " ") ?? "Identity document"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Submitted {formatDate(r.created_at)}
                        {r.document_ref ? ` · Ref: ${r.document_ref}` : ""}
                      </div>
                    </div>
                    <Badge variant={b.variant}>{b.label}</Badge>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}