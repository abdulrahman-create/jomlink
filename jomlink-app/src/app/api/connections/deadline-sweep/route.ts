import { NextResponse, type NextRequest } from "next/server";
import { requireCronAuth } from "@/lib/cron-auth";
import { listDeadlinesApproaching } from "@/lib/queries";
import {
  deadlineProximity,
  warnDeadlineApproaching,
  WARN_WINDOW_DAYS,
  type DeadlineProximity,
} from "@/lib/deadline-warnings";

/**
 * Deadline-warning sweep (§5.6.1 / §5.14).
 *
 * Warns BOTH parties on any open connection whose accepted deadline is close but
 * still in the future and whose work is not marked complete. Run it from a cron
 * (e.g. hourly or daily) or manually:
 *
 *   curl -H "x-reconcile-secret: $RECONCILE_SECRET" \
 *        https://app/api/connections/deadline-sweep
 *
 * Auth: when RECONCILE_SECRET is set, the `x-reconcile-secret` header must match.
 * When it is NOT set the route fails closed in production (503) and stays open
 * only in local dev — see `src/lib/cron-auth.ts`.
 *
 * De-duplication: warnings are not persisted as their own table, so this route
 * takes a light approach — it only emits ONE warning per connection per level
 * within a single run, and relies on the once-per-day cron cadence to avoid
 * spamming. Members only ever see the newest unread nudge on their dashboard.
 */
export async function GET(request: NextRequest) {
  const denied = requireCronAuth(request, "deadline-sweep");
  if (denied) return denied;

  let approaching;
  try {
    approaching = await listDeadlinesApproaching(WARN_WINDOW_DAYS);
  } catch (e) {
    console.error("deadline-sweep: could not list approaching deadlines", e);
    return NextResponse.json({ ok: false, error: "Query failed" }, { status: 500 });
  }

  const results = { checked: 0, warned: 0, skipped: 0 };
  const perConnection = new Map<string, DeadlineProximity>();

  for (const deadline of approaching) {
    results.checked++;

    // One warning per connection per level (§5.6.1 convention).
    const level = deadlineProximity(deadline);
    if (level === "NONE" || level === "OVERDUE") {
      results.skipped++;
      continue;
    }
    const key = `${deadline.connection_id}:${level}`;
    if (perConnection.has(key)) {
      results.skipped++;
      continue;
    }
    perConnection.set(key, level);

    try {
      const sent = await warnDeadlineApproaching({
        connectionId: deadline.connection_id,
        deadline,
        proximity: level,
      });
      if (sent) results.warned++;
      else results.skipped++;
    } catch (e) {
      console.error(
        "deadline-sweep: warn failed for",
        deadline.connection_id,
        e
      );
      results.skipped++;
    }
  }

  return NextResponse.json({ ok: true, ...results });
}
