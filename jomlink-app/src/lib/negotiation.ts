/**
 * Negotiation turn-taking.
 *
 * A counter-offer is a two-sided conversation, so at any moment exactly one side
 * is "on turn": the party who did NOT author the standing offer. That party may
 * accept it or answer it with a counter-offer. The author must wait.
 *
 * This rule was previously written inline in two places that only ever answered
 * "may I accept?" — `proposal-card.tsx` and `dashboard/proposals/page.tsx` — and
 * neither surface asked "may I counter?". The result was that Counter-offer
 * stayed enabled for the author of the standing offer, so a member could post
 * counter-offer after counter-offer against themselves without the other side
 * ever replying. Both questions are the same question, so they are answered here
 * once.
 *
 * Pure logic only — no Supabase, no React — so it is unit-testable and can be
 * shared by the server pages and the client panel.
 */

import type { ProposalNegotiationRow } from "@/lib/jomlink-types";

export type NegotiationRole = "SEEKER" | "LINKER";

/** The offer currently on the table, or null when nobody has countered yet. */
export function latestNegotiation(
  thread: ProposalNegotiationRow[] | null | undefined
): ProposalNegotiationRow | null {
  if (!thread || thread.length === 0) return null;
  return thread[thread.length - 1];
}

/** Normalise a stored `from_role`; an unrecognised value yields null. */
export function negotiationRoleOf(
  row: ProposalNegotiationRow | null | undefined
): NegotiationRole | null {
  if (!row) return null;
  if (row.from_role === "LINKER") return "LINKER";
  if (row.from_role === "SEEKER") return "SEEKER";
  return null;
}

/**
 * May `viewerRole` act on the standing offer — accept it, or answer it with a
 * counter-offer?
 *
 * True when the viewer did not author it. With no thread at all the original
 * proposal terms are on the table, which the Linker authored and the Seeker may
 * therefore answer, so both sides may act.
 *
 * Fails open on an unrecognised `from_role`: a row whose author cannot be
 * determined must not silently freeze the negotiation for both parties.
 */
export function canRespondToLatestOffer(
  thread: ProposalNegotiationRow[] | null | undefined,
  viewerRole: NegotiationRole
): boolean {
  const author = negotiationRoleOf(latestNegotiation(thread));
  if (!author) return true;
  return author !== viewerRole;
}