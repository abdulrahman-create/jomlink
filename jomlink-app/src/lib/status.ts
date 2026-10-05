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
