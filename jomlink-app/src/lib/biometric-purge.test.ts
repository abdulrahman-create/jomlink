import { describe, it, expect } from "vitest";
import {
  planBiometricPurge,
  isEligibleForTraining,
  trainingConsentStatus,
  type PurgeCandidate,
  type TrainingConsentState,
} from "./biometric-purge";
import { BIOMETRIC_RETENTION } from "./constants";

const NOW = new Date("2026-10-26T12:00:00.000Z");

/** A capture created `days` ago (relative to NOW). */
function capture(
  id: string,
  days: number,
  overrides: Partial<PurgeCandidate> = {}
): PurgeCandidate {
  return {
    id,
    user_id: "user-1",
    selfie_path: `user-1/selfie-${id}.jpg`,
    id_document_path: `user-1/id-${id}.jpg`,
    created_at: new Date(NOW.getTime() - days * 86_400_000).toISOString(),
    purge_requested_at: null,
    ...overrides,
  };
}

describe("planBiometricPurge — deletion decision", () => {
  it("deletes a capture whose member requested a purge (§11.11 mandatory purge)", () => {
    const rows = [
      capture("a", 1, { purge_requested_at: "2026-10-25T00:00:00.000Z" }),
    ];
    const plan = planBiometricPurge(rows, NOW);
    expect(plan.deleteIds).toEqual(["a"]);
    expect(plan.counts.purgeRequested).toBe(1);
    expect(plan.counts.deleted).toBe(1);
  });

  it("retains a fresh, unflagged capture", () => {
    const plan = planBiometricPurge([capture("fresh", 2)], NOW);
    expect(plan.deleteIds).toEqual([]);
    expect(plan.counts.retained).toBe(1);
  });

  it("deletes a capture past the KYC retention period even when nobody asked", () => {
    const rows = [capture("old", BIOMETRIC_RETENTION.KYC_RETENTION_DAYS + 1)];
    const plan = planBiometricPurge(rows, NOW);
    expect(plan.deleteIds).toEqual(["old"]);
    expect(plan.counts.ageExpired).toBe(1);
  });

  it("keeps a capture exactly one day inside the retention period", () => {
    const rows = [capture("edge", BIOMETRIC_RETENTION.KYC_RETENTION_DAYS - 1)];
    expect(planBiometricPurge(rows, NOW).deleteIds).toEqual([]);
  });

  it("collects BOTH storage object paths for a deleted capture", () => {
    const rows = [
      capture("both", 1, { purge_requested_at: "2026-10-25T00:00:00.000Z" }),
    ];
    const plan = planBiometricPurge(rows, NOW);
    expect(plan.deletePaths).toEqual([
      "user-1/selfie-both.jpg",
      "user-1/id-both.jpg",
    ]);
  });

  it("does not duplicate a path when selfie and ID file are the same object", () => {
    const rows = [
      capture("dup", 1, {
        purge_requested_at: "2026-10-25T00:00:00.000Z",
        selfie_path: "user-1/same.jpg",
        id_document_path: "user-1/same.jpg",
      }),
    ];
    expect(planBiometricPurge(rows, NOW).deletePaths).toEqual(["user-1/same.jpg"]);
  });

  it("only deletes the requested rows in a mixed batch", () => {
    const rows = [
      capture("keep", 10),
      capture("purge", 10, { purge_requested_at: "2026-10-25T00:00:00.000Z" }),
      capture("keep-too", 30),
    ];
    const plan = planBiometricPurge(rows, NOW);
    expect(plan.deleteIds).toEqual(["purge"]);
    expect(plan.counts.scanned).toBe(3);
    expect(plan.counts.retained).toBe(2);
  });

  it("a purge request outranks retention (withdrawn consent deletes immediately)", () => {
    const rows = [
      capture("withdrawn", 0, { purge_requested_at: "2026-10-26T11:59:00.000Z" }),
    ];
    expect(planBiometricPurge(rows, NOW).deleteIds).toEqual(["withdrawn"]);
  });

  it("does NOT silently retain a row whose created_at is unparseable", () => {
    const rows = [
      capture("bad", 1, { created_at: "not-a-date" }),
    ];
    const plan = planBiometricPurge(rows, NOW);
    expect(plan.deleteIds).toEqual([]);
    expect(plan.retained).toHaveLength(1);
    expect(plan.retained[0].note).toContain("unparseable");
  });

  it("still deletes an unparseable row when a purge was requested", () => {
    const rows = [
      capture("bad", 1, {
        created_at: "not-a-date",
        purge_requested_at: "2026-10-25T00:00:00.000Z",
      }),
    ];
    expect(planBiometricPurge(rows, NOW).deleteIds).toEqual(["bad"]);
  });

  it("handles an empty corpus without throwing", () => {
    const plan = planBiometricPurge([], NOW);
    expect(plan.deleteIds).toEqual([]);
    expect(plan.deletePaths).toEqual([]);
    expect(plan.truncated).toBe(false);
    expect(plan.counts.scanned).toBe(0);
  });
});

describe("planBiometricPurge — batch cap", () => {
  it("respects the batch size and reports truncation", () => {
    const rows = Array.from({ length: 5 }, (_, i) =>
      capture(`r${i}`, 1, { purge_requested_at: "2026-10-25T00:00:00.000Z" })
    );
    const plan = planBiometricPurge(rows, NOW, { batchSize: 2 });
    expect(plan.deleteIds).toHaveLength(2);
    expect(plan.truncated).toBe(true);
  });

  it("is not truncated when the corpus fits the batch", () => {
    const plan = planBiometricPurge([capture("one", 1)], NOW, { batchSize: 2 });
    expect(plan.truncated).toBe(false);
  });
});

describe("isEligibleForTraining — secondary purpose (§11.11)", () => {
  const consent = (over: Partial<TrainingConsentState> = {}): TrainingConsentState => ({
    biometricConsent: true,
    trainingConsent: true,
    trainingConsentWithdrawnAt: null,
    ...over,
  });

  it("allows training only when the SEPARATE training consent is granted", () => {
    expect(isEligibleForTraining({ purge_requested_at: null }, consent())).toBe(true);
  });

  it("refuses when only the KYC consent was given (no bundled consent)", () => {
    expect(
      isEligibleForTraining(
        { purge_requested_at: null },
        consent({ biometricConsent: true, trainingConsent: false })
      )
    ).toBe(false);
  });

  it("refuses after training consent is withdrawn", () => {
    expect(
      isEligibleForTraining(
        { purge_requested_at: null },
        consent({ trainingConsentWithdrawnAt: "2026-10-20T00:00:00.000Z" })
      )
    ).toBe(false);
  });

  it("refuses a capture that is scheduled for purge", () => {
    expect(
      isEligibleForTraining(
        { purge_requested_at: "2026-10-25T00:00:00.000Z" },
        consent()
      )
    ).toBe(false);
  });

  it("refuses an unscoped/unknown capture (fail closed)", () => {
    expect(
      isEligibleForTraining(
        { purge_requested_at: undefined },
        consent({ trainingConsent: false })
      )
    ).toBe(false);
  });
});

describe("trainingConsentStatus — member-facing copy", () => {
  it("reports an active consent", () => {
    const s = trainingConsentStatus({
      biometricConsent: true,
      trainingConsent: true,
      trainingConsentWithdrawnAt: null,
    });
    expect(s.tone).toBe("active");
  });

  it("reports a withdrawal rather than 'not given'", () => {
    const s = trainingConsentStatus({
      biometricConsent: true,
      trainingConsent: false,
      trainingConsentWithdrawnAt: "2026-10-20T00:00:00.000Z",
    });
    expect(s.tone).toBe("withdrawn");
  });

  it("reports 'not granted' when training was never opted into", () => {
    const s = trainingConsentStatus({
      biometricConsent: true,
      trainingConsent: false,
      trainingConsentWithdrawnAt: null,
    });
    expect(s.tone).toBe("not-granted");
  });
});
