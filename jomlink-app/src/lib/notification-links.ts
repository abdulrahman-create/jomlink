import type { NotificationRow } from "@/lib/jomlink-types";

/**
 * Resolve a notification to the page where the recipient can act on it.
 *
 * Jomlink's notifications are useless if they are dead ends: a Linker told
 * "New counter-offer on a proposal" needs one click to reach the proposal and
 * reply. Every notification therefore carries ids in its `data` payload, and
 * this module turns that payload into a route.
 *
 * `data` is typed loosely (`Record<string, unknown>`) in the schema, so every
 * read is narrowed defensively — a malformed or legacy row resolves to the
 * notifications list rather than crashing the page.
 *
 * Routes are role-relative on purpose. The same `NEGOTIATION_COUNTER_OFFER`
 * event is delivered to whichever party did NOT act, and the two parties see a
 * proposal in different places:
 *   - the Seeker owns the opportunity → /opportunities/[id]/proposals
 *   - the Linker owns the proposal   → /dashboard/proposals
 * So callers pass the viewer's role and get the correct destination.
 */

export type ViewerRole = "SEEKER" | "LINKER" | "ADMIN" | "UNKNOWN";

/**
 * Collapse a member's `role` into a destination role.
 *
 * `BOTH` members are the awkward case: they can be either party on a
 * notification. We bias to SEEKER because the Seeker-facing proposal page is
 * the richer one and its route is derived from `opportunityId`, so a BOTH
 * member who happened to be the Linker still lands on a page that lists the
 * proposal. Admins get their own portal routes.
 */
export function toViewerRole(
  role: string | null | undefined,
  isAdmin = false
): ViewerRole {
  if (isAdmin) return "ADMIN";
  if (role === "SEEKER") return "SEEKER";
  if (role === "LINKER") return "LINKER";
  if (role === "BOTH") return "SEEKER";
  return "UNKNOWN";
}

/** Safe string read from the loosely-typed `data` payload. */
function str(data: Record<string, unknown> | null, key: string): string | null {
  const value = data?.[key];
  if (typeof value === "string" && value.length > 0) return value;
  if (typeof value === "number") return String(value);
  return null;
}

/** The proposals page a given role should be sent to for a proposal event. */
function proposalsRoute(role: ViewerRole, opportunityId: string | null): string {
  // The Linker authored the proposal, so their own list is the right place.
  if (role === "LINKER") return "/dashboard/proposals";
  // The Seeker reviews proposals on the opportunity they posted.
  if (opportunityId) return `/opportunities/${opportunityId}/proposals`;
  return "/dashboard/proposals-received";
}

/**
 * Where should clicking this notification take the recipient?
 * Returns a same-origin path, or null when there is nowhere useful to go.
 */
export function resolveNotificationHref(
  notification: Pick<NotificationRow, "type" | "data">,
  role: ViewerRole = "UNKNOWN"
): string | null {
  const type = notification.type ?? "";
  const data = notification.data;
  const opportunityId = str(data, "opportunityId");
  const connectionId = str(data, "connectionId");
  const proposalId = str(data, "proposalId");
  const disputeId = str(data, "disputeId");

  // ── Proposals: submit, resubmit, withdraw ──────────────────
  if (type.startsWith("PROPOSAL_")) {
    return proposalsRoute(role, opportunityId);
  }

  // ── Negotiation: counter-offers and accepted terms ─────────
  // These are the events that most need a working destination — the recipient
  // is expected to respond with a counter-offer or an acceptance.
  if (type.startsWith("NEGOTIATION_")) {
    return proposalsRoute(role, opportunityId);
  }

  // ── Connections: workspace, progress, evidence, deadlines, completion ──
  if (type.startsWith("CONNECTION_")) {
    if (connectionId) return `/dashboard/connections/${connectionId}`;
    return "/dashboard/connections";
  }
  if (type.startsWith("PROGRESS_")) {
    // Comments and reports live on the progress tab of the connection.
    if (connectionId) return `/dashboard/connections/${connectionId}/progress`;
    return "/dashboard/connections";
  }
  if (type.startsWith("EVIDENCE_") || type.startsWith("DEADLINE_")) {
    if (connectionId) return `/dashboard/connections/${connectionId}`;
    return "/dashboard/connections";
  }

  // ── Disputes ───────────────────────────────────────────────
  if (type.startsWith("DISPUTE_")) {
    if (role === "ADMIN") return "/admin/disputes";
    if (connectionId) return `/dashboard/connections/${connectionId}`;
    return null;
  }

  // ── Money ──────────────────────────────────────────────────
  if (
    type.startsWith("PAYOUT") ||
    type.startsWith("REFUND") ||
    type.startsWith("TRANSACTION") ||
    type.startsWith("WALLET_") ||
    type === "REWARD_RELEASE" ||
    type === "LINKER_SERVICE_FEE" ||
    type === "LISTING_FEE"
  ) {
    if (role === "ADMIN") return "/admin/transactions";
    return "/dashboard/wallet";
  }

  // ── Admin moderation ───────────────────────────────────────
  if (type.startsWith("ADMIN_KYC") || type.startsWith("ADMIN_RELATIONSHIP")) {
    // Recipient is the member whose submission was reviewed.
    return "/dashboard/profile";
  }
  if (type.startsWith("ADMIN_OPPORTUNITY")) {
    if (role === "ADMIN") return "/admin/opportunities";
    return opportunityId ? `/opportunities/${opportunityId}` : "/dashboard";
  }
  if (type.startsWith("ADMIN_MEMBER")) {
    if (role === "ADMIN") return "/admin/members";
    return "/dashboard";
  }

  // ── Opportunity funding (Seeker escrowed the reward) ───────
  if (type === "OPPORTUNITY_FUNDING") {
    return opportunityId ? `/opportunities/${opportunityId}` : "/dashboard/wallet";
  }

  // Unknown / unhandled type: keep the row inert rather than linking nowhere.
  void proposalId;
  void disputeId;
  return null;
}
