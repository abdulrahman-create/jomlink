import type { OpportunityDeadlineRow } from "@/lib/jomlink-types";
import {
  getConnectionById,
  getDeadlineByConnection,
  getProgressReportsByConnection,
} from "@/lib/queries";
import { notifyConnectionParties } from "@/lib/notify";
import { isConnectionOpen } from "@/lib/status";

/**
 * "Running out of time" warnings (blueprint §5.6.1, §5.14).
 *
 * A yellow flag is raised only AFTER a deadline has already been missed. That is
 * too late to do anything about it. This module warns BOTH parties BEFORE the
 * deadline arrives, while the connection is still open and the work is not yet
 * marked complete — so they can expedite delivery, request an extension, or
 * prepare evidence instead of being surprised by a missed-commitment flag.
 *
 * Warnings are graded by how close the deadline is:
 *   - SOON:   within WARN_WINDOW_DAYS  (default 3 days)
 *   - URGENT: within URGENT_WINDOW_DAYS (default 1 day)
 *
 * Notification type is `DEADLINE_APPROACHING` so the notifications page and the
 * deep-link resolver route it to the connection workspace like other DEADLINE_*
 * events.
 */

export const WARN_WINDOW_DAYS = 3;
export const URGENT_WINDOW_DAYS = 1;

export type DeadlineProximity = "NONE" | "SOON" | "URGENT" | "OVERDUE";

/** Whole days from now until `date` (negative once past). */
export function daysUntil(date: string | Date, now: Date = new Date()): number {
  const target = new Date(date).getTime();
  return Math.ceil((target - now.getTime()) / (24 * 60 * 60 * 1000));
}

/**
 * How close is an accepted deadline? Pure predicate shared by the sweep and the
 * UI banner so both agree on what "running out of time" means.
 *
 * Returns NONE when the deadline is not an accepted one, when there is no
 * accepted date, or when it is still comfortably in the future.
 */
export function deadlineProximity(
  deadline: Pick<OpportunityDeadlineRow, "status" | "accepted_date"> | null | undefined,
  now: Date = new Date()
): DeadlineProximity {
  if (!deadline || deadline.status !== "ACCEPTED" || !deadline.accepted_date) {
    return "NONE";
  }
  const days = daysUntil(deadline.accepted_date, now);
  if (days < 0) return "OVERDUE";
  if (days <= URGENT_WINDOW_DAYS) return "URGENT";
  if (days <= WARN_WINDOW_DAYS) return "SOON";
  return "NONE";
}

/**
 * Warn both parties that an open connection is running out of time.
 *
 * Only fires when:
 *   - the connection is still open (not COMPLETED / FAILED / DISPUTED), and
 *   - no progress report has been marked COMPLETE (work is still outstanding).
 *
 * Sent to BOTH the Seeker and the Linker — a warning one side cannot see is not
 * a warning. Idempotency is left to the caller (the sweep dedupes per
 * connection/level) so this can safely be called repeatedly.
 */
export async function warnDeadlineApproaching(params: {
  connectionId: string;
  deadline?: OpportunityDeadlineRow | null;
  proximity?: DeadlineProximity;
}): Promise<boolean> {
  const { connectionId } = params;

  const conn = await getConnectionById(connectionId);
  if (!conn || !isConnectionOpen(conn.status)) return false;

  const deadline =
    params.deadline ?? (await getDeadlineByConnection(connectionId));
  const proximity = params.proximity ?? deadlineProximity(deadline);
  if (proximity === "NONE" || proximity === "OVERDUE") return false;

  // If the Linker has already posted a COMPLETE progress report, the work is
  // done — no need to nag about time.
  const reports = await getProgressReportsByConnection(connectionId);
  if (reports.some((r) => r.status === "COMPLETE")) return false;

  const days = deadline?.accepted_date ? daysUntil(deadline.accepted_date) : null;
  const when =
    days === null
      ? "soon"
      : days <= 0
        ? "today"
        : days === 1
          ? "tomorrow"
          : `in ${days} days`;

  const urgent = proximity === "URGENT";
  const title = urgent
    ? "Deadline is almost up — progress incomplete"
    : "Deadline approaching — progress incomplete";

  await notifyConnectionParties(connectionId, {
    type: "DEADLINE_APPROACHING",
    title,
    body:
      `The accepted deadline${
        deadline?.accepted_date ? ` (${deadline.accepted_date.slice(0, 10)})` : ""
      } falls ${when}, and the work is not marked complete yet. ` +
      "Deliver, post a progress update, or request an extension before the deadline passes.",
    data: {
      connectionId,
      proximity,
      deadlineId: deadline?.id ?? null,
      acceptedDate: deadline?.accepted_date ?? null,
    },
  });

  return true;
}
