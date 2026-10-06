import { describe, expect, it } from "vitest";
import {
  CONNECTION_CLOSED_STATUSES,
  PROPOSAL_TERMINAL_STATUSES,
  isConnectionOpen,
  isOpportunitySelectable,
  isOpportunityTerminal,
  isProposalNegotiable,
  isProposalSelectable,
} from "@/lib/status";

/**
 * These tests exist because the rules they cover were each written in several
 * places that silently disagreed (see phase-12-lifecycle-guards-and-money-path.md).
 * They pin the *behaviour*, not the implementation, so a future edit that
 * reintroduces a divergent copy fails here rather than in production.
 */

describe("isProposalNegotiable", () => {
  it("allows negotiation while the proposal is still being decided", () => {
    expect(isProposalNegotiable("SUBMITTED")).toBe(true);
    expect(isProposalNegotiable("UNDER_REVIEW")).toBe(true);
  });

  it("treats SELECTED as terminal", () => {
    // The single most consequential assertion in this file. Selecting a Linker
    // commits the full reward from escrow, so the terms are locked. The UI used
    // to omit SELECTED from its closed list and kept offering Counter-offer and
    // Accept on an already-funded engagement.
    expect(isProposalNegotiable("SELECTED")).toBe(false);
  });

  it("rejects every other terminal status", () => {
    expect(isProposalNegotiable("COMPLETED")).toBe(false);
    expect(isProposalNegotiable("REJECTED")).toBe(false);
    expect(isProposalNegotiable("WITHDRAWN")).toBe(false);
    expect(isProposalNegotiable("EXPIRED")).toBe(false);
  });

  it("fails closed on a missing status", () => {
    // Safer to refuse than to assume a proposal is open and mutate money.
    expect(isProposalNegotiable(null)).toBe(false);
    expect(isProposalNegotiable(undefined)).toBe(false);
    expect(isProposalNegotiable("")).toBe(false);
  });

  it("treats an UNRECOGNISED status as negotiable (deny-list semantics)", () => {
    // Documents a real property of the implementation, and a real risk.
    //
    // The predicate is a deny-list: `!TERMINAL.includes(status)`. So a status
    // added to the schema later (say a new "ON_HOLD") is treated as OPEN until
    // someone remembers to add it here. For a path that commits money, an
    // allow-list would fail safer.
    //
    // This test asserts the CURRENT behaviour so the choice is explicit rather
    // than accidental. If the predicates are ever inverted to an allow-list,
    // this test should be updated deliberately — not deleted.
    expect(isProposalNegotiable("SOME_FUTURE_STATUS")).toBe(true);
  });

  it("is exactly the inverse of the terminal list", () => {
    for (const s of PROPOSAL_TERMINAL_STATUSES) {
      expect(isProposalNegotiable(s)).toBe(false);
    }
  });
});

describe("isProposalSelectable", () => {
  it("keeps SELECTED selectable, unlike negotiation", () => {
    // Deliberate asymmetry: an interrupted handoff can be completed by pressing
    // Select again without re-charging escrow. If this ever flips to false, the
    // recovery path silently breaks.
    expect(isProposalSelectable("SELECTED")).toBe(true);
    expect(isProposalNegotiable("SELECTED")).toBe(false);
  });

  it("allows selection while the proposal is live", () => {
    expect(isProposalSelectable("SUBMITTED")).toBe(true);
    expect(isProposalSelectable("UNDER_REVIEW")).toBe(true);
    expect(isProposalSelectable("ACCEPTED")).toBe(true);
  });

  it("refuses a proposal the Seeker already rejected or that was withdrawn", () => {
    expect(isProposalSelectable("REJECTED")).toBe(false);
    expect(isProposalSelectable("WITHDRAWN")).toBe(false);
    expect(isProposalSelectable("COMPLETED")).toBe(false);
    expect(isProposalSelectable("EXPIRED")).toBe(false);
  });

  it("fails closed on a missing status", () => {
    expect(isProposalSelectable(null)).toBe(false);
    expect(isProposalSelectable(undefined)).toBe(false);
  });
});

describe("isConnectionOpen", () => {
  it("allows work while the task is running", () => {
    expect(isConnectionOpen("PENDING_ACKNOWLEDGEMENT")).toBe(true);
    expect(isConnectionOpen("IN_PROGRESS")).toBe(true);
    expect(isConnectionOpen("AWAITING_VERIFICATION")).toBe(true);
  });

  it("closes on completion, failure and dispute", () => {
    for (const s of CONNECTION_CLOSED_STATUSES) {
      expect(isConnectionOpen(s)).toBe(false);
    }
    expect(isConnectionOpen("COMPLETED")).toBe(false);
    expect(isConnectionOpen("FAILED")).toBe(false);
    expect(isConnectionOpen("DISPUTED")).toBe(false);
  });

  it("fails closed on a missing status", () => {
    expect(isConnectionOpen(null)).toBe(false);
    expect(isConnectionOpen(undefined)).toBe(false);
    expect(isConnectionOpen("")).toBe(false);
  });

  it("treats an UNRECOGNISED status as open (deny-list semantics)", () => {
    // Same caveat as isProposalNegotiable: this is a deny-list, so a status the
    // list does not know about reads as open. Recorded deliberately — see the
    // note in the phase-12 doc under "Known risks".
    expect(isConnectionOpen("SOME_FUTURE_STATUS")).toBe(true);
  });
});

describe("isOpportunityTerminal", () => {
  it("is terminal only once the engagement has ended", () => {
    expect(isOpportunityTerminal("COMPLETED")).toBe(true);
    expect(isOpportunityTerminal("DISPUTED")).toBe(true);
    expect(isOpportunityTerminal("FAILED")).toBe(true);
    expect(isOpportunityTerminal("EXPIRED")).toBe(true);
    expect(isOpportunityTerminal("CANCELLED")).toBe(true);
  });

  it("is NOT terminal while a Linker is mid-engagement", () => {
    // These are closed to *new* proposals but still live work — treating them as
    // terminal would strip the negotiation UI from an active connection.
    expect(isOpportunityTerminal("LINKER_SELECTED")).toBe(false);
    expect(isOpportunityTerminal("IN_PROGRESS")).toBe(false);
    expect(isOpportunityTerminal("APPOINTMENT_SCHEDULED")).toBe(false);
    expect(isOpportunityTerminal("AWAITING_VERIFICATION")).toBe(false);
    expect(isOpportunityTerminal("NEGOTIATION")).toBe(false);
  });

  it("returns false on a missing status", () => {
    // Note the deliberate asymmetry with isConnectionOpen: an absent opportunity
    // status must not be read as terminal, or every card would render as closed.
    expect(isOpportunityTerminal(null)).toBe(false);
    expect(isOpportunityTerminal(undefined)).toBe(false);
  });
});

describe("isOpportunitySelectable", () => {
  it("allows selection while the opportunity is open", () => {
    expect(isOpportunitySelectable("ACTIVE")).toBe(true);
    expect(isOpportunitySelectable("PROPOSAL_RECEIVED")).toBe(true);
    expect(isOpportunitySelectable("NEGOTIATION")).toBe(true);
  });

  it("refuses selection once a Linker is committed", () => {
    expect(isOpportunitySelectable("LINKER_SELECTED")).toBe(false);
    expect(isOpportunitySelectable("IN_PROGRESS")).toBe(false);
    expect(isOpportunitySelectable("COMPLETED")).toBe(false);
    expect(isOpportunitySelectable("CANCELLED")).toBe(false);
  });

  it("treats a missing status as selectable", () => {
    // Asymmetry vs isOpportunityTerminal is intentional and matches the original
    // call site: an unknown opportunity must not block the Select button.
    expect(isOpportunitySelectable(null)).toBe(true);
    expect(isOpportunitySelectable(undefined)).toBe(true);
  });
});
