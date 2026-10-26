import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";

/** Header name every scheduled/reconcile route reads. */
export const CRON_SECRET_HEADER = "x-reconcile-secret";

export type CronAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 503; error: string };

/**
 * Constant-time string compare that never throws on length mismatch.
 * `timingSafeEqual` throws when the buffers differ in length, so compare
 * fixed-size digests instead.
 */
function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  const bufA = Buffer.alloc(len);
  const bufB = Buffer.alloc(len);
  bufA.write(a);
  bufB.write(b);
  return timingSafeEqual(bufA, bufB);
}

/**
 * Shared authentication for cron / scheduled-reconcile routes.
 *
 * Blueprint / PROJECT-TRACKING gap #12: these routes move money and send
 * notifications, so they must NEVER be publicly callable. The previous
 * implementation only checked the header *if* `RECONCILE_SECRET` was set, which
 * meant a misconfigured (or simply unset) production environment exposed
 * `/api/connections/release-sweep` and friends to anyone.
 *
 * Policy — fail closed:
 *   • secret configured  → header must match, else **401**.
 *   • secret NOT set in production → **503** (refuse to run, surface the
 *     misconfiguration loudly instead of silently doing unauthenticated work).
 *   • secret NOT set outside production → allowed, so local dev and the QA
 *     sweep rows (checklist §16) stay usable without extra setup.
 *
 * @param request   the incoming request
 * @param routeName used only in the log line/response body for diagnosis
 */
export function authorizeCronRequest(
  request: NextRequest,
  routeName: string
): CronAuthResult {
  const secret = process.env.RECONCILE_SECRET;

  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      console.error(
        `[${routeName}] RECONCILE_SECRET is not configured — refusing to run ` +
          `a money-moving sweep without authentication. Set RECONCILE_SECRET.`
      );
      return {
        ok: false,
        status: 503,
        error: "Scheduled endpoint is not configured.",
      };
    }
    // Local/dev only — documented behaviour, see QA checklist §16.4.
    return { ok: true };
  }

  const provided = request.headers.get(CRON_SECRET_HEADER) ?? "";
  if (!provided || !safeEqual(provided, secret)) {
    return { ok: false, status: 401, error: "Unauthorized" };
  }
  return { ok: true };
}

/**
 * Convenience wrapper: returns a `NextResponse` on failure, or `null` when the
 * caller may proceed. Keeps each route body to a single line.
 */
export function requireCronAuth(
  request: NextRequest,
  routeName: string
): NextResponse | null {
  const result = authorizeCronRequest(request, routeName);
  if (result.ok) return null;
  return NextResponse.json(
    { ok: false, error: result.error },
    { status: result.status }
  );
}
