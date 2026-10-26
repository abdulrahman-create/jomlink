import { describe, it, expect } from "vitest";
import {
  screenPayout,
  canSettlePayout,
  hitDenyList,
  requiresComplianceClearance,
  LOCAL_DENY_LIST,
  type ScreenPayoutInput,
} from "./screening";
import { AML } from "./constants";

/**
 * Blueprint v1.2 §11.9.2 — AML / sanctions / KYC-before-payout.
 *
 * These pin the four rules the blueprint makes *enforced*, not advisory:
 *   1. a screen runs before settlement and a hit halts it;
 *   2. no money-out without identity verification, and it is NOT overridable;
 *   3. monitoring thresholds raise a payout to review;
 *   4. the result is attributable (list version + machine-readable codes).
 */

const NOW = new Date("2026-10-26T12:00:00.000Z");

function base(over: Partial<ScreenPayoutInput> = {}): ScreenPayoutInput {
  return {
    kycVerified: true,
    names: ["Aisyah Rahman"],
    amount: 500,
    payoutsInWindow: 0,
    lastTopUpAt: null,
    now: NOW,
    ...over,
  };
}

describe("KYC-before-payout (§11.9.2 rule 2)", () => {
  it("blocks an unverified member", () => {
    const r = screenPayout(base({ kycVerified: false }));
    expect(r.risk).toBe("BLOCKED");
    expect(r.codes).toContain("KYC_NOT_VERIFIED");
  });

  it("cannot be overridden at settlement — the BLOCKED state is final", () => {
    const r = screenPayout(base({ kycVerified: false }));
    expect(canSettlePayout(r, true).allowed).toBe(false);
  });

  it("clears a verified member with no other signals", () => {
    const r = screenPayout(base());
    expect(r.risk).toBe("CLEAR");
    expect(r.codes).toEqual([]);
  });
});

describe("sanctions / PEP screen (§11.9.2 rule 1)", () => {
  it("lands a deny-list hit as BLOCKED", () => {
    const r = screenPayout(base({ names: [LOCAL_DENY_LIST[0]] }));
    expect(r.risk).toBe("BLOCKED");
    expect(r.codes).toContain("SANCTIONS_HIT");
  });

  it("matches on the bank beneficiary name, not only the member name", () => {
    const r = screenPayout(
      base({ names: ["Aisyah Rahman", LOCAL_DENY_LIST[0].toUpperCase()] })
    );
    expect(r.codes).toContain("SANCTIONS_HIT");
  });

  it("does not block on a partial unrelated name", () => {
    expect(hitDenyList(["Maybank Berhad"])).toBeNull();
  });

  it("reports that no provider is integrated (honesty, rule 5)", () => {
    const r = screenPayout(base());
    expect(r.providerConfigured).toBe(false);
  });
});

describe("transaction monitoring (§11.9.2 rule 3)", () => {
  it("raises a REVIEW at the single-transaction threshold", () => {
    const r = screenPayout(base({ amount: AML.PAYOUT_REVIEW_THRESHOLD }));
    expect(r.risk).toBe("REVIEW");
    expect(r.codes).toContain("SINGLE_TRANSACTION_THRESHOLD");
  });

  it("stays CLEAR just below the single-transaction threshold", () => {
    const r = screenPayout(base({ amount: AML.PAYOUT_REVIEW_THRESHOLD - 0.01 }));
    expect(r.risk).toBe("CLEAR");
  });

  it("raises a REVIEW when the cumulative window is breached (structuring)", () => {
    const r = screenPayout(
      base({ amount: 5_000, payoutsInWindow: AML.CUMULATIVE_PAYOUT_THRESHOLD - 5_000 })
    );
    expect(r.risk).toBe("REVIEW");
    expect(r.codes).toContain("CUMULATIVE_THRESHOLD");
  });

  it("raises a REVIEW for a rapid top-up then withdraw", () => {
    const r = screenPayout(
      base({
        // 2 hours before NOW — inside the 24h window.
        lastTopUpAt: new Date(NOW.getTime() - 2 * 3_600_000).toISOString(),
      })
    );
    expect(r.risk).toBe("REVIEW");
    expect(r.codes).toContain("RAPID_TOPUP_THEN_WITHDRAW");
  });

  it("ignores a top-up older than the rapid window", () => {
    const r = screenPayout(
      base({
        lastTopUpAt: new Date(
          NOW.getTime() - (AML.RAPID_TOPUP_WINDOW_HOURS + 1) * 3_600_000
        ).toISOString(),
      })
    );
    expect(r.risk).toBe("CLEAR");
  });

  it("ignores an unparseable top-up timestamp rather than failing open as REVIEW", () => {
    const r = screenPayout(base({ lastTopUpAt: "not-a-date" }));
    expect(r.risk).toBe("CLEAR");
  });
});

describe("settlement decision", () => {
  it("a REVIEW hold requires an explicit clearance", () => {
    const r = screenPayout(base({ amount: AML.PAYOUT_REVIEW_THRESHOLD }));
    expect(requiresComplianceClearance(r)).toBe(true);
    expect(canSettlePayout(r).allowed).toBe(false);
    expect(canSettlePayout(r, true).allowed).toBe(true);
  });

  it("a CLEAR screen settles without clearance", () => {
    const r = screenPayout(base());
    expect(requiresComplianceClearance(r)).toBe(false);
    expect(canSettlePayout(r).allowed).toBe(true);
  });

  it("BLOCKED beats a threshold REVIEW and is never overridable", () => {
    const r = screenPayout(
      base({ amount: AML.PAYOUT_REVIEW_THRESHOLD, kycVerified: false })
    );
    expect(r.risk).toBe("BLOCKED");
    expect(r.codes).toContain("SINGLE_TRANSACTION_THRESHOLD");
    expect(canSettlePayout(r, true).allowed).toBe(false);
  });
});

describe("attributability (§11.9.2 rule 4)", () => {
  it("stamps every result with the screen list version", () => {
    expect(screenPayout(base()).listVersion).toBe(AML.LIST_VERSION);
    expect(screenPayout(base({ kycVerified: false })).listVersion).toBe(
      AML.LIST_VERSION
    );
  });

  it("gives a reason for every code that fired", () => {
    const r = screenPayout(
      base({ kycVerified: false, amount: AML.PAYOUT_REVIEW_THRESHOLD })
    );
    expect(r.reasons.length).toBe(r.codes.length);
    expect(r.reasons.every((x) => x.length > 10)).toBe(true);
  });
});
