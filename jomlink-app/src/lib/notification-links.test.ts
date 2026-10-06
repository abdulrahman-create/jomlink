import { describe, expect, it } from "vitest";
import { resolveNotificationHref, toViewerRole } from "@/lib/notification-links";

/**
 * The resolver is pure and role-parameterised, so it is cheap to cover fully.
 * What matters is that a notification always lands the member somewhere they can
 * ACT — the whole point of the deep-link work (phase-12 §2).
 */

const OP = "6f2a1c8e-1111-2222-3333-444455556666";
const CONN = "aaaa1111-2222-3333-4444-555566667777";
const PROP = "bbbb1111-2222-3333-4444-555566667777";
const DISP = "cccc1111-2222-3333-4444-555566667777";

describe("toViewerRole", () => {
  it("maps the concrete member roles", () => {
    expect(toViewerRole("SEEKER")).toBe("SEEKER");
    expect(toViewerRole("LINKER")).toBe("LINKER");
  });

  it("biases BOTH toward SEEKER", () => {
    // A BOTH member can be either party on an event. SEEKER is chosen because its
    // proposal route is derived from opportunityId, so a BOTH member who was
    // actually the Linker still lands on a page listing the proposal.
    expect(toViewerRole("BOTH")).toBe("SEEKER");
  });

  it("lets admin status win over the member role", () => {
    expect(toViewerRole("SEEKER", true)).toBe("ADMIN");
    expect(toViewerRole("LINKER", true)).toBe("ADMIN");
  });

  it("returns UNKNOWN for missing or unrecognised roles", () => {
    expect(toViewerRole(null)).toBe("UNKNOWN");
    expect(toViewerRole(undefined)).toBe("UNKNOWN");
    expect(toViewerRole("WAT")).toBe("UNKNOWN");
  });
});

describe("resolveNotificationHref — proposal & negotiation events", () => {
  it("routes a LINKER to their own proposals list", () => {
    // The regression that started this work: the Linker was notified of a
    // counter-offer and had no page that showed it.
    const href = resolveNotificationHref(
      { type: "NEGOTIATION_COUNTER_OFFER", data: { proposalId: PROP, opportunityId: OP } },
      "LINKER"
    );
    expect(href).toBe("/dashboard/proposals");
  });

  it("routes a SEEKER to the proposals page for the opportunity", () => {
    const href = resolveNotificationHref(
      { type: "NEGOTIATION_COUNTER_OFFER", data: { proposalId: PROP, opportunityId: OP } },
      "SEEKER"
    );
    expect(href).toBe(`/opportunities/${OP}/proposals`);
  });

  it("does not send two roles to the same place for one proposal event", () => {
    // The two parties reach the same proposal through different pages; collapsing
    // this back to one route would put one of them somewhere useless.
    const data = { proposalId: PROP, opportunityId: OP };
    const asLinker = resolveNotificationHref(
      { type: "NEGOTIATION_COUNTER_OFFER", data },
      "LINKER"
    );
    const asSeeker = resolveNotificationHref(
      { type: "NEGOTIATION_COUNTER_OFFER", data },
      "SEEKER"
    );
    expect(asLinker).not.toBe(asSeeker);
  });

  it("covers the proposal lifecycle types", () => {
    for (const type of [
      "PROPOSAL_SUBMITTED",
      "PROPOSAL_RESUBMITTED",
      "PROPOSAL_WITHDRAWN",
      "NEGOTIATION_COUNTER_OFFER",
      "NEGOTIATION_TERMS_ACCEPTED",
    ]) {
      const href = resolveNotificationHref({ type, data: { opportunityId: OP } }, "SEEKER");
      expect(href).toBe(`/opportunities/${OP}/proposals`);
    }
  });

  it("falls back to the Seeker's received list when the opportunity is absent", () => {
    expect(
      resolveNotificationHref({ type: "PROPOSAL_SUBMITTED", data: {} }, "SEEKER")
    ).toBe("/dashboard/proposals-received");
  });
});

describe("resolveNotificationHref — connection-scoped events", () => {
  it("routes connection, evidence and deadline events to the workspace", () => {
    for (const type of [
      "CONNECTION_OPENED",
      "CONNECTION_COMPLETED",
      "CONNECTION_FAILED",
      "EVIDENCE_SUBMITTED",
      "DEADLINE_REQUESTED",
    ]) {
      expect(resolveNotificationHref({ type, data: { connectionId: CONN } }, "LINKER")).toBe(
        `/dashboard/connections/${CONN}`
      );
    }
  });

  it("routes progress events to the progress tab", () => {
    for (const type of ["PROGRESS_REPORT_POSTED", "PROGRESS_COMMENT_POSTED"]) {
      expect(resolveNotificationHref({ type, data: { connectionId: CONN } }, "SEEKER")).toBe(
        `/dashboard/connections/${CONN}/progress`
      );
    }
  });

  it("degrades to the connections list when the id is missing", () => {
    expect(resolveNotificationHref({ type: "CONNECTION_OPENED", data: {} }, "LINKER")).toBe(
      "/dashboard/connections"
    );
  });
});

describe("resolveNotificationHref — money, disputes and admin", () => {
  it("sends members to the wallet and admins to the transaction log", () => {
    expect(resolveNotificationHref({ type: "REFUND", data: {} }, "SEEKER")).toBe(
      "/dashboard/wallet"
    );
    expect(resolveNotificationHref({ type: "PAYOUT", data: {} }, "LINKER")).toBe(
      "/dashboard/wallet"
    );
    expect(resolveNotificationHref({ type: "REWARD_RELEASE", data: {} }, "ADMIN")).toBe(
      "/admin/transactions"
    );
  });

  it("sends a disputed connection to the workspace, or admins to the queue", () => {
    expect(
      resolveNotificationHref({ type: "DISPUTE_RAISED", data: { connectionId: CONN, disputeId: DISP } }, "SEEKER")
    ).toBe(`/dashboard/connections/${CONN}`);
    expect(
      resolveNotificationHref({ type: "DISPUTE_RAISED", data: { disputeId: DISP } }, "ADMIN")
    ).toBe("/admin/disputes");
  });

  it("routes KYC verdicts to the member's profile", () => {
    expect(resolveNotificationHref({ type: "ADMIN_KYC_APPROVED", data: {} }, "LINKER")).toBe(
      "/dashboard/profile"
    );
    expect(
      resolveNotificationHref({ type: "ADMIN_RELATIONSHIP_REJECTED", data: {} }, "SEEKER")
    ).toBe("/dashboard/profile");
  });
});

describe("resolveNotificationHref — safety and malformed input", () => {
  it("returns null for an unknown type rather than a bogus route", () => {
    expect(resolveNotificationHref({ type: "BRAND_NEW_EVENT", data: {} }, "SEEKER")).toBeNull();
  });

  it("returns null when data is missing entirely", () => {
    expect(resolveNotificationHref({ type: "DISPUTE_RAISED", data: null }, "SEEKER")).toBeNull();
    expect(resolveNotificationHref({ type: "DISPUTE_RAISED", data: null }, "ADMIN")).toBe(
      "/admin/disputes"
    );
  });

  it("never returns a protocol-relative or absolute URL", () => {
    // Important: the href is rendered into a form and replayed by the server
    // action, which rejects non-relative paths. A resolver that could emit
    // "//evil.com" would turn the notifications list into an open redirect.
    const types = [
      "PROPOSAL_SUBMITTED",
      "NEGOTIATION_COUNTER_OFFER",
      "CONNECTION_OPENED",
      "PROGRESS_REPORT_POSTED",
      "EVIDENCE_SUBMITTED",
      "DEADLINE_REQUESTED",
      "REFUND",
      "PAYOUT",
      "ADMIN_KYC_APPROVED",
      "OPPORTUNITY_FUNDING",
    ];
    for (const type of types) {
      for (const role of ["SEEKER", "LINKER", "ADMIN", "UNKNOWN"] as const) {
        const href = resolveNotificationHref(
          { type, data: { connectionId: CONN, opportunityId: OP, proposalId: PROP } },
          role
        );
        if (href !== null) {
          expect(href.startsWith("/")).toBe(true);
          expect(href.startsWith("//")).toBe(false);
          expect(href).not.toMatch(/^[a-z]+:/i);
        }
      }
    }
  });

  it("ignores non-string id values instead of interpolating them", () => {
    const href = resolveNotificationHref(
      { type: "CONNECTION_OPENED", data: { connectionId: { evil: true } as unknown as string } },
      "LINKER"
    );
    expect(href).toBe("/dashboard/connections");
  });
});
