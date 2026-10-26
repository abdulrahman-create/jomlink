import { describe, it, expect, afterEach, vi } from "vitest";
import {
  kycDevBypassState,
  isKycDevBypassEnabled,
  KYC_BYPASS_ENV_VAR,
} from "./kyc-dev-bypass";

/**
 * Dev/test KYC bypass — the safety guarantee.
 *
 * The bypass exists so the withdrawal / AML / payout flows can be exercised in
 * dev and QA without hand-approving KYC. These tests pin the one property that
 * must never regress: **it cannot be enabled in production**, no matter what the
 * environment variable says.
 */

function setEnv(nodeEnv: string | undefined, flag: string | undefined) {
  vi.stubEnv("NODE_ENV", nodeEnv as string);
  if (flag === undefined) vi.stubEnv(KYC_BYPASS_ENV_VAR, "");
  else vi.stubEnv(KYC_BYPASS_ENV_VAR, flag);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("production is always refused", () => {
  it("refuses when the flag is set in production", () => {
    setEnv("production", "true");
    const state = kycDevBypassState();
    expect(state.enabled).toBe(false);
    expect(state.reason).toBe("PRODUCTION_BLOCKED");
  });

  it("refuses the affirmative variants in production too", () => {
    for (const flag of ["true", "TRUE", "1", "yes", " true "]) {
      setEnv("production", flag);
      expect(isKycDevBypassEnabled()).toBe(false);
    }
  });

  it("refuses when the flag is absent in production", () => {
    setEnv("production", undefined);
    expect(kycDevBypassState()).toMatchObject({
      enabled: false,
      reason: "PRODUCTION_BLOCKED",
    });
  });
});

describe("dev / test requires an explicit opt-in", () => {
  it("is off by default in development", () => {
    setEnv("development", undefined);
    expect(kycDevBypassState()).toMatchObject({
      enabled: false,
      reason: "FLAG_NOT_SET",
    });
  });

  it("is off in test unless opted in", () => {
    setEnv("test", undefined);
    expect(isKycDevBypassEnabled()).toBe(false);
  });

  it("enables in development when the flag is set", () => {
    setEnv("development", "true");
    expect(kycDevBypassState()).toMatchObject({
      enabled: true,
      reason: "ENABLED",
    });
  });

  it("accepts 1 / yes as well as true", () => {
    for (const flag of ["1", "yes", "YES"]) {
      setEnv("development", flag);
      expect(isKycDevBypassEnabled()).toBe(true);
    }
  });

  it("rejects a non-affirmative value", () => {
    for (const flag of ["false", "0", "no", "", "enable", "yes please"]) {
      setEnv("development", flag);
      expect(isKycDevBypassEnabled()).toBe(false);
    }
  });
});
