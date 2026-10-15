import { describe, expect, it } from "vitest";
import { isHighRisk, scoreCompletionRisk, type VerificationInput } from "./verification";

/**
 * Phase 14 — completion risk scoring (blueprint §5.12.1).
 *
 * These tests pin the anti-collusion behaviour: a first-time pair, zero progress
 * reports, instant evidence, or a meeting with no target acknowledgement must
 * each force HIGH risk (and therefore a hold), regardless of the other signals.
 */

/** A clean, low-risk completion to override per-test. */
function base(overrides: Partial<VerificationInput> = {}): VerificationInput {
  return {
    connectionId: "conn-1",
    evidenceCount: 3,
    hasTargetAcknowledgement: true,
    progressReportCount: 4,
    linkerIsFirstTime: false,
    seekerIsFirstTime: false,
    hoursSinceDeadlineAccepted: 72,
    isMeetingType: true,
    minHoursAfterDeadline: 24,
    ...overrides,
  };
}

describe("scoreCompletionRisk", () => {
  it("returns LOW for a clean, well-evidenced completion", () => {
    const r = scoreCompletionRisk(base());
    expect(r.riskLevel).toBe("LOW");
    expect(r.riskScore).toBe(0);
    expect(r.reasons).toContain("No risk signals detected.");
  });

  it("flags HIGH when evidence lands almost immediately after the deadline", () => {
    const r = scoreCompletionRisk(base({ hoursSinceDeadlineAccepted: 2 }));
    expect(r.riskLevel).toBe("HIGH");
    expect(r.reasons.join(" ")).toMatch(/after deadline acceptance/);
  });

  it("does not flag instant evidence when there is no accepted deadline (Infinity)", () => {
    const r = scoreCompletionRisk(
      base({ hoursSinceDeadlineAccepted: Number.POSITIVE_INFINITY })
    );
    // Infinity is not < minHours, so the timing signal is absent.
    expect(r.reasons.join(" ")).not.toMatch(/after deadline acceptance/);
    expect(r.riskLevel).toBe("LOW");
  });

  it("flags HIGH for a first-time Linker AND a first-time Seeker", () => {
    const r = scoreCompletionRisk(
      base({ linkerIsFirstTime: true, seekerIsFirstTime: true })
    );
    expect(r.riskLevel).toBe("HIGH");
    expect(r.reasons.join(" ")).toMatch(/first engagement/);
  });

  it("does NOT flag a first-time pair when only ONE side is new", () => {
    const r = scoreCompletionRisk(
      base({ linkerIsFirstTime: true, seekerIsFirstTime: false })
    );
    // A single first-timer is ordinary; only the pair is a collusion signal.
    expect(r.reasons.join(" ")).not.toMatch(/first engagement/);
    expect(r.riskLevel).toBe("LOW");
  });

  it("flags HIGH when no progress reports were filed", () => {
    const r = scoreCompletionRisk(base({ progressReportCount: 0 }));
    expect(r.riskLevel).toBe("HIGH");
    expect(r.reasons.join(" ")).toMatch(/No progress reports/);
  });

  it("flags HIGH for a meeting-type opportunity with no target acknowledgement", () => {
    const r = scoreCompletionRisk(
      base({ isMeetingType: true, hasTargetAcknowledgement: false })
    );
    expect(r.riskLevel).toBe("HIGH");
    expect(r.reasons.join(" ")).toMatch(/target acknowledgement/);
  });

  it("does not require a target acknowledgement for a non-meeting opportunity", () => {
    const r = scoreCompletionRisk(
      base({ isMeetingType: false, hasTargetAcknowledgement: false })
    );
    expect(r.reasons.join(" ")).not.toMatch(/target acknowledgement/);
    expect(r.riskLevel).toBe("LOW");
  });

  it("returns MEDIUM for thin (single-item) evidence alone", () => {
    const r = scoreCompletionRisk(base({ evidenceCount: 1 }));
    expect(r.riskLevel).toBe("MEDIUM");
    expect(r.riskScore).toBeGreaterThanOrEqual(10);
  });

  it("stays LOW for two evidence items (minor bump only)", () => {
    const r = scoreCompletionRisk(base({ evidenceCount: 2 }));
    expect(r.riskLevel).toBe("LOW");
  });

  it("treats zero evidence as a medium signal, not a silent pass", () => {
    const r = scoreCompletionRisk(base({ evidenceCount: 0 }));
    expect(r.riskScore).toBeGreaterThan(0);
    expect(r.reasons.join(" ")).toMatch(/No evidence items/);
  });

  it("caps the score at 100", () => {
    const r = scoreCompletionRisk(
      base({
        evidenceCount: 0,
        hasTargetAcknowledgement: false,
        progressReportCount: 0,
        linkerIsFirstTime: true,
        seekerIsFirstTime: true,
        hoursSinceDeadlineAccepted: 0,
      })
    );
    expect(r.riskLevel).toBe("HIGH");
    expect(r.riskScore).toBeLessThanOrEqual(100);
    expect(r.riskScore).toBeGreaterThanOrEqual(50);
  });

  it("honours a custom minHoursAfterDeadline", () => {
    const r = scoreCompletionRisk(
      base({ hoursSinceDeadlineAccepted: 5, minHoursAfterDeadline: 1 })
    );
    expect(r.reasons.join(" ")).not.toMatch(/after deadline acceptance/);
  });
});

describe("isHighRisk", () => {
  it("is true only for HIGH", () => {
    expect(isHighRisk("HIGH")).toBe(true);
    expect(isHighRisk("MEDIUM")).toBe(false);
    expect(isHighRisk("LOW")).toBe(false);
  });
});
