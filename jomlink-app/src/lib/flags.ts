import type { LinkerFlagRow, OpportunityDeadlineRow } from "@/lib/jomlink-types";
import {
  createLinkerFlag,
  createNotification,
  getActiveFlagByConnection,
  getConnectionById,
  getDeadlineByConnection,
  getOpportunityById,
  updateLinkerFlag,
} from "@/lib/queries";

/**
 * Jomlink Commitment Flags (blueprint §5.6.1)
 *
 * A YELLOW FLAG is raised against a Linker when they proposed a task deadline
 * and then could not deliver by it (and no accepted extension applies). It is a
 * commitment-confidence signal, NOT a penalty and NOT a dispute:
 *
 *   - it does NOT by itself release the reward — only a §5.13 failure does;
 *   - it is CLEARED on on-time delivery or an accepted extension;
 *   - it feeds the Linker Performance Record (§5.15) and reputation;
 *   - repeated flags are an abuse signal for fraud management (§9.12).
 */

export const FLAG_TYPE = "MISSED_COMMITMENT" as const;
export const FLAG_STATUS_RAISED = "RAISED" as const;
export const FLAG_STATUS_CLEARED = "CLEARED" as const;

function fmt(d: string | null | undefined): string {
  if (!d) return "(no date)";
  return new Date(d).toLocaleDateString("en-MY", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Raise a yellow flag for a Linker who missed a deadline they proposed.
 * Idempotent per connection: an already-raised flag is returned unchanged so a
 * repeated sweep never stacks duplicate flags.
 *
 * The Seeker is notified that the commitment was missed — visibility is part of
 * the design (§5.6.1), so the Seeker sees it without having to go looking.
 */
export async function raiseMissedCommitmentFlag(params: {
  connectionId: string;
  deadline?: OpportunityDeadlineRow | null;
  reason?: string;
}): Promise<LinkerFlagRow | null> {
  const { connectionId } = params;

  const existing = await getActiveFlagByConnection(connectionId);
  if (existing) return existing;

  const conn = await getConnectionById(connectionId);
  if (!conn) return null;

  const deadline =
    params.deadline ?? (await getDeadlineByConnection(connectionId));

  const reason =
    params.reason ??
    `Linker did not deliver the agreed task by the deadline they proposed${
      deadline?.proposed_date ? ` (${fmt(deadline.proposed_date)})` : ""
    }.`;

  const flag = await createLinkerFlag({
    linker_id: conn.linker_id,
    connection_id: connectionId,
    deadline_id: deadline?.id ?? null,
    type: FLAG_TYPE,
    reason,
    status: FLAG_STATUS_RAISED,
    raised_at: new Date().toISOString(),
  });

  // Notify the Seeker — a flag the Seeker cannot see is not a signal.
  try {
    const opp = await getOpportunityById(conn.opportunity_id);
    if (opp) {
      await createNotification({
        user_id: opp.seeker_id,
        type: "YELLOW_FLAG_RAISED",
        title: "Linker missed the agreed deadline",
        body: reason,
        channel: "IN_APP",
        data: { connectionId, flagId: flag.id, opportunityId: opp.id },
      });
    }
  } catch (e) {
    console.error("raiseMissedCommitmentFlag: notification failed", e);
  }

  return flag;
}

/**
 * Clear the yellow flag — the commitment problem is resolved. Called on on-time
 * delivery and on an accepted extension (§5.14). Returns null when there was no
 * active flag, so callers can treat it as a no-op.
 */
export async function clearMissedCommitmentFlag(params: {
  connectionId: string;
  reason: string;
}): Promise<LinkerFlagRow | null> {
  const existing = await getActiveFlagByConnection(params.connectionId);
  if (!existing) return null;

  return updateLinkerFlag(existing.id, {
    status: FLAG_STATUS_CLEARED,
    cleared_at: new Date().toISOString(),
    cleared_reason: params.reason,
  });
}

/**
 * True when an accepted deadline has passed. Pure predicate so both the flag
 * sweep and the UI can agree on what "missed" means.
 */
export function isDeadlineMissed(
  deadline: Pick<OpportunityDeadlineRow, "status" | "accepted_date">,
  now: Date = new Date()
): boolean {
  if (deadline.status !== "ACCEPTED" || !deadline.accepted_date) return false;
  return new Date(deadline.accepted_date).getTime() < now.getTime();
}
