import { describe, it, expect } from "vitest";
import { isMissingColumnError } from "./queries";

/**
 * Regression guard for the §11.11 degraded path.
 *
 * PostgREST reports a missing column two different ways depending on how the
 * request is resolved — `42703` from the Postgres planner and `PGRST204` from the
 * schema cache. Both MUST be treated as "migration not applied", otherwise a
 * single click on the KYC page ([Wipe]/[Withdraw]) throws a 500 instead of
 * degrading. Observed live on 2026-10-26 with
 * `phase-15-biometric-purge-consent.sql` unapplied.
 */
describe("isMissingColumnError", () => {
  it("recognises PGRST204 (schema cache miss)", () => {
    expect(
      isMissingColumnError({
        code: "PGRST204",
        message:
          "Could not find the 'training_consent' column of 'users' in the schema cache",
      })
    ).toBe(true);
  });

  it("recognises 42703 (undefined column)", () => {
    expect(
      isMissingColumnError({
        code: "42703",
        message: 'column users.training_consent does not exist',
      })
    ).toBe(true);
  });

  it("recognises it from the message alone when no code is present", () => {
    expect(
      isMissingColumnError({ message: "column training_consent does not exist" })
    ).toBe(true);
  });

  it("does NOT swallow a permission error", () => {
    expect(
      isMissingColumnError({ code: "42501", message: "insufficient_privilege" })
    ).toBe(false);
  });

  it("does NOT swallow a unique-violation", () => {
    expect(
      isMissingColumnError({
        code: "23505",
        message: 'duplicate key value violates unique constraint "pkey"',
      })
    ).toBe(false);
  });

  it("is safe on null / undefined / non-errors", () => {
    expect(isMissingColumnError(null)).toBe(false);
    expect(isMissingColumnError(undefined)).toBe(false);
    expect(isMissingColumnError("boom")).toBe(false);
  });
});
