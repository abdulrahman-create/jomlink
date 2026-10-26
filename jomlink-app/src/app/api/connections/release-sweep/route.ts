import { NextResponse, type NextRequest } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { runAutoReleaseCheck } from "@/app/actions/transactions";

/**
 * Escrow auto-release FALLBACK sweep (§3.9, §5.7 Escrow Release Model).
 *
 * The reward is released **immediately** when the Seeker marks a connection
 * complete. This sweep is the SAFETY NET: it pays out a connection that is
 * COMPLETED with `release_status = PENDING_RELEASE` whose completion date +
 * RELEASE_WAIT_DAYS has passed and which no dispute has frozen — i.e. the Seeker
 * never released it (or an immediate release failed). Run it from a cron (e.g.
 * hourly or daily) or manually:
 *
 *   curl -H "x-reconcile-secret: $RECONCILE_SECRET" \
 *        https://app/api/connections/release-sweep
 *
 * Auth: when RECONCILE_SECRET is set, the `x-reconcile-secret` header must match.
 * When it is NOT set the route fails closed in production (503) and stays open
 * only in local dev — see `src/lib/cron-auth.ts`.
 *
 * Idempotent: `runAutoReleaseCheck` skips any connection already
 * RELEASED/REFUNDED/VOID/HELD, so overlapping runs and retries never double-pay.
 */
export async function GET(request: NextRequest) {
  const denied = requireCronAuth(request, "release-sweep");
  if (denied) return denied;

  try {
    const result = await runAutoReleaseCheck();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("release-sweep: auto-release failed", e);
    return NextResponse.json({ ok: false, error: "Release sweep failed" }, { status: 500 });
  }
}
