import { AML, formatMYR } from "./constants";

/**
 * AML / sanctions / PEP screening + KYC-before-payout gate
 * (blueprint v1.2 §11.9.2, AMLATFA 2001, risk register LEG-04 / LEG-05).
 *
 * §11.9.2 makes this **enforced, not advisory**. The four controls it requires:
 *
 *   1. **Screen before settlement.** A sanctions / PEP / adverse-media screen
 *      runs before any payout settles; a `BLOCKED` result halts settlement and
 *      routes the case to Compliance.
 *   2. **KYC-before-payout.** A member may not receive a payout until identity
 *      verification is complete. "Email + mobile verification alone is not
 *      sufficient for money-out."
 *   3. **Transaction monitoring.** Defined single-transaction and cumulative
 *      thresholds, plus a rapid top-up-then-withdraw signal, raise a payout to
 *      Compliance review.
 *   4. **Recorded and attributable.** Each screen writes an immutable audit
 *      event carrying the party, list version, result, reviewer and timestamp.
 *
 * This module is deliberately **pure** — no DB, no `"use server"`, no `next/*`
 * imports — so the payout actions, the wallet UI and the unit tests all read the
 * *same* rule. Callers load the inputs (KYC status, recent payout history) and
 * hand them here; nothing in this file can be bypassed by the UI.
 *
 * Honest limitation (recorded, not hidden)
 * ----------------------------------------
 * Jomlink does not yet integrate a sanctions/PEP provider (§11.9.2 rule 5
 * requires written confirmation of the provider's scope). Until it does, the
 * screen applies a **local deny-list** only and marks every result
 * `providerConfigured: false`. That is intentional and visible in the audit
 * trail: the platform must not claim a provider screen it did not perform.
 */

// ── Risk levels ─────────────────────────────────────────────
//    CLEAR    — screened, nothing to flag: settle.
//    REVIEW   — a monitoring signal fired: hold for Compliance approval.
//    BLOCKED  — a hard stop (unverified identity, sanctions hit): never settle
//               from this code path, even for a SUPER_ADMIN.
export type ScreenRisk = "CLEAR" | "REVIEW" | "BLOCKED";

export const SCREEN_RISK_LABEL: Record<ScreenRisk, string> = {
  CLEAR: "Clear",
  REVIEW: "Compliance review required",
  BLOCKED: "Blocked",
};

/** Outcome of one screening run, as recorded to `audit_logs`. */
export interface ScreenResult {
  risk: ScreenRisk;
  /** Human-readable reasons, one per signal that fired. */
  reasons: string[];
  /** Machine-readable codes, for assertions and the audit record. */
  codes: ScreenCode[];
  /** The list/screen definition that produced this result (§11.9.2 rule 4). */
  listVersion: string;
  /** False until a sanctions/PEP provider is actually integrated. */
  providerConfigured: boolean;
}

export type ScreenCode =
  | "KYC_NOT_VERIFIED"
  | "SANCTIONS_HIT"
  | "SINGLE_TRANSACTION_THRESHOLD"
  | "CUMULATIVE_THRESHOLD"
  | "RAPID_TOPUP_THEN_WITHDRAW";

export interface ScreenPayoutInput {
  /** Member's identity-verification state. */
  kycVerified: boolean;
  /** Free-text names screened against the local deny-list (holder + business). */
  names: Array<string | null | undefined>;
  /** The payout being settled, in MYR. */
  amount: number;
  /** Cash already paid out to this member inside the rolling window, in MYR. */
  payoutsInWindow: number;
  /** ISO timestamp of the member's most recent completed wallet top-up, if any. */
  lastTopUpAt?: string | null;
  /** Injectable clock for deterministic tests. */
  now?: Date;
}

/**
 * Names that must never be paid. Deliberately tiny: this is a *stop-gap* local
 * deny-list, NOT a sanctions list. It exists so the code path that consumes a
 * hit is real, tested and audited before the provider integration lands.
 * Provider integration replaces `hitDenyList` — the decision shape stays.
 */
export const LOCAL_DENY_LIST: readonly string[] = [
  // Placeholder entries — replace with the provider's screened names.
  // Kept intentionally non-real so no real person is ever blocked by fiction.
  "jomlink test sanctions target",
];

function norm(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Does any of `names` match the local deny-list? */
export function hitDenyList(
  names: Array<string | null | undefined>,
  list: readonly string[] = LOCAL_DENY_LIST
): string | null {
  const denied = list.map(norm).filter(Boolean);
  for (const raw of names) {
    const n = norm(raw ?? "");
    if (!n) continue;
    if (denied.some((d) => n === d || n.includes(d))) return raw ?? n;
  }
  return null;
}

/**
 * Screen a payout. This is the ONLY place that decides whether money may leave.
 *
 * Precedence (highest wins): BLOCKED > REVIEW > CLEAR.
 * `BLOCKED` is a hard stop and is never overridable from the payout UI; a
 * `REVIEW` may be cleared by a Compliance administrator with `compliance:write`
 * after an attributable screen.
 */
export function screenPayout(input: ScreenPayoutInput): ScreenResult {
  const codes: ScreenCode[] = [];
  const reasons: string[] = [];
  const now = input.now ?? new Date();

  // 1) KYC-before-payout — a hard stop (LEG-05). Money-out requires a verified
  //    identity; the platform's badge is the single signal it currently has.
  if (!input.kycVerified) {
    codes.push("KYC_NOT_VERIFIED");
    reasons.push(
      "Identity verification is not complete. Payouts require a verified member account."
    );
  }

  // 2) Sanctions / PEP / adverse-media screen. `BLOCKED` halts settlement and
  //    routes to Compliance — it is never auto-cleared.
  const hit = hitDenyList(input.names);
  if (hit) {
    codes.push("SANCTIONS_HIT");
    reasons.push(
      `A sanctions/PEP screen returned a match for "${hit}". Settlement is blocked pending Compliance review.`
    );
  }

  // 3) Transaction monitoring — single-transaction threshold.
  const amount = Number(input.amount) || 0;
  if (amount >= AML.PAYOUT_REVIEW_THRESHOLD) {
    codes.push("SINGLE_TRANSACTION_THRESHOLD");
    reasons.push(
      `This payout (${formatMYR(amount)}) meets the ${formatMYR(
        AML.PAYOUT_REVIEW_THRESHOLD
      )} single-transaction review threshold.`
    );
  }

  // 3b) Cumulative / structuring threshold over the rolling window.
  const cumulative = (Number(input.payoutsInWindow) || 0) + amount;
  if (cumulative >= AML.CUMULATIVE_PAYOUT_THRESHOLD) {
    codes.push("CUMULATIVE_THRESHOLD");
    reasons.push(
      `Payouts to this member in the last ${AML.CUMULATIVE_WINDOW_DAYS} days would reach ${formatMYR(
        cumulative
      )}, meeting the ${formatMYR(AML.CUMULATIVE_PAYOUT_THRESHOLD)} cumulative review threshold.`
    );
  }

  // 3c) Rapid top-up-then-withdraw — a first-party / layering signal.
  if (input.lastTopUpAt) {
    const topped = new Date(input.lastTopUpAt).getTime();
    if (Number.isFinite(topped)) {
      const hours = (now.getTime() - topped) / 3_600_000;
      if (hours >= 0 && hours <= AML.RAPID_TOPUP_WINDOW_HOURS) {
        codes.push("RAPID_TOPUP_THEN_WITHDRAW");
        reasons.push(
          `The wallet was topped up within the last ${AML.RAPID_TOPUP_WINDOW_HOURS} hours and is now being withdrawn.`
        );
      }
    }
  }

  const risk: ScreenRisk = codes.includes("KYC_NOT_VERIFIED") || codes.includes("SANCTIONS_HIT")
    ? "BLOCKED"
    : codes.length > 0
    ? "REVIEW"
    : "CLEAR";

  return {
    risk,
    reasons,
    codes,
    listVersion: AML.LIST_VERSION,
    // No sanctions/PEP provider is integrated yet (§11.9.2 rule 5).
    providerConfigured: false,
  };
}

/**
 * May an admin settle this payout right now?
 *
 * @param screen     The screening result for the payout.
 * @param overridden True when a Compliance admin has recorded an explicit,
 *                   attributable clearance in the same request.
 *
 * `BLOCKED` can **never** be overridden here — an unverified recipient or a
 * sanctions hit has to be resolved through KYC or Compliance, not a checkbox.
 */
export function canSettlePayout(
  screen: ScreenResult,
  overridden = false
): { allowed: boolean; reason?: string } {
  if (screen.risk === "BLOCKED") {
    return {
      allowed: false,
      reason:
        "This payout is blocked and cannot be settled until the underlying issue is resolved.",
    };
  }
  if (screen.risk === "REVIEW" && !overridden) {
    return {
      allowed: false,
      reason:
        "This payout is held for Compliance review. A Compliance administrator must clear it before it can be paid.",
    };
  }
  return { allowed: true };
}

/** True when paying this payout requires a Compliance clearance first. */
export function requiresComplianceClearance(screen: ScreenResult): boolean {
  return screen.risk === "REVIEW";
}

/** Short one-line summary for admin tables. */
export function screenSummary(screen: ScreenResult): string {
  if (screen.risk === "CLEAR") {
    return screen.providerConfigured
      ? "Screen clear"
      : "Screen clear (local deny-list only — provider not configured)";
  }
  return screen.reasons.join(" ");
}
