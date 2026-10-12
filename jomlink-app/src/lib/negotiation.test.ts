import { describe, expect, it } from "vitest";
import {
  canRespondToLatestOffer,
  latestNegotiation,
  negotiationRoleOf,
} from "@/lib/negotiation";
import type { ProposalNegotiationRow } from "@/lib/jomlink-types";

/**
 * These tests pin the turn-taking rule that the Counter-offer button depends on.
 *
 * The bug they cover: the button was gated only on "is this proposal still
 * negotiable?", never on "is it my turn?". So the author of the standing offer
 * could post counter-offer after counter-offer against themselves while the
 * other side never replied.
 */

function offer(
  from_role: string | null,
  offered_reward = 2000
): ProposalNegotiationRow {
  return {
    id: `n-${from_role}-${offered_reward}`,
    proposal_id: "p-1",
    from_role,
    offered_reward,
    message: null,
    status: "COUNTER",
    created_at: "2026-10-07T00:00:00.000Z",
  };
}

describe("latestNegotiation", () => {
  it("returns the last row, which is the offer on the table", () => {
    const thread = [offer("SEEKER", 2000), offer("LINKER", 2100)];
    expect(latestNegotiation(thread)?.offered_reward).toBe(2100);
  });

  it("returns null for an empty or missing thread", () => {
    expect(latestNegotiation([])).toBeNull();
    expect(latestNegotiation(null)).toBeNull();
    expect(latestNegotiation(undefined)).toBeNull();
  });
});

describe("negotiationRoleOf", () => {
  it("maps the stored roles", () => {
    expect(negotiationRoleOf(offer("SEEKER"))).toBe("SEEKER");
    expect(negotiationRoleOf(offer("LINKER"))).toBe("LINKER");
  });

  it("returns null for an unknown or absent author", () => {
    expect(negotiationRoleOf(offer(null))).toBeNull();
    expect(negotiationRoleOf(offer("ADMIN"))).toBeNull();
    expect(negotiationRoleOf(null)).toBeNull();
  });
});

describe("canRespondToLatestOffer", () => {
  it("lets the counterparty answer the standing offer", () => {
    // Seeker offered last → the Linker is on turn.
    expect(canRespondToLatestOffer([offer("SEEKER")], "LINKER")).toBe(true);
    // Linker offered last → the Seeker is on turn.
    expect(canRespondToLatestOffer([offer("LINKER")], "SEEKER")).toBe(true);
  });

  it("blocks the author of the standing offer — the reported bug", () => {
    // The Linker posted RM2,100 and must now wait; previously the button stayed
    // enabled and they could counter their own offer.
    expect(canRespondToLatestOffer([offer("LINKER", 2100)], "LINKER")).toBe(false);
    expect(canRespondToLatestOffer([offer("SEEKER", 2000)], "SEEKER")).toBe(false);
  });

  it("re-opens the turn once the other side responds", () => {
    const thread = [offer("SEEKER", 2000), offer("LINKER", 2100)];
    // Linker authored the latest offer, so the Linker waits...
    expect(canRespondToLatestOffer(thread, "LINKER")).toBe(false);
    // ...and the Seeker may answer.
    expect(canRespondToLatestOffer(thread, "SEEKER")).toBe(true);

    // Seeker answers → the turn flips back to the Linker.
    const answered = [...thread, offer("SEEKER", 2050)];
    expect(canRespondToLatestOffer(answered, "LINKER")).toBe(true);
    expect(canRespondToLatestOffer(answered, "SEEKER")).toBe(false);
  });

  it("lets both sides act when nobody has countered yet", () => {
    // With no thread the original proposal terms are on the table, which the
    // Linker authored and the Seeker may answer.
    expect(canRespondToLatestOffer([], "SEEKER")).toBe(true);
    expect(canRespondToLatestOffer([], "LINKER")).toBe(true);
    expect(canRespondToLatestOffer(null, "SEEKER")).toBe(true);
  });

  it("fails open on an unrecognised author", () => {
    // A row whose author cannot be determined must not freeze the negotiation
    // for both parties.
    expect(canRespondToLatestOffer([offer("ADMIN")], "SEEKER")).toBe(true);
    expect(canRespondToLatestOffer([offer(null)], "LINKER")).toBe(true);
  });
});