import { NextResponse, type NextRequest } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { runVerificationSweep } from "@/app/actions/transactions";

/**
 * Verification-gated completion sweep (Phase 14, §5.7).
 *
 * Drives the three completion timeouts so no party can hold the money hostage:
 *   • auto-advance `AWAITING_SEEKER_CONFIRMATION` past the Seeker confirm window,
 *   • auto-verify `AWAITING_VERIFICATION` past the platform verification window,
 *   • auto-release `VERIFIED` connections whose mandatory hold has elapsed.
 *
 * Run from a cron (e.g. hourly) or manually:
 *
 *   curl -H "x-reconcile-secret: $RECONCILE_SECRET" \
 *        https://app/api/connections/verification-sweep
 *
 * Auth: when RECONCILE_SECRET is set, the `x-reconcile-secret` header must match
 * (same gate as release-sweep and deadline-sweep). When it is NOT set the route
 * fails closed in production (503) and stays open only in local dev — see
 * `src/lib/cron-auth.ts`.
 *
 * Idempotent: each stage re-reads the row and skips anything no longer in the
 * expected status, and the release core skips already-settled connections —
 * overlapping runs and retries never double-pay.
 */
export async function GET(request: NextRequest) {
  const denied = requireCronAuth(request, "verification-sweep");
  if (denied) return denied;

  try {
    const result = await runVerificationSweep();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("verification-sweep: sweep failed", e);
    return NextResponse.json({ ok: false, error: "Verification sweep failed" }, { status: 500 });
  }
}
