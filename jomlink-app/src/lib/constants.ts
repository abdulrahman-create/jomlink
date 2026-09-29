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
  // Escrow auto-release window after completion (days).
  RELEASE_WAIT_DAYS: 7,
} as const;

/** Wallet top-up limits (MYR). */
export const WALLET = {
  TOPUP_MIN: 10,
  TOPUP_MAX: 50000,
  // Preset amounts offered in the top-up UI.
  TOPUP_PRESETS: [50, 100, 250, 500, 1000],
} as const;

/**
 * KYC biometric consent wording version. Bump this whenever the consent copy
 * changes so we retain which wording each member agreed to (see docs).
 */
export const BIOMETRIC_CONSENT_VERSION = "v1";

/** Opportunity categories surfaced in the marketplace UI. */
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

export function formatMoney(
  amount: number | string | null | undefined,
  currency = "MYR"
) {
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