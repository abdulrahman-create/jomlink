/**
 * Shared status labels and badge variants.
 *
 * Extracted from src/app/dashboard/page.tsx so the dashboard overview and the
 * dedicated list pages render the same status text and colour for a given row.
 */

export const PROPOSAL_STATUS_LABEL: Record<string, string> = {
  SUBMITTED: "Submitted",
  UNDER_REVIEW: "Under review",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
  SELECTED: "Selected",
  COMPLETED: "Completed",
};

export const CONNECTION_STATUS_LABEL: Record<string, string> = {
  PENDING_ACKNOWLEDGEMENT: "Pending acknowledgement",
  IN_PROGRESS: "In progress",
  AWAITING_VERIFICATION: "Awaiting verification",
  COMPLETED: "Completed",
  FAILED: "Failed",
  DISPUTED: "Disputed",
};

export function statusVariant(status: string) {
  if (status === "COMPLETED" || status === "SELECTED" || status === "ACTIVE")
    return "success";
  if (status === "DISPUTED" || status === "FAILED" || status === "REJECTED")
    return "destructive";
  if (status === "PENDING_PAYMENT" || status === "AWAITING_VERIFICATION")
    return "warning";
  return "secondary";
}

/* ── Proposal state machine ────────────────────────────────────────────────
 *
 * These predicates are the single source of truth for "what can still happen to
 * this proposal?". They exist because the rule had drifted into five different
 * inline lists that disagreed with each other:
 *
 *   negotiations.ts:66   SELECTED, COMPLETED, REJECTED, WITHDRAWN   (action)
 *   proposal-card.tsx:70 COMPLETED, REJECTED, WITHDRAWN             (UI)
 *   negotiation-panel    COMPLETED, REJECTED, WITHDRAWN, EXPIRED    (UI)
 *
 * The first list was right: once a Seeker SELECTS a Linker the full reward is
 * committed from escrow (blueprint §3.9), so the terms are locked and neither
 * side may keep bargaining. Leaving SELECTED out of the UI lists meant a
 * finished engagement still offered "Counter-offer" and "Accept".
 *
 * Prefer these over writing the array inline.
 */

/** No further negotiation is possible — terms are locked or the proposal is void. */
export const PROPOSAL_TERMINAL_STATUSES = [
  "SELECTED",
  "COMPLETED",
  "REJECTED",
  "WITHDRAWN",
  "EXPIRED",
] as const;

/** The proposal can still be countered, accepted, or withdrawn. */
export function isProposalNegotiable(status: string | null | undefined): boolean {
  if (!status) return false;
  return !(PROPOSAL_TERMINAL_STATUSES as readonly string[]).includes(status);
}

/**
 * A Linker may still be chosen. Distinct from `isProposalNegotiable`: SELECTED
 * is terminal for negotiation but is still the trigger for opening the
 * connection, so the Seeker must be able to press Select again to recover an
 * interrupted handoff.
 */
export function isProposalSelectable(status: string | null | undefined): boolean {
  if (!status) return false;
  return !["COMPLETED", "REJECTED", "WITHDRAWN", "EXPIRED"].includes(status);
}

/* ── Connection state machine ──────────────────────────────────────────────
 *
 * A connection reaches a terminal state when the work is done, has failed, or is
 * under dispute. From that point the record is evidence for escrow release,
 * review, or an admin ruling — it must stop accepting new working data.
 *
 * This rule had also drifted: `deadlines.ts` and `progress-reports.ts` each held
 * their own copy, `completions.ts` a third, while `evidence.ts` and
 * `appointments.ts` had NO status guard at all — so a COMPLETED connection still
 * accepted fresh evidence and new appointment proposals, and notified the
 * counterparty about them.
 */

export const CONNECTION_CLOSED_STATUSES = [
  "COMPLETED",
  "FAILED",
  "DISPUTED",
] as const;

/** May the parties still add working data (progress, evidence, appointments)? */
export function isConnectionOpen(status: string | null | undefined): boolean {
  if (!status) return false;
  return !(CONNECTION_CLOSED_STATUSES as readonly string[]).includes(status);
}

/* ── Opportunity state machine ─────────────────────────────────────────────
 *
 * An opportunity stops accepting proposals once a Linker has been selected —
 * and stops accepting ANY change once the engagement ends.
 *
 * The distinction matters because completing a connection does NOT rewrite the
 * proposal rows behind it. A proposal can still read `Selected` (or even
 * `Under review`) on an opportunity that is already `COMPLETED`, so a surface
 * that gates only on the proposal's own status will happily keep offering
 * "Select this Linker" and "Counter-offer" on a finished project.
 *
 * Gate on BOTH: the proposal must be negotiable AND the opportunity still open.
 */

/** No new proposal may be submitted or selected. */
export const OPPORTUNITY_CLOSED_FOR_SELECTION_STATUSES = [
  "LINKER_SELECTED",
  "AWAITING_CONFIRMATION",
  "IN_PROGRESS",
  "APPOINTMENT_SCHEDULED",
  "AWAITING_VERIFICATION",
  "COMPLETED",
  "DISPUTED",
  "FAILED",
  "EXPIRED",
  "CANCELLED",
] as const;

/** The engagement is over — nothing about it may change any more. */
export const OPPORTUNITY_TERMINAL_STATUSES = [
  "COMPLETED",
  "DISPUTED",
  "FAILED",
  "EXPIRED",
  "CANCELLED",
] as const;

/** Can a Linker still be chosen on this opportunity? */
export function isOpportunitySelectable(
  status: string | null | undefined
): boolean {
  if (!status) return true;
  return !(OPPORTUNITY_CLOSED_FOR_SELECTION_STATUSES as readonly string[]).includes(
    status
  );
}

/** Is the opportunity finished for good — no selection, no negotiation? */
export function isOpportunityTerminal(status: string | null | undefined): boolean {
  if (!status) return false;
  return (OPPORTUNITY_TERMINAL_STATUSES as readonly string[]).includes(status);
}
