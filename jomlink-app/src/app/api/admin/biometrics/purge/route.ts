import { NextResponse, type NextRequest } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { runBiometricPurge } from "@/lib/biometric-purge-job";

/**
 * Biometric retention / purge sweep (blueprint v1.2 §11.11, `PRIV-01`).
 *
 * §11.11 makes this job mandatory: `purge_requested_at` rows must be DELETED by
 * a scheduled job, not merely flagged. This route is that job.
 *
 * It handles three deletion reasons (see `lib/biometric-purge.ts`):
 *   • `PURGE_REQUESTED`        — the member asked (withdrew consent / erasure),
 *   • `KYC_RETENTION_EXPIRED`  — identity image past its retention cap,
 *   • `TRAINING_RETENTION_EXPIRED` — training capture past its cap.
 *
 * Both the private-bucket objects AND the rows are removed, and every run writes
 * a `BIOMETRIC_PURGE_RUN` audit entry — including a run that deleted nothing, so
 * the absence of deletions is provable rather than assumed.
 *
 * Run from a cron (e.g. daily) or manually:
 *
 *   curl -H "x-reconcile-secret: $RECONCILE_SECRET" \
 *        https://app/api/admin/biometrics/purge
 *
 * Auth: same gate as the money sweeps (`lib/cron-auth.ts`) — 401 on a wrong
 * secret, and 503 in production when `RECONCILE_SECRET` is unset (fail closed).
 *
 * Idempotent: a second run finds nothing left to delete.
 */
export async function GET(request: NextRequest) {
  const denied = requireCronAuth(request, "biometrics-purge");
  if (denied) return denied;

  try {
    const result = await runBiometricPurge();
    return NextResponse.json(result, { status: result.ok ? 200 : 500 });
  } catch (e) {
    console.error("biometrics-purge: purge failed", e);
    return NextResponse.json(
      { ok: false, error: "Biometric purge failed" },
      { status: 500 }
    );
  }
}
