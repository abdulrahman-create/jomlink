import { describe, it, expect } from "vitest";
import {
  planClawback,
  isWithinClawbackWindow,
  clawbackDeadline,
} from "./clawback";

/**
 * Post-release clawback policy (§5.12.1, §11.7).
 *
 * The invariant that matters most: the platform must never silently make a
 * wallet negative and must never claim a full recovery it did not achieve.
 */

describe("planClawback", () => {
  it("recovers the full amount when the wallet can cover it", () => {
    const p = planClawback({ amount: 450, walletBalance: 1000, capAmount: 450 });
    expect(p.ok).toBe(true);
    expect(p.recoverFromWallet).toBe(450);
    expect(p.outstanding).toBe(0);
    expect(p.status).toBe("RECOVERED");
    expect(p.requiresManualReview).toBe(false);
  });

  it("recovers only what is available and records the shortfall", () => {
    const p = planClawback({ amount: 450, walletBalance: 100, capAmount: 450 });
    expect(p.ok).toBe(true);
    expect(p.recoverFromWallet).toBe(100);
    expect(p.outstanding).toBe(350);
    expect(p.status).toBe("PARTIAL");
    expect(p.requiresManualReview).toBe(true);
  });

  it("never recovers from an empty wallet — outstanding, not written off", () => {
    const p = planClawback({ amount: 450, walletBalance: 0, capAmount: 450 });
    expect(p.ok).toBe(true);
    expect(p.recoverFromWallet).toBe(0);
    expect(p.outstanding).toBe(450);
    expect(p.status).toBe("PENDING");
    expect(p.requiresManualReview).toBe(true);
  });

  it("never produces a negative recovery from a negative balance", () => {
    const p = planClawback({ amount: 450, walletBalance: -200, capAmount: 450 });
    expect(p.recoverFromWallet).toBe(0);
    expect(p.outstanding).toBe(450);
  });

  it("refuses to claw back more than was released for the job", () => {
    const p = planClawback({ amount: 900, walletBalance: 5000, capAmount: 450 });
    expect(p.ok).toBe(false);
    expect(p.error).toMatch(/cannot exceed/i);
  });

  it("refuses a clawback when nothing was released", () => {
    const p = planClawback({ amount: 450, walletBalance: 1000, capAmount: 0 });
    expect(p.ok).toBe(false);
  });

  it("rejects zero, negative and non-numeric amounts", () => {
    for (const amount of [0, -10, NaN]) {
      expect(
        planClawback({ amount, walletBalance: 1000, capAmount: 450 }).ok
      ).toBe(false);
    }
  });

  it("avoids float drift on awkward values", () => {
    const p = planClawback({
      amount: 0.1 + 0.2,
      walletBalance: 1,
      capAmount: 1,
    });
    expect(p.ok).toBe(true);
    expect(p.recoverFromWallet).toBe(0.3);
    expect(p.outstanding).toBe(0);
  });

  it("bumps a fully-covered amount to RECOVERED on exact equality", () => {
    const p = planClawback({ amount: 450, walletBalance: 450, capAmount: 450 });
    expect(p.status).toBe("RECOVERED");
    expect(p.outstanding).toBe(0);
  });
});

describe("clawback window", () => {
  const release = "2026-10-20T10:00:00.000Z";
  const at = (days: number, hours = 0) =>
    new Date(
      new Date(release).getTime() + days * 86400000 + hours * 3600000
    );

  it("is open immediately after release", () => {
    expect(isWithinClawbackWindow(release, at(0))).toBe(true);
  });

  it("is still open 6 days 23 hours later (7-day window)", () => {
    expect(isWithinClawbackWindow(release, at(6, 23))).toBe(true);
  });

  it("is closed after the 7-day window", () => {
    expect(isWithinClawbackWindow(release, at(7, 1))).toBe(false);
  });

  it("is closed when nothing was released", () => {
    expect(isWithinClawbackWindow(null)).toBe(false);
    expect(isWithinClawbackWindow(undefined)).toBe(false);
  });

  it("fails closed on an unparseable release timestamp", () => {
    expect(isWithinClawbackWindow("not-a-date")).toBe(false);
  });

  it("reports the deadline 7 days after release", () => {
    expect(clawbackDeadline(release)?.toISOString()).toBe(
      "2026-10-27T10:00:00.000Z"
    );
  });
});
