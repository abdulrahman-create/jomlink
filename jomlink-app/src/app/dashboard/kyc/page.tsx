import { getCurrentUser } from "@/lib/auth";
import {
  getKycRecordsByUser,
  getKycBiometricsByUser,
  getTrainingConsentState,
} from "@/lib/queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Clock, CheckCircle2, XCircle, ScanFace, FlaskConical, Sparkles } from "lucide-react";
import { formatDate, BIOMETRIC_RETENTION } from "@/lib/constants";
import { trainingConsentStatus } from "@/lib/biometric-purge";
import { kycDevBypassNotice, kycDevBypassState } from "@/lib/kyc-dev-bypass";
import { KycForm } from "./kyc-form";
import { BiometricKycForm } from "./biometric-form";
import { DevVerifyButton } from "./dev-verify-button";

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
  const biometrics = await getKycBiometricsByUser(user.id);
  // §11.11 — training consent is a SEPARATE purpose from KYC consent.
  const consentState = await getTrainingConsentState(user.id);
  const trainingState = trainingConsentStatus(consentState);
  const latest = records[0] ?? null;
  const isVerified = user.profile?.verifiedBadge === true;
  // Dev/test only. `enabled` is false in production by construction.
  const devBypass = kycDevBypassState();

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

      {/* DEV / TEST ONLY — one-click verification. Hidden unless the server has
          already confirmed the bypass is available (never in production). */}
      {devBypass.enabled && !isVerified && (
        <Card className="border-warning/40 bg-warning/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-warning">
              <FlaskConical className="h-5 w-5" aria-hidden="true" />
              Dev / test mode
            </CardTitle>
            <CardDescription>
              {kycDevBypassNotice()}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Mark this account verified immediately so you can test withdrawals,
              payout settlement, the AML review threshold and Compliance
              clearance without an admin approving a document. Every use is
              recorded in the audit log as <code>KYC_DEV_VERIFIED</code>.
            </p>
            <DevVerifyButton />
            <p className="text-xs text-muted-foreground">
              To remove the escape hatch entirely, unset <code>KYC_DEV_BYPASS</code>.
            </p>
          </CardContent>
        </Card>
      )}

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

      {/* Biometric capture — face + ID, for automated verification (data collection) */}
      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ScanFace className="h-5 w-5 text-primary" aria-hidden="true" />
            Help build automated verification
          </CardTitle>
          <CardDescription>
            Capture a live face photo and your ID together, so future verification can be
            instant instead of manual. Your images are stored privately and are never
            shown publicly. Using them to train a model is a separate, optional choice
            you make below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* §11.11 — the two purposes are shown separately so a member can see
              exactly what they agreed to, and revoke only the secondary one. */}
          {consentState.columnsReady ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <p className="text-xs font-semibold text-muted-foreground">
                  Identity verification consent
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm text-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                  {consentState.biometricConsent ? "Given" : "Not given"}
                </p>
              </div>
              <div className="rounded-md border border-border bg-muted/30 p-3">
                <p className="text-xs font-semibold text-muted-foreground">
                  Model-training consent (optional)
                </p>
                <p className="mt-1 flex items-center gap-2 text-sm text-foreground">
                  <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
                  <Badge
                    variant={
                      trainingState.tone === "active"
                        ? "success"
                        : trainingState.tone === "withdrawn"
                          ? "warning"
                          : "outline"
                    }
                  >
                    {trainingState.label}
                  </Badge>
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  Only captures made while this is granted are used to train a model.
                  Identity images expire after {BIOMETRIC_RETENTION.KYC_RETENTION_DAYS} days.
                </p>
              </div>
            </div>
          ) : (
            <p className="rounded-md border border-warning/40 bg-warning-bg px-3 py-2 text-xs text-warning">
              The separate model-training consent is unavailable until
              <code className="mx-1">supabase/phase-15-biometric-purge-consent.sql</code>
              is applied. Your identity captures still work; they are treated as
              verification-only.
            </p>
          )}

          <BiometricKycForm
            trainingConsentActive={trainingState.tone === "active"}
            trainingConsentAvailable={consentState.columnsReady}
          />

          {biometrics.length > 0 && (
            <div className="rounded-md border border-border bg-muted/40 p-3">
              <p className="text-xs font-semibold text-muted-foreground">
                Your previous captures ({biometrics.length})
              </p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                {biometrics.map((b) => (
                  <li key={b.id} className="flex items-center justify-between gap-3">
                    <span>
                      Captured {formatDate(b.created_at)}
                      {b.purge_requested_at ? " · deletion scheduled" : ""}
                    </span>
                    <span className="flex items-center gap-2">
                      <Badge variant="outline">
                        {b.training_consent_granted
                          ? "training-eligible"
                          : "verification only"}
                      </Badge>
                      <Badge variant="outline">
                        {b.label_status.replace(/_/g, " ").toLowerCase()}
                      </Badge>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

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