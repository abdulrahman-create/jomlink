import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import type { NextRequest } from "next/server";
import { authorizeCronRequest, CRON_SECRET_HEADER } from "./cron-auth";

/**
 * Regression coverage for PROJECT-TRACKING gap #12 / QA checklist §16.
 *
 * These routes move money (escrow release, payout reconcile) and send
 * notifications. Being callable without a secret in production is a launch
 * blocker, so the fail-closed policy is pinned by tests.
 */

const ORIGINAL_ENV = { ...process.env };

function makeRequest(secretHeader?: string): NextRequest {
  const headers = new Headers();
  if (secretHeader !== undefined) headers.set(CRON_SECRET_HEADER, secretHeader);
  return { headers } as unknown as NextRequest;
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

describe("authorizeCronRequest", () => {
  it("rejects when the header is missing (401)", () => {
    process.env.RECONCILE_SECRET = "s3cret";
    const r = authorizeCronRequest(makeRequest(), "test");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(401);
  });

  it("rejects a wrong secret (401)", () => {
    process.env.RECONCILE_SECRET = "s3cret";
    const r = authorizeCronRequest(makeRequest("nope"), "test");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(401);
  });

  it("rejects an empty header (401)", () => {
    process.env.RECONCILE_SECRET = "s3cret";
    const r = authorizeCronRequest(makeRequest(""), "test");
    expect(r.ok).toBe(false);
  });

  it("accepts the correct secret", () => {
    process.env.RECONCILE_SECRET = "s3cret";
    expect(authorizeCronRequest(makeRequest("s3cret"), "test")).toEqual({ ok: true });
  });

  it("fails closed in production when RECONCILE_SECRET is unset (503)", () => {
    delete process.env.RECONCILE_SECRET;
    vi.stubEnv("NODE_ENV", "production");
    const r = authorizeCronRequest(makeRequest(), "test");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(503);
  });

  it("stays open in local dev when RECONCILE_SECRET is unset", () => {
    delete process.env.RECONCILE_SECRET;
    vi.stubEnv("NODE_ENV", "development");
    expect(authorizeCronRequest(makeRequest(), "test")).toEqual({ ok: true });
  });

  it("does not leak the secret through length-based early exit", () => {
    process.env.RECONCILE_SECRET = "long-secret-value";
    // Different length must be rejected, not throw.
    expect(authorizeCronRequest(makeRequest("x"), "test").ok).toBe(false);
    expect(authorizeCronRequest(makeRequest("long-secret-value-extra"), "test").ok).toBe(
      false
    );
  });
});
