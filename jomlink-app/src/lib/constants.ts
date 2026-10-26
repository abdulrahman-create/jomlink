/**
 * Jomlink platform business rules & constants.
 * Single source of truth for fee rates and workflow configuration.
 */

export const PLATFORM = {
  NAME: "Jomlink",
  TAGLINE: "The marketplace for business introductions",
  CURRENCY: "MYR",
} as const;

export const FEES = {
  // Seeker pays a REFUNDABLE 10% posting deposit (of the reward) when posting
  // an Opportunity. It is auto-deducted from the Seeker's wallet. If the Seeker
  // cancels BEFORE any Linker is selected, the deposit is refunded LESS the
  // non-refundable listing fee below. Once a Linker is selected the deposit is
  // consumed (the agreed reward is escrowed separately at that point).
  POSTING_DEPOSIT_RATE: 0.10,
  // Non-refundable listing fee (MYR) deducted from the posting deposit on a
  // pre-selection cancellation. Retained by the platform for listing,
  // moderation and matching services (blueprint §3.9).
  LISTING_FEE: 10,
  // Minimum Opportunity reward (MYR). The 10% posting deposit must be at least
  // the RM10 listing fee, so the reward floor is LISTING_FEE / POSTING_DEPOSIT_RATE.
  MIN_OPPORTUNITY_REWARD: 10 / 0.10,
  // Linker pays 10% service fee on each successful payout.
  LINKER_SERVICE_FEE_RATE: 0.10,
  // Escrow release FALLBACK window (days). The reward is released immediately
  // when the Seeker marks a connection complete (Option A, 2026-10-15); this
  // window only governs the safety-net sweep that pays out a completed connection
  // which was never released, and gives a dispute time to freeze the escrow.
  RELEASE_WAIT_DAYS: 7,
} as const;

/**
 * Verification-gated completion workflow (Phase 14, blueprint §5.7, §5.12.1).
 *
 * The Seeker CONFIRMS, the platform VERIFIES, and only the platform RELEASES
 * escrow. Each actor is bounded by a timeout so that neither a silent party nor
 * a stalled platform can hold the money hostage.
 */
export const COMPLETION = {
  // Seeker must confirm/reject evidence within this window. Timeout auto-advances
  // to verification — a silent Seeker can never block payment.
  SEEKER_CONFIRM_WINDOW_DAYS: 3,
  // Platform must verify within this window. Timeout auto-releases with a
  // post-hoc review flag — the platform can never stall payment.
  VERIFICATION_WINDOW_DAYS: 2,
  // Linker may fix deficient evidence before it is treated as failure.
  EVIDENCE_CURE_WINDOW_DAYS: 3,
  // Post-release clawback window.
  DISPUTE_WINDOW_DAYS: 7,
  // Mandatory hold before release for high-risk completions.
  HIGH_RISK_HOLD_DAYS: 7,
  // Evidence submitted this soon after the accepted deadline is a risk signal.
  MIN_HOURS_AFTER_DEADLINE: 24,
} as const;

/**
 * Progress-thread comment edits (blueprint §5.6.2).
 *
 * A member may change their own comment only inside this short window, so the
 * thread stays an honest contemporaneous record: you can fix a typo or finish a
 * thought you sent too early, but you cannot quietly rewrite your position days
 * later. Every edit still preserves the previous version as immutable update
 * history regardless of when it happens.
 */
export const PROGRESS = {
  COMMENT_EDIT_WINDOW_MINUTES: 15,
} as const;

/** Wallet top-up limits (MYR). */
export const WALLET = {
  TOPUP_MIN: 10,
  TOPUP_MAX: 50000,
  // Preset amounts offered in the top-up UI.
  TOPUP_PRESETS: [50, 100, 250, 500, 1000],
} as const;

/**
 * Anti-money-laundering controls (blueprint v1.2 §11.9.2, AMLATFA 2001).
 *
 * §11.9.2 requires four enforced controls, not advisory ones:
 *   1. a sanctions / PEP / adverse-media screen before any payout settles,
 *      with a `BLOCKED` result halting settlement and routing to Compliance;
 *   2. **KYC-before-payout** — no money-out for an unverified member
 *      ("email + mobile verification alone is not sufficient");
 *   3. defined per-user / per-transaction monitoring thresholds, alerting
 *      Compliance on structuring and rapid top-up-then-withdraw flows;
 *   4. every screen recorded and attributable (party, list version, result,
 *      reviewer, timestamp) as an immutable audit event.
 *
 * Enforcement lives in `src/lib/screening.ts` (pure) and the payout actions.
 */
export const AML = {
  /**
   * Single payout/withdrawal threshold (MYR). At or above this the payout is
   * HELD for Compliance approval and an immutable screening event is written
   * before any money moves. Below it the screen still runs and is still
   * recorded — the threshold only changes whether a human must approve.
   */
  PAYOUT_REVIEW_THRESHOLD: 10000,
  /**
   * Cumulative payout threshold (MYR) over the rolling window below. Breaching
   * it escalates a payout to Compliance review even when the individual
   * transaction is small (structuring / smurfing detection).
   */
  CUMULATIVE_PAYOUT_THRESHOLD: 25000,
  /** Rolling window for the cumulative threshold, in days. */
  CUMULATIVE_WINDOW_DAYS: 30,
  /**
   * Rapid top-up-then-withdraw window, in hours. Withdrawing a balance that was
   * funded this recently is a first-party / layering signal and raises the
   * payout to Compliance review.
   */
  RAPID_TOPUP_WINDOW_HOURS: 24,
  /**
   * AML programme screening-list version. Bump whenever the underlying list or
   * provider definition changes, so every recorded screen states which version
   * produced the result (§11.9.2 rule 4).
   *
   * NOTE: the platform does not yet integrate a sanctions/PEP provider
   * (see §11.9.2 rule 5). Until it does, `screening.ts` applies a *local*
   * deny-list only and every screen is recorded as `PROVIDER_NOT_CONFIGURED`
   * so the gap is visible in the audit trail rather than silently "clean".
   */
  LIST_VERSION: "local-denylist-2026.10",
} as const;

/**
 * KYC biometric consent wording version. Bump this whenever the consent copy
 * changes so we retain which wording each member agreed to (see docs).
 *
 * This is the **identity-verification** purpose (primary purpose): storing the
 * face + ID images so Jomlink can confirm who the member is. It is deliberately
 * SEPARATE from the model-training consent below (blueprint v1.2 §11.11 —
 * secondary use needs its own freely-given, specific consent).
 */
export const BIOMETRIC_CONSENT_VERSION = "v2";

/**
 * Model-training (secondary purpose) consent wording version — blueprint v1.2
 * §11.11.
 *
 * Using KYC captures to train an in-house face-match model is a **separate
 * purpose**. §11.11 is explicit that "a single bundled KYC consent is not
 * sufficient". A member can therefore:
 *   • refuse training and still verify their identity, and
 *   • withdraw training consent at any time without losing a verified badge.
 *
 * A capture is only eligible as training data when BOTH consents were granted
 * and were not withdrawn (`training_consent_withdrawn_at`).
 */
export const BIOMETRIC_TRAINING_CONSENT_VERSION = "v1";

/**
 * Biometric retention + purge policy (blueprint v1.2 §11.11, PRIV-01).
 *
 * §11.11 makes the purge job **mandatory**: `purge_requested_at` rows must
 * actually be deleted by a scheduled job, not merely flagged. Retention periods
 * exist alongside it so data we are no longer allowed to keep is removed even
 * when nobody asked.
 */
export const BIOMETRIC_RETENTION = {
  /**
   * Hard retention cap for identity images (days, from capture). KYC images are
   * kept no longer than this unless a documented legal hold applies.
   */
  KYC_RETENTION_DAYS: 365,
  /**
   * Retention cap for captures that were granted for model training (days).
   * Training sets are refreshed, so they need a shorter review cycle.
   */
  TRAINING_RETENTION_DAYS: 730,
  /** Max rows handled per purge run, so a cron run stays bounded. */
  PURGE_BATCH_SIZE: 200,
} as const;

/**
 * Opportunity categories surfaced in the marketplace UI and the post form.
 *
 * Single source of truth — the landing page derives its category strip from this
 * list so the public vocabulary can never drift from what the form accepts.
 */
export const OPPORTUNITY_CATEGORIES = [
  { value: "BUSINESS_INTRODUCTION", label: "Business Introduction" },
  { value: "EXECUTIVE_MEETING", label: "Executive / Decision-Maker Meeting" },
  { value: "INVESTOR_CONNECTION", label: "Investor Connection" },
  { value: "CUSTOMER_CLIENT_CONNECTION", label: "Customer / Client Connection" },
  { value: "SUPPLIER_CONNECTION", label: "Supplier Connection" },
  { value: "DISTRIBUTOR_AGENT_CONNECTION", label: "Distributor / Agent Connection" },
  { value: "STRATEGIC_PARTNER", label: "Strategic Partner" },
  { value: "GOVERNMENT_PUBLIC_SECTOR", label: "Government / Public Sector" },
  { value: "PROFESSIONAL_EXPERT", label: "Professional / Expert" },
  { value: "SITE_VISIT_ACCESS", label: "Site Visit / Access" },
  { value: "OTHER", label: "Other" },
] as const;

/**
 * Categories that are NOT enabled for posting — the server-side deny-list.
 *
 * Blueprint v1.2 §11.9.1 (launch blocker, risk register LEG-02/03/06) requires
 * regulated and high-risk categories to be **disabled by default** and rejected
 * at every entry point, not merely flagged:
 *
 *   GOVERNMENT_PUBLIC_SECTOR  → bribery / procurement exposure (MACC Act 2009)
 *   INVESTOR_CONNECTION       → unlicensed investment activity (SC Malaysia)
 *
 * Default-deny is implemented in `src/lib/category-policy.ts`: a category is
 * postable ONLY if it is present in `OPPORTUNITY_CATEGORIES` AND absent from
 * this list, so a new enum value can never become live by accident.
 *
 * Re-enabling a category is an audited Compliance decision (§11.9.1 rule 4): it
 * must record a risk owner, written legal review, rationale and expiry date, and
 * emit an audit event. Remove it from this list only as part of that decision.
 *
 * Keep this list in sync with the deny-list assertions in
 * `src/lib/category-policy.test.ts`.
 */
export const DISABLED_CATEGORY_VALUES = [
  "GOVERNMENT_PUBLIC_SECTOR",
  "INVESTOR_CONNECTION",
] as const;

/**
 * Back-compat alias for the public-surface filter below. The deny-list is the
 * single source of truth — public promotion and server-side posting now read the
 * same list so marketing can never advertise a category the API would reject.
 */
export const NON_PUBLIC_CATEGORY_VALUES = DISABLED_CATEGORY_VALUES;

/**
 * Opportunity categories that may be offered as selectable / promoted on public
 * and member-facing surfaces (post form, edit form, marketplace filter, landing
 * page). Derived from the deny-list so the UI can never surface a category the
 * server will reject (§11.9.1 rule 3).
 */
export const PUBLIC_OPPORTUNITY_CATEGORIES = OPPORTUNITY_CATEGORIES.filter(
  (c) => !(DISABLED_CATEGORY_VALUES as readonly string[]).includes(c.value)
);

/** Relationship categories for relationship declarations. */
export const RELATIONSHIP_CATEGORIES = [
  { value: "CURRENT_EMPLOYEE", label: "Current Employee" },
  { value: "FORMER_EMPLOYEE", label: "Former Employee" },
  { value: "BUSINESS_PARTNER", label: "Business Partner" },
  { value: "CLIENT", label: "Client" },
  { value: "FORMER_CLIENT", label: "Former Client" },
  { value: "SUPPLIER", label: "Supplier" },
  { value: "CUSTOMER", label: "Customer" },
  { value: "CONSULTANT", label: "Consultant" },
  { value: "ADVISOR", label: "Advisor" },
  { value: "INVESTOR", label: "Investor" },
  { value: "PROFESSIONAL_CONTACT", label: "Professional Contact" },
  { value: "INDUSTRY_CONTACT", label: "Industry Contact" },
  { value: "ASSOCIATION_MEMBERSHIP", label: "Association / Membership" },
  { value: "GOVERNMENT_PUBLIC_SECTOR", label: "Government / Public Sector" },
  { value: "OTHER", label: "Other" },
] as const;

/** Opportunity lifecycle statuses (user-facing labels). */
export const OPPORTUNITY_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_PAYMENT: "Pending Payment",
  ACTIVE: "Active",
  PROPOSAL_RECEIVED: "Proposal Received",
  NEGOTIATION: "Negotiation",
  LINKER_SELECTED: "Linker Selected",
  AWAITING_CONFIRMATION: "Awaiting Confirmation",
  IN_PROGRESS: "In Progress",
  APPOINTMENT_SCHEDULED: "Appointment Scheduled",
  AWAITING_VERIFICATION: "Awaiting Verification",
  EVIDENCE_SUBMITTED: "Evidence Submitted",
  AWAITING_SEEKER_CONFIRMATION: "Awaiting Seeker Confirmation",
  VERIFIED: "Verified",
  COMPLETED: "Completed",
  DISPUTED: "Disputed",
  FAILED: "Failed",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};

export function formatMYR(amount: number | string | null | undefined) {
  const n = Number(amount ?? 0);
  return new Intl.NumberFormat("en-MY", {
    style: "currency",
    currency: "MYR",
    minimumFractionDigits: 2,
  }).format(n);
}

/**
 * Money label for the given amount.
 * `currency` is accepted for display of historical rows; the platform is
 * MYR-only today so it currently does not change the formatting.
 */
export function formatMoney(
  amount: number | string | null | undefined,
  currency?: string
) {
  void currency;
  return formatMYR(amount);
}

/**
 * Deterministic date formatter (locale-independent).
 * Uses a fixed timeZone + explicit day/month/year so the server and client
 * always render identical text — avoids React hydration mismatches.
 */
export function formatDate(
  value: string | number | Date | null | undefined
): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}