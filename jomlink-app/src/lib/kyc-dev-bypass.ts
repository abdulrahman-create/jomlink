/**
 * KYC dev / test bypass for the §11.9.2 money-out gate.
 *
 * WHY
 * ---
 * `isMemberVerifiedForPayout()` blocks every withdrawal for a member without a
 * verified badge. That is correct in production, but it makes it impossible to
 * exercise the withdrawal, payout-settlement, review-threshold and clearance
 * flows in a local dev or QA environment without manually approving KYC for
 * every test account first.
 *
 * This module is the ONE place that decides whether the bypass is available.
 * It is deliberately hostile to production:
 *
 *   • **Refused outright in production** — `NODE_ENV === "production"` returns
 *     unavailable regardless of any environment variable, so a stray
 *     `KYC_DEV_BYPASS=true` in a production `.env` cannot silently disable
 *     identity verification. This is the entire point of the module.
 *   • **Opt-in only** — outside production it still requires the explicit
 *     `KYC_DEV_BYPASS=true` flag. Absent the flag, nothing changes: the real
 *     KYC gate applies, so a normal dev session still behaves like prod.
 *   • **Audited** — when the bypass is used it is written to `audit_logs` in the
 *     same shape as a real screen refusal, clearly marked `devBypass: true`.
 *
 * Turning it on locally (`.env.local`, then restart the dev server):
 *
 *     KYC_DEV_BYPASS=true
 *
 * The flag is read at call time, not module load, so tests can toggle it and
 * the result is never cached across environments.
 */

/** Env var that opts a non-production environment in. */
export const KYC_BYPASS_ENV_VAR = "KYC_DEV_BYPASS";

/**
 * Is this a production runtime? Read through `process.env.NODE_ENV` at call
 * time so a test can simulate production without reloading modules.
 */
export function isProductionRuntime(): boolean {
  return process.env.NODE_ENV === "production";
}

/** True when the env var is set to an affirmative value. */
function flagEnabled(): boolean {
  const raw = (process.env[KYC_BYPASS_ENV_VAR] ?? "").trim().toLowerCase();
  return raw === "true" || raw === "1" || raw === "yes";
}

export interface KycBypassState {
  /** May the KYC gate be skipped right now? */
  enabled: boolean;
  /** Why it is (not) available — shown in the UI and written to the audit log. */
  reason:
    | "ENABLED"
    | "PRODUCTION_BLOCKED"
    | "FLAG_NOT_SET";
}

/**
 * Decide whether KYC-before-payout may be bypassed.
 *
 * Fails closed in every direction: production always refuses, and any
 * environment without an explicit opt-in refuses.
 */
export function kycDevBypassState(): KycBypassState {
  if (isProductionRuntime()) {
    return { enabled: false, reason: "PRODUCTION_BLOCKED" };
  }
  if (!flagEnabled()) {
    return { enabled: false, reason: "FLAG_NOT_SET" };
  }
  return { enabled: true, reason: "ENABLED" };
}

/** Convenience predicate for the payout / screening paths. */
export function isKycDevBypassEnabled(): boolean {
  return kycDevBypassState().enabled;
}

/** One-line explanation for surfacing in the UI. */
export function kycDevBypassNotice(): string {
  return (
    `Dev/test bypass is ON (${KYC_BYPASS_ENV_VAR}=true, NODE_ENV=${process.env.NODE_ENV ?? "undefined"}). ` +
    `Identity verification is NOT being enforced. It is impossible to enable in production.`
  );
}
