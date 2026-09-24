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
  // Seeker pays 10% of the opportunity reward as activation/security fee.
  ACTIVATION_FEE_RATE: 0.10,
  // Linker pays 3% service fee on each successful payout.
  LINKER_SERVICE_FEE_RATE: 0.03,
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