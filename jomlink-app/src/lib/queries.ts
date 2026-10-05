import { getServiceRoleClient } from "@/lib/supabase/admin";
import { JOMLINK_APP_TAG } from "@/lib/data";
import type {
  JomlinkUserRow,
  MemberProfileRow,
  EmploymentRow,
  RelationshipRow,
  OpportunityRow,
  TransactionRow,
  LinkerProposalRow,
  ProposalNegotiationRow,
  LedgerEntryRow,
  PayoutRow,
  RefundRow,
  ConnectionRow,
  AppointmentRow,
  ConnectionEvidenceRow,
  ReviewRow,
  ReputationRow,
  AdminMemberRow,
  KycRecordRow,
  KycBiometricRow,
  DisputeRow,
  AuditLogRow,
  NotificationRow,
  OpportunityDeadlineRow,
  ProgressReportRow,
  ProgressReportCommentRow,
  ProgressReportCommentRevisionRow,
  LinkerFlagRow,
} from "@/lib/jomlink-types";

/**
 * JOMLINK DATA QUERY LAYER
 * Centralizes all access to the isolated `jomlink` schema in Supabase
 * using the service-role supabase-js client. Every query is scoped to the
 * `jomlink` schema (NOT public) so it never collides with other apps.
 */

const sc = () =>
  getServiceRoleClient().schema("jomlink" as never) as unknown as {
    from: (table: string) => any;
  };

// ── Users / members ──────────────────────────────────────────
export async function findMemberBySupabaseId(supabaseUserId: string) {
  const { data, error } = await sc()
    .from("users")
    .select("*")
    .eq("supabase_user_id", supabaseUserId)
    .eq("app", JOMLINK_APP_TAG)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function findMemberByEmail(email: string) {
  const { data, error } = await sc()
    .from("users")
    .select("*")
    .eq("email", email)
    .eq("app", JOMLINK_APP_TAG)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function upsertMemberForAuth(user: {
  id: string;
  email: string;
  email_confirmed_at?: string | null;
  phone?: string | null;
  user_metadata?: { full_name?: string; country?: string };
}) {
  const existing =
    (await findMemberBySupabaseId(user.id)) ??
    (await findMemberByEmail(user.email));
  if (existing) return existing;

  const { data, error } = await sc()
    .from("users")
    .insert({
      email: user.email,
      email_verified: !!user.email_confirmed_at,
      mobile: user.phone ?? "",
      password_hash: "",
      full_name: user.user_metadata?.full_name ?? user.email.split("@")[0],
      country: user.user_metadata?.country ?? "MY",
      supabase_user_id: user.id,
      app: JOMLINK_APP_TAG,
      role: "SEEKER",
    })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

// ── Member profile ───────────────────────────────────────────
export async function getProfileByUserId(
  userId: string
): Promise<MemberProfileRow | null> {
  const { data, error } = await sc()
    .from("member_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as MemberProfileRow | null) ?? null;
}

export async function upsertProfile(userId: string, values: Record<string, unknown>) {
  const { data, error } = await sc()
    .from("member_profiles")
    .upsert({ user_id: userId, ...values }, { onConflict: "user_id" })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

// ── Employment history ───────────────────────────────────────
export async function getEmployment(
  profileId: string
): Promise<EmploymentRow[]> {
  const { data, error } = await sc()
    .from("employment_history")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createEmployment(profileId: string, values: Record<string, unknown>) {
  const { data, error } = await sc()
    .from("employment_history")
    .insert({ profile_id: profileId, ...values })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteEmploymentIfOwned(id: string, profileId: string) {
  const { error } = await sc()
    .from("employment_history")
    .delete()
    .eq("id", id)
    .eq("profile_id", profileId);
  if (error) throw error;
}

// ── Business profiles ────────────────────────────────────────
export async function getBusinessProfiles(userId: string) {
  const { data, error } = await sc()
    .from("business_profiles")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createBusinessProfile(userId: string, values: Record<string, unknown>) {
  const { data, error } = await sc()
    .from("business_profiles")
    .insert({ user_id: userId, ...values })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBusinessProfileIfOwned(id: string, userId: string) {
  const { error } = await sc()
    .from("business_profiles")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

// ── Relationships (core differentiator) ──────────────────────
export async function getRelationships(
  userId: string
): Promise<RelationshipRow[]> {
  const { data, error } = await sc()
    .from("relationships")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function findOrganisationByName(name: string) {
  const { data, error } = await sc()
    .from("organisations")
    .select("*")
    .ilike("name", name)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function createOrganisation(values: Record<string, unknown>) {
  const { data, error } = await sc()
    .from("organisations")
    .insert(values)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function createRelationship(userId: string, values: Record<string, unknown>) {
  const { data, error } = await sc()
    .from("relationships")
    .insert({ user_id: userId, ...values, app: JOMLINK_APP_TAG })
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRelationshipIfOwned(id: string, userId: string) {
  const { error } = await sc()
    .from("relationships")
    .delete()
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function getRelationshipIfOwned(id: string, userId: string) {
  const { data, error } = await sc()
    .from("relationships")
    .select("*")
    .eq("id", id)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function updateRelationshipFields(id: string, values: Record<string, unknown>) {
  const { data, error } = await sc()
    .from("relationships")
    .update(values)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

// ── Role toggle ──────────────────────────────────────────────
export async function setUserRole(userId: string, role: string) {
  const { error } = await sc().from("users").update({ role }).eq("id", userId);
  if (error) throw error;
}

// ── Basic member details ─────────────────────────────────────
/** Update a member's own editable basic details (full name, mobile, country, location). */
export async function updateMemberDetails(
  userId: string,
  values: {
    full_name?: string;
    mobile?: string;
    country?: string;
    location?: string | null;
    profile_photo_url?: string | null;
  }
) {
  // Only include provided fields so a partial update (e.g. avatar-only) never
  // nulls the other columns. `profile_photo_url: null` is intentional (removal).
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (values.full_name !== undefined) patch.full_name = values.full_name;
  if (values.mobile !== undefined) patch.mobile = values.mobile;
  if (values.country !== undefined) patch.country = values.country;
  if (values.location !== undefined) patch.location = values.location;
  if (values.profile_photo_url !== undefined) {
    patch.profile_photo_url = values.profile_photo_url;
  }

  const { data, error } = await sc()
    .from("users")
    .update(patch)
    .eq("id", userId)
    .eq("app", JOMLINK_APP_TAG)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data as JomlinkUserRow | null;
}

// ── User / public profile ────────────────────────────────────
export async function getUserById(
  userId: string
): Promise<JomlinkUserRow | null> {
  const { data, error } = await sc()
    .from("users")
    .select("*")
    .eq("id", userId)
    .eq("app", JOMLINK_APP_TAG)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function getUserPublicProfile(userId: string) {
  const { data, error } = await sc()
    .from("users")
    .select("id, full_name, email, country, location, role, member_profiles(*, employment_history(*)), relationships(*)")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

/** Fetch a member's profile + employment for the public member page. */
export async function getMemberProfileWithEmployment(userId: string) {
  const profile = await getProfileByUserId(userId);
  const employment = profile ? await getEmployment(profile.id) : [];
  return profile ? { ...profile, employment_history: employment } : null;
}

/** Fetch a member's reputation metrics if present. */
export async function getMemberReputation(
  userId: string
): Promise<{
  user_id: string;
  success_rate: number | null;
  average_rating: number | null;
  successful_count?: number | null;
} | null> {
  const { data, error } = await sc()
    .from("reputation_metrics")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as { user_id: string; success_rate: number | null; average_rating: number | null } | null) ?? null;
}

// ── Opportunities (Phase 3) ─────────────────────────────────
export async function getOpportunityById(
  id: string
): Promise<OpportunityRow | null> {
  const { data, error } = await sc()
    .from("opportunities")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as OpportunityRow | null) ?? null;
}

export async function getOpportunitiesBySeeker(
  seekerId: string
): Promise<OpportunityRow[]> {
  const { data, error } = await sc()
    .from("opportunities")
    .select("*")
    .eq("seeker_id", seekerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export interface OpportunityListParams {
  search?: string;
  category?: string;
  country?: string;
  minReward?: number;
  maxReward?: number;
  deadlineBefore?: string;
  verifiedOnly?: boolean;
  limit?: number;
}

/**
 * List ACTIVE (published) opportunities for the marketplace.
 * Only non-sensitive rows are exposed publicly; confidentiality is enforced
 * by the caller (e.g. RESTRICTED/PRIVATE_DIRECT are hidden or matched only).
 */
export async function listActiveOpportunities(
  params: OpportunityListParams = {}
): Promise<OpportunityRow[]> {
  let q = sc()
    .from("opportunities")
    .select("*")
    .eq("status", "ACTIVE")
    .order("created_at", { ascending: false });

  const { search, category, country, minReward, maxReward, deadlineBefore, limit } =
    params;

  if (search) q = q.ilike("title", `%${search}%`);
  if (category) q = q.eq("category", category);
  if (country) q = q.eq("geographic_preference", country);
  if (minReward != null) q = q.gte("offer_amount", minReward);
  if (maxReward != null) q = q.lte("offer_amount", maxReward);
  if (deadlineBefore) q = q.lt("deadline", deadlineBefore);
  if (limit && limit > 0) q = q.limit(limit);

  const { data, error } = await q;
  if (error) throw error;
  return data ?? [];
}

export async function createOpportunity(
  seekerId: string,
  values: Record<string, unknown>
): Promise<OpportunityRow> {
  const { data, error } = await sc()
    .from("opportunities")
    .insert({ seeker_id: seekerId, ...values })
    .select("*")
    .single();
  if (error) throw error;
  return data as OpportunityRow;
}

export async function updateOpportunityIfOwned(
  id: string,
  seekerId: string,
  values: Record<string, unknown>
): Promise<OpportunityRow | null> {
  const { data, error } = await sc()
    .from("opportunities")
    .update(values)
    .eq("id", id)
    .eq("seeker_id", seekerId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return (data as OpportunityRow | null) ?? null;
}

export async function getOpportunityWithSeeker(id: string) {
  const { data, error } = await sc()
    .from("opportunities")
    .select("*, users(full_name, country, role)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function getTransactionByReference(ref: string) {
  const { data, error } = await sc()
    .from("transactions")
    .select("*")
    .eq("reference", ref)
    .maybeSingle();
  if (error) throw error;
  return (data as TransactionRow | null) ?? null;
}

/**
 * Find a transaction by the payment gateway's own reference (e.g. the
 * ToyyibPay BillCode stored in `gateway_ref`). This is the robust lookup for
 * payment callbacks/returns because the gateway always echoes its own bill
 * code back, whereas the external reference (`order_id`) can be dropped.
 */
export async function getTransactionByGatewayRef(ref: string) {
  const { data, error } = await sc()
    .from("transactions")
    .select("*")
    .eq("gateway_ref", ref)
    .maybeSingle();
  if (error) throw error;
  return (data as TransactionRow | null) ?? null;
}

/**
 * Resolve a top-up transaction from a payment callback/return using either the
 * gateway bill code or the external reference (`order_id`). Prefers the bill
 * code since it is always present; falls back to the reference for older rows
 * created before `gateway_ref` was stored.
 */
export async function findPaymentTransaction(params: {
  billCode?: string;
  orderId?: string;
}) {
  if (params.billCode) {
    const byBill = await getTransactionByGatewayRef(params.billCode);
    if (byBill) return byBill;
  }
  if (params.orderId) {
    return getTransactionByReference(params.orderId);
  }
  return null;
}

/** List pending top-ups (for the reconciliation job). */
export async function getPendingTopUpTransactions() {
  const { data, error } = await sc()
    .from("transactions")
    .select("*")
    .eq("type", "WALLET_CREDIT")
    .eq("status", "PENDING")
    .eq("gateway", "toyyibpay")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data as TransactionRow[] | null) ?? [];
}

export async function createTransaction(values: Record<string, unknown>) {
  const { data, error } = await sc()
    .from("transactions")
    .insert(values)
    .select("*")
    .single();
  if (error) throw error;
  return data as TransactionRow;
}

// ── Linker proposals (Phase 4) ──────────────────────────────
export async function getProposalById(
  id: string
): Promise<LinkerProposalRow | null> {
  const { data, error } = await sc()
    .from("linker_proposals")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as LinkerProposalRow | null) ?? null;
}

export async function getProposalsByOpportunity(
  opportunityId: string
): Promise<LinkerProposalRow[]> {
  const { data, error } = await sc()
    .from("linker_proposals")
    .select("*")
    .eq("opportunity_id", opportunityId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * True when at least one Linker has submitted a proposal for the opportunity.
 * Once a proposal exists the listing is locked for editing — a Linker has
 * already based their proposal on the current terms.
 */
export async function hasProposalsForOpportunity(
  opportunityId: string
): Promise<boolean> {
  const { count, error } = await sc()
    .from("linker_proposals")
    .select("id", { count: "exact", head: true })
    .eq("opportunity_id", opportunityId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

export async function getProposalsByLinker(
  linkerId: string
): Promise<LinkerProposalRow[]> {
  const { data, error } = await sc()
    .from("linker_proposals")
    .select("*")
    .eq("linker_id", linkerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getProposalsByLinkerWithOpportunity(
  linkerId: string
): Promise<(LinkerProposalRow & {
  opportunities?: {
    title?: string | null;
    status?: string | null;
    offer_amount?: number | null;
    currency?: string | null;
  } | null;
})[]> {
  const { data, error } = await sc()
    .from("linker_proposals")
    .select("*, opportunities(title, status, offer_amount, currency)")
    .eq("linker_id", linkerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Proposals received on opportunities owned by a Seeker (Phase 8 dashboard).
 */
export async function getProposalsForSeeker(seekerId: string) {
  const { data, error } = await sc()
    .from("linker_proposals")
    .select(
      "*, opportunities!inner(id, title, status, offer_amount, currency, seeker_id), users(full_name, country)"
    )
    .eq("opportunities.seeker_id", seekerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getProposalByLinkerAndOpportunity(
  linkerId: string,
  opportunityId: string
): Promise<LinkerProposalRow | null> {
  const { data, error } = await sc()
    .from("linker_proposals")
    .select("*")
    .eq("linker_id", linkerId)
    .eq("opportunity_id", opportunityId)
    .maybeSingle();
  if (error) throw error;
  return (data as LinkerProposalRow | null) ?? null;
}

export async function createProposal(
  values: Record<string, unknown>
): Promise<LinkerProposalRow> {
  const { data, error } = await sc()
    .from("linker_proposals")
    .insert(values)
    .select("*")
    .single();
  if (error) throw error;
  return data as LinkerProposalRow;
}

export async function updateProposalIfOwned(
  id: string,
  linkerId: string,
  values: Record<string, unknown>
): Promise<LinkerProposalRow | null> {
  const { data, error } = await sc()
    .from("linker_proposals")
    .update(values)
    .eq("id", id)
    .eq("linker_id", linkerId)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return (data as LinkerProposalRow | null) ?? null;
}

export async function updateProposal(
  id: string,
  values: Record<string, unknown>
): Promise<LinkerProposalRow | null> {
  const { data, error } = await sc()
    .from("linker_proposals")
    .update(values)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return (data as LinkerProposalRow | null) ?? null;
}

export async function getProposalWithLinker(id: string) {
  const { data, error } = await sc()
    .from("linker_proposals")
    .select("*, users(full_name, country, role)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function getProposalsWithLinker(opportunityId: string) {
  const { data, error } = await sc()
    .from("linker_proposals")
    .select("*, users(full_name, country, role)")
    .eq("opportunity_id", opportunityId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ── Negotiations (Phase 4) ──────────────────────────────────
export async function getNegotiationsByProposal(
  proposalId: string
): Promise<ProposalNegotiationRow[]> {
  const { data, error } = await sc()
    .from("proposal_negotiations")
    .select("*")
    .eq("proposal_id", proposalId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createNegotiation(
  values: Record<string, unknown>
): Promise<ProposalNegotiationRow> {
  const { data, error } = await sc()
    .from("proposal_negotiations")
    .insert(values)
    .select("*")
    .single();
  if (error) throw error;
  return data as ProposalNegotiationRow;
}

// ── Transactions / ledger / payouts / refunds (Phase 5) ─────
export async function getTransactionsByUser(userId: string) {
  const { data, error } = await sc()
    .from("transactions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Settled wallet balance for a member (MYR).
 *
 * Only COMPLETED transactions count — a top-up is created as PENDING before the
 * member is redirected to the gateway, so counting it would show funds that have
 * not actually been paid. Mirrors the wallet page's balance math exactly.
 *
 *   IN  : REFUND, PAYOUT, REWARD_RELEASE, WALLET_CREDIT
 *   OUT : OPPORTUNITY_FUNDING, POSTING_DEPOSIT, LISTING_FEE, ACTIVATION_FEE,
 *         LINKER_SERVICE_FEE, WALLET_DEBIT
 */
export async function getWalletBalance(userId: string): Promise<number> {
  const transactions = (await getTransactionsByUser(userId)) as TransactionRow[];
  const settled = transactions.filter((t) => t.status === "COMPLETED");
  const inAmount = settled.reduce((sum, t) => {
    return t.type === "REFUND" ||
      t.type === "PAYOUT" ||
      t.type === "REWARD_RELEASE" ||
      t.type === "WALLET_CREDIT"
      ? sum + Number(t.amount || 0)
      : sum;
  }, 0);
  const outAmount = settled.reduce((sum, t) => {
    return t.type === "OPPORTUNITY_FUNDING" ||
      t.type === "POSTING_DEPOSIT" ||
      t.type === "LISTING_FEE" ||
      t.type === "ACTIVATION_FEE" ||
      t.type === "LINKER_SERVICE_FEE" ||
      t.type === "WALLET_DEBIT"
      ? sum + Number(t.amount || 0)
      : sum;
  }, 0);
  return Math.round((inAmount - outAmount + Number.EPSILON) * 100) / 100;
}

export async function getTransactionsByOpportunity(opportunityId: string) {
  const { data, error } = await sc()
    .from("transactions")
    .select("*")
    .eq("opportunity_id", opportunityId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createLedgerEntry(values: Record<string, unknown>) {
  const { data, error } = await sc()
    .from("transaction_ledger")
    .insert(values)
    .select("*")
    .single();
  if (error) throw error;
  return data as LedgerEntryRow;
}

export async function recordLedgerEntries(
  transactionId: string,
  entries: { account: string; debit: number; credit: number }[]
) {
  if (!entries.length) return [];
  const rows = entries.map((e) => ({
    transaction_id: transactionId,
    account: e.account,
    debit: e.debit,
    credit: e.credit,
  }));
  const { data, error } = await sc()
    .from("transaction_ledger")
    .insert(rows)
    .select("*");
  if (error) throw error;
  return (data ?? []) as LedgerEntryRow[];
}

export async function getLedgerByTransaction(transactionId: string) {
  const { data, error } = await sc()
    .from("transaction_ledger")
    .select("*")
    .eq("transaction_id", transactionId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createPayout(values: Record<string, unknown>) {
  const { data, error } = await sc()
    .from("payouts")
    .insert(values)
    .select("*")
    .single();
  if (error) throw error;
  return data as PayoutRow;
}

export async function getPayoutsByRecipient(recipientId: string) {
  const { data, error } = await sc()
    .from("payouts")
    .select("*")
    .eq("recipient_id", recipientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createRefund(values: Record<string, unknown>) {
  const { data, error } = await sc()
    .from("refunds")
    .insert(values)
    .select("*")
    .single();
  if (error) throw error;
  return data as RefundRow;
}

export async function getRefundsByRecipient(recipientId: string) {
  const { data, error } = await sc()
    .from("refunds")
    .select("*")
    .eq("recipient_id", recipientId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function updateTransactionStatus(
  id: string,
  status: string
): Promise<TransactionRow | null> {
  const { data, error } = await sc()
    .from("transactions")
    .update({ status })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return (data as TransactionRow | null) ?? null;
}

// ── Connections / appointments / evidence (Phase 6) ─────────
export async function getConnectionById(
  id: string
): Promise<ConnectionRow | null> {
  const { data, error } = await sc()
    .from("connections")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as ConnectionRow | null) ?? null;
}

export async function getConnectionByOpportunity(
  opportunityId: string
): Promise<ConnectionRow | null> {
  const { data, error } = await sc()
    .from("connections")
    .select("*")
    .eq("opportunity_id", opportunityId)
    .maybeSingle();
  if (error) throw error;
  return (data as ConnectionRow | null) ?? null;
}

export async function getConnectionByProposal(
  proposalId: string
): Promise<ConnectionRow | null> {
  const { data, error } = await sc()
    .from("connections")
    .select("*")
    .eq("proposal_id", proposalId)
    .maybeSingle();
  if (error) throw error;
  return (data as ConnectionRow | null) ?? null;
}

export async function getConnectionsByUser(
  userId: string
): Promise<(ConnectionRow & {
  opportunities?: {
    title?: string | null;
    status?: string | null;
    offer_amount?: number | null;
    currency?: string | null;
    seeker_id?: string | null;
  } | null;
})[]> {
  // Connections where the user is the Linker.
  const { data, error } = await sc()
    .from("connections")
    .select("*, opportunities(title, status, offer_amount, currency, seeker_id)")
    .eq("linker_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Connections on opportunities owned by a Seeker (Phase 8 dashboard).
 */
export async function getConnectionsForSeeker(seekerId: string) {
  const { data, error } = await sc()
    .from("connections")
    .select(
      "*, opportunities!inner(id, title, status, offer_amount, currency, seeker_id)"
    )
    .eq("opportunities.seeker_id", seekerId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getConnectionWithDetails(id: string) {
  const { data, error } = await sc()
    .from("connections")
    .select(
      "*, opportunities(title, status, seeker_id, offer_amount, currency, required_outcome), linker_proposals(proposed_deliverable, proposed_reward)"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function createConnection(values: Record<string, unknown>) {
  const { data, error } = await sc()
    .from("connections")
    .insert(values)
    .select("*")
    .single();
  if (error) throw error;
  return data as ConnectionRow;
}

export async function updateConnection(
  id: string,
  values: Record<string, unknown>
): Promise<ConnectionRow | null> {
  const { data, error } = await sc()
    .from("connections")
    .update(values)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return (data as ConnectionRow | null) ?? null;
}

export async function getAppointmentsByConnection(connectionId: string) {
  const { data, error } = await sc()
    .from("appointments")
    .select("*")
    .eq("connection_id", connectionId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getAppointmentById(
  id: string
): Promise<AppointmentRow | null> {
  const { data, error } = await sc()
    .from("appointments")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as AppointmentRow | null) ?? null;
}

export async function createAppointment(values: Record<string, unknown>) {
  const { data, error } = await sc()
    .from("appointments")
    .insert(values)
    .select("*")
    .single();
  if (error) throw error;
  return data as AppointmentRow;
}

export async function updateAppointment(
  id: string,
  values: Record<string, unknown>
): Promise<AppointmentRow | null> {
  const { data, error } = await sc()
    .from("appointments")
    .update(values)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return (data as AppointmentRow | null) ?? null;
}

export async function getEvidenceByConnection(connectionId: string) {
  const { data, error } = await sc()
    .from("connection_evidence")
    .select("*")
    .eq("connection_id", connectionId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function createEvidence(values: Record<string, unknown>) {
  const { data, error } = await sc()
    .from("connection_evidence")
    .insert(values)
    .select("*")
    .single();
  if (error) throw error;
  return data as ConnectionEvidenceRow;
}

// ── Deadlines / progress reports / flags (Phase 9) ─────────────

export async function getDeadlineByConnection(
  connectionId: string
): Promise<OpportunityDeadlineRow | null> {
  const { data, error } = await sc()
    .from("opportunity_deadlines")
    .select("*")
    .eq("connection_id", connectionId)
    .maybeSingle();
  if (error) throw error;
  return (data as OpportunityDeadlineRow | null) ?? null;
}

export async function getDeadlineById(
  id: string
): Promise<OpportunityDeadlineRow | null> {
  const { data, error } = await sc()
    .from("opportunity_deadlines")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as OpportunityDeadlineRow | null) ?? null;
}

export async function createDeadline(values: Record<string, unknown>) {
  const { data, error } = await sc()
    .from("opportunity_deadlines")
    .insert(values)
    .select("*")
    .single();
  if (error) throw error;
  return data as OpportunityDeadlineRow;
}

export async function updateDeadline(
  id: string,
  values: Record<string, unknown>
): Promise<OpportunityDeadlineRow | null> {
  const { data, error } = await sc()
    .from("opportunity_deadlines")
    .update(values)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return (data as OpportunityDeadlineRow | null) ?? null;
}

/**
 * Linkers whose accepted deadline has passed and who have no active flag yet.
 * Used to raise the yellow flag for a missed commitment (§5.6.1).
 */
export async function listOverdueAcceptedDeadlines(): Promise<
  OpportunityDeadlineRow[]
> {
  const { data, error } = await sc()
    .from("opportunity_deadlines")
    .select("*")
    .eq("status", "ACCEPTED")
    .lt("accepted_date", new Date().toISOString())
    .order("accepted_date", { ascending: true });
  if (error) throw error;
  return (data as OpportunityDeadlineRow[]) ?? [];
}

export async function getProgressReportsByConnection(
  connectionId: string
): Promise<ProgressReportRow[]> {
  const { data, error } = await sc()
    .from("progress_reports")
    .select("*")
    .eq("connection_id", connectionId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as ProgressReportRow[]) ?? [];
}

export async function getProgressReportById(
  id: string
): Promise<ProgressReportRow | null> {
  const { data, error } = await sc()
    .from("progress_reports")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as ProgressReportRow | null) ?? null;
}

export async function createProgressReport(values: Record<string, unknown>) {
  const { data, error } = await sc()
    .from("progress_reports")
    .insert(values)
    .select("*")
    .single();
  if (error) throw error;
  return data as ProgressReportRow;
}

export async function getRecentReportTimestamps(
  connectionId: string
): Promise<string[]> {
  const { data, error } = await sc()
    .from("progress_reports")
    .select("created_at")
    .eq("connection_id", connectionId)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw error;
  return ((data ?? []) as { created_at: string }[]).map((r) => r.created_at);
}

export async function getCommentsByReport(
  reportId: string
): Promise<ProgressReportCommentRow[]> {
  const { data, error } = await sc()
    .from("progress_report_comments")
    .select("*")
    .eq("report_id", reportId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data as ProgressReportCommentRow[]) ?? [];
}

export async function getCommentById(
  id: string
): Promise<ProgressReportCommentRow | null> {
  const { data, error } = await sc()
    .from("progress_report_comments")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as ProgressReportCommentRow | null) ?? null;
}

export async function createProgressComment(values: Record<string, unknown>) {
  const { data, error } = await sc()
    .from("progress_report_comments")
    .insert(values)
    .select("*")
    .single();
  if (error) throw error;
  return data as ProgressReportCommentRow;
}

export async function updateProgressComment(
  id: string,
  values: Record<string, unknown>
): Promise<ProgressReportCommentRow | null> {
  const { data, error } = await sc()
    .from("progress_report_comments")
    .update(values)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return (data as ProgressReportCommentRow | null) ?? null;
}

/**
 * Append a prior version of an edited comment to the immutable update history.
 * The previous body is never destroyed — this is what makes edits evidence (§9.11.1).
 */
export async function createCommentRevision(values: Record<string, unknown>) {
  const { data, error } = await sc()
    .from("progress_report_comment_revisions")
    .insert(values)
    .select("*")
    .single();
  if (error) throw error;
  return data as ProgressReportCommentRevisionRow;
}

export async function getRevisionsByComment(
  commentId: string
): Promise<ProgressReportCommentRevisionRow[]> {
  const { data, error } = await sc()
    .from("progress_report_comment_revisions")
    .select("*")
    .eq("comment_id", commentId)
    .order("revision_number", { ascending: true });
  if (error) throw error;
  return (data as ProgressReportCommentRevisionRow[]) ?? [];
}

export async function getActiveFlagByConnection(
  connectionId: string
): Promise<LinkerFlagRow | null> {
  const { data, error } = await sc()
    .from("linker_flags")
    .select("*")
    .eq("connection_id", connectionId)
    .eq("status", "RAISED")
    .maybeSingle();
  if (error) throw error;
  return (data as LinkerFlagRow | null) ?? null;
}

export async function getFlagById(
  id: string
): Promise<LinkerFlagRow | null> {
  const { data, error } = await sc()
    .from("linker_flags")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as LinkerFlagRow | null) ?? null;
}

export async function listFlagsByLinker(
  linkerId: string
): Promise<LinkerFlagRow[]> {
  const { data, error } = await sc()
    .from("linker_flags")
    .select("*")
    .eq("linker_id", linkerId)
    .order("raised_at", { ascending: false });
  if (error) throw error;
  return (data as LinkerFlagRow[]) ?? [];
}

export async function listFlagsByConnection(
  connectionId: string
): Promise<LinkerFlagRow[]> {
  const { data, error } = await sc()
    .from("linker_flags")
    .select("*")
    .eq("connection_id", connectionId)
    .order("raised_at", { ascending: false });
  if (error) throw error;
  return (data as LinkerFlagRow[]) ?? [];
}

export async function createLinkerFlag(values: Record<string, unknown>) {
  const { data, error } = await sc()
    .from("linker_flags")
    .insert(values)
    .select("*")
    .single();
  if (error) throw error;
  return data as LinkerFlagRow;
}

export async function updateLinkerFlag(
  id: string,
  values: Record<string, unknown>
): Promise<LinkerFlagRow | null> {
  const { data, error } = await sc()
    .from("linker_flags")
    .update(values)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return (data as LinkerFlagRow | null) ?? null;
}

export async function countFlagsByLinker(linkerId: string): Promise<{
  raised: number;
  cleared: number;
}> {
  const { data, error } = await sc()
    .from("linker_flags")
    .select("status")
    .eq("linker_id", linkerId);
  if (error) throw error;
  const rows = (data ?? []) as { status: string }[];
  return {
    raised: rows.filter((r) => r.status === "RAISED").length,
    cleared: rows.filter((r) => r.status === "CLEARED").length,
  };
}

/**
 * Assemble the full evidence of record for a connection (blueprint §9.11.1):
 * the deadline record, the progress report thread, every comment with its
 * immutable revision history, and the flag history.
 *
 * Used by the admin dispute review so a resolution rests on what was actually
 * claimed, by whom, and when — not on the current text of a message alone.
 */
export async function getEvidenceOfRecord(connectionId: string): Promise<{
  deadline: OpportunityDeadlineRow | null;
  reports: (Omit<ProgressReportRow, "comments"> & {
    comments: (Omit<ProgressReportCommentRow, "revisions"> & {
      revisions: ProgressReportCommentRevisionRow[];
    })[];
  })[];
  flags: LinkerFlagRow[];
}> {
  const [deadline, reports, flags] = await Promise.all([
    getDeadlineByConnection(connectionId),
    getProgressReportsByConnection(connectionId),
    listFlagsByConnection(connectionId),
  ]);

  const hydrated = await Promise.all(
    reports.map(async (r) => {
      const comments = await getCommentsByReport(r.id);
      const withRevisions = await Promise.all(
        comments.map(async (c) => ({
          ...c,
          revisions: await getRevisionsByComment(c.id),
        }))
      );
      return { ...r, comments: withRevisions };
    })
  );

  return { deadline, reports: hydrated, flags };
}

// ── Reviews / reputation (Phase 6) ──────────────────────────
export async function getReviewsForSubject(subjectId: string) {
  const { data, error } = await sc()
    .from("reviews")
    .select("*")
    .eq("subject_id", subjectId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function getReviewByAuthorAndOpportunity(
  authorId: string,
  opportunityId: string
) {
  const { data, error } = await sc()
    .from("reviews")
    .select("*")
    .eq("author_id", authorId)
    .eq("opportunity_id", opportunityId)
    .maybeSingle();
  if (error) throw error;
  return (data as ReviewRow | null) ?? null;
}

export async function createReview(values: Record<string, unknown>) {
  const { data, error } = await sc()
    .from("reviews")
    .insert(values)
    .select("*")
    .single();
  if (error) throw error;
  return data as ReviewRow;
}

export async function getReputationByUserId(
  userId: string
): Promise<ReputationRow | null> {
  const { data, error } = await sc()
    .from("reputation_metrics")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as ReputationRow | null) ?? null;
}

export async function upsertReputation(
  userId: string,
  values: Record<string, unknown>
) {
  const { data, error } = await sc()
    .from("reputation_metrics")
    .upsert({ user_id: userId, ...values }, { onConflict: "user_id" })
    .select("*")
    .single();
  if (error) throw error;
  return data as ReputationRow;
}

// ============================================================
// PHASE 7: ADMIN / RBAC / KYC / DISPUTES / AUDIT LOGS
// ============================================================

// ── Admin Members & RBAC ─────────────────────────────────────
export async function getAdminMemberByUserId(
  userId: string
): Promise<AdminMemberRow | null> {
  const { data, error } = await sc()
    .from("admin_members")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as AdminMemberRow | null) ?? null;
}

export async function createAdminMember(values: Record<string, unknown>) {
  const { data, error } = await sc()
    .from("admin_members")
    .insert(values)
    .select("*")
    .single();
  if (error) throw error;
  return data as AdminMemberRow;
}

// ── Member Management ────────────────────────────────────────
export async function listAllMembers(params?: {
  search?: string;
  role?: string;
  status?: string;
  limit?: number;
}) {
  let query = sc()
    .from("users")
    .select("*, member_profiles(*)")
    .eq("app", JOMLINK_APP_TAG)
    .order("created_at", { ascending: false });

  if (params?.role && params.role !== "ALL") {
    query = query.eq("role", params.role);
  }
  if (params?.status && params.status !== "ALL") {
    query = query.eq("status", params.status);
  }
  if (params?.search && params.search.trim()) {
    const s = params.search.trim();
    query = query.or(`full_name.ilike.%${s}%,email.ilike.%${s}%`);
  }
  if (params?.limit) {
    query = query.limit(params.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as (JomlinkUserRow & {
    member_profiles: MemberProfileRow[] | MemberProfileRow | null;
  })[];
}

export async function updateUserStatus(userId: string, status: string) {
  const { data, error } = await sc()
    .from("users")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .eq("app", JOMLINK_APP_TAG)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data as JomlinkUserRow | null;
}

export async function updateUserRole(userId: string, role: string) {
  const { data, error } = await sc()
    .from("users")
    .update({ role, updated_at: new Date().toISOString() })
    .eq("id", userId)
    .eq("app", JOMLINK_APP_TAG)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return data as JomlinkUserRow | null;
}

// ── Opportunity Moderation ────────────────────────────────────
export async function listOpportunitiesForAdmin(params?: {
  status?: string;
  category?: string;
  search?: string;
  limit?: number;
}) {
  let query = sc()
    .from("opportunities")
    .select("*, users!opportunities_seeker_id_fkey(full_name, email)")
    .order("created_at", { ascending: false });

  if (params?.status && params.status !== "ALL") {
    query = query.eq("status", params.status);
  }
  if (params?.category && params.category !== "ALL") {
    query = query.eq("category", params.category);
  }
  if (params?.search && params.search.trim()) {
    const s = params.search.trim();
    query = query.or(`title.ilike.%${s}%,target_entity.ilike.%${s}%`);
  }
  if (params?.limit) {
    query = query.limit(params.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as (OpportunityRow & {
    users?: { full_name: string; email: string } | null;
  })[];
}

export async function updateOpportunityAdmin(
  id: string,
  values: Record<string, unknown>
): Promise<OpportunityRow | null> {
  const { data, error } = await sc()
    .from("opportunities")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return (data as OpportunityRow | null) ?? null;
}

// ── KYC & Relationship Verification ───────────────────────────
export async function listKycRecords(status?: string, limit = 50) {
  let query = sc()
    .from("kyc_records")
    .select("*, users!kyc_records_user_id_fkey(full_name, email)")
    .order("created_at", { ascending: false });

  if (status && status !== "ALL") {
    query = query.eq("status", status);
  }
  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as (KycRecordRow & {
    users?: { full_name: string; email: string } | null;
  })[];
}

export async function getKycRecordById(
  id: string
): Promise<KycRecordRow | null> {
  const { data, error } = await sc()
    .from("kyc_records")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as KycRecordRow | null) ?? null;
}

export async function createKycRecord(values: Record<string, unknown>) {
  const { data, error } = await sc()
    .from("kyc_records")
    .insert(values)
    .select("*")
    .single();
  if (error) throw error;
  return data as KycRecordRow;
}

/** List a member's own KYC records (newest first). */
export async function getKycRecordsByUser(
  userId: string
): Promise<KycRecordRow[]> {
  const { data, error } = await sc()
    .from("kyc_records")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as KycRecordRow[];
}

export async function updateKycRecord(
  id: string,
  values: Record<string, unknown>
): Promise<KycRecordRow | null> {
  const { data, error } = await sc()
    .from("kyc_records")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return (data as KycRecordRow | null) ?? null;
}

// ── KYC biometrics (face + ID captures for future ML) ─────────
export async function createKycBiometric(
  values: Record<string, unknown>
): Promise<KycBiometricRow> {
  const { data, error } = await sc()
    .from("kyc_biometrics")
    .insert(values)
    .select("*")
    .single();
  if (error) throw error;
  return data as KycBiometricRow;
}

/** A member's own biometric captures (newest first). */
export async function getKycBiometricsByUser(
  userId: string
): Promise<KycBiometricRow[]> {
  const { data, error } = await sc()
    .from("kyc_biometrics")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as KycBiometricRow[];
}

export async function getKycBiometricById(
  id: string
): Promise<KycBiometricRow | null> {
  const { data, error } = await sc()
    .from("kyc_biometrics")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as KycBiometricRow | null) ?? null;
}

/** All biometric captures with the owning member, for the admin review queue. */
export async function listKycBiometrics(params?: {
  labelStatus?: string;
  limit?: number;
}) {
  let query = sc()
    .from("kyc_biometrics")
    .select("*, users!kyc_biometrics_user_id_fkey(full_name, email)")
    .order("created_at", { ascending: false });

  if (params?.labelStatus && params.labelStatus !== "ALL") {
    query = query.eq("label_status", params.labelStatus);
  }
  if (params?.limit) {
    query = query.limit(params.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as (KycBiometricRow & {
    users?: { full_name: string; email: string } | null;
  })[];
}

/** Label a capture (MATCH / NO_MATCH / UNUSABLE) for ML training. */
export async function labelKycBiometric(
  id: string,
  labelStatus: string,
  labelledBy: string
): Promise<KycBiometricRow | null> {
  const { data, error } = await sc()
    .from("kyc_biometrics")
    .update({
      label_status: labelStatus,
      labelled_by: labelledBy,
      labelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return (data as KycBiometricRow | null) ?? null;
}

/** Aggregate counts per label — a light dashboard for dataset readiness. */
export async function getBiometricDatasetStats(): Promise<
  Record<string, number>
> {
  const { data, error } = await sc()
    .from("kyc_biometrics")
    .select("label_status");
  if (error) throw error;
  const stats: Record<string, number> = {
    UNLABELLED: 0,
    MATCH: 0,
    NO_MATCH: 0,
    UNUSABLE: 0,
  };
  for (const row of (data ?? []) as { label_status: string }[]) {
    stats[row.label_status] = (stats[row.label_status] ?? 0) + 1;
  }
  return stats;
}

/** Record/withdraw biometric-consent on the member's `users` row. */
export async function setBiometricConsent(
  userId: string,
  consent: boolean,
  version: string
): Promise<void> {
  const { error } = await sc()
    .from("users")
    .update({
      biometric_consent: consent,
      biometric_consent_at: consent ? new Date().toISOString() : null,
      biometric_consent_version: consent ? version : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId);
  if (error) throw error;
}

export async function listRelationshipsForAdmin(params?: {
  status?: string;
  limit?: number;
}) {
  let query = sc()
    .from("relationships")
    .select("*, users!relationships_user_id_fkey(full_name, email)")
    .order("created_at", { ascending: false });

  if (params?.status && params.status !== "ALL") {
    query = query.eq("verification_status", params.status);
  }
  if (params?.limit) {
    query = query.limit(params.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as (RelationshipRow & {
    users?: { full_name: string; email: string } | null;
  })[];
}

export async function updateRelationshipAdmin(
  id: string,
  values: Record<string, unknown>
): Promise<RelationshipRow | null> {
  const { data, error } = await sc()
    .from("relationships")
    .update(values)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return (data as RelationshipRow | null) ?? null;
}

// ── Disputes ──────────────────────────────────────────────────
export async function listDisputes(status?: string, limit = 50) {
  let query = sc()
    .from("disputes")
    .select("*, opportunities(*)")
    .order("created_at", { ascending: false });

  if (status && status !== "ALL") {
    query = query.eq("status", status);
  }
  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as (DisputeRow & {
    opportunities?: OpportunityRow | null;
  })[];
}

export async function getDisputeById(id: string): Promise<
  | (DisputeRow & {
      opportunities?: OpportunityRow | null;
    })
  | null
> {
  const { data, error } = await sc()
    .from("disputes")
    .select("*, opportunities(*)")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ?? null;
}

export async function getDisputeByConnectionId(
  connectionId: string
): Promise<DisputeRow | null> {
  const { data, error } = await sc()
    .from("disputes")
    .select("*")
    .eq("connection_id", connectionId)
    .order("created_at", { ascending: false })
    .maybeSingle();
  if (error) throw error;
  return (data as DisputeRow | null) ?? null;
}

export async function createDispute(
  values: Record<string, unknown>
): Promise<DisputeRow> {
  const { data, error } = await sc()
    .from("disputes")
    .insert(values)
    .select("*")
    .single();
  if (error) throw error;
  return data as DisputeRow;
}

export async function updateDispute(
  id: string,
  values: Record<string, unknown>
): Promise<DisputeRow | null> {
  const { data, error } = await sc()
    .from("disputes")
    .update({ ...values, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  return (data as DisputeRow | null) ?? null;
}

// ── Audit Logs ────────────────────────────────────────────────
export async function listAuditLogs(params?: {
  limit?: number;
  action?: string;
  entity?: string;
}) {
  let query = sc()
    .from("audit_logs")
    .select("*")
    .order("created_at", { ascending: false });

  if (params?.action && params.action !== "ALL") {
    query = query.eq("action", params.action);
  }
  if (params?.entity && params.entity !== "ALL") {
    query = query.eq("entity", params.entity);
  }
  if (params?.limit) {
    query = query.limit(params.limit);
  }

  const { data, error } = await query;
  if (error) throw error;
  const rows = data ?? [];
  // audit_logs has no FK to users (admin_id may be null for member-initiated
  // actions), so resolve admin names with a second query.
  const names = await resolveUserNames(
    rows.map((r: { admin_id: string | null }) => r.admin_id)
  );
  return rows.map((r: { admin_id: string | null }) => ({
    ...r,
    users: r.admin_id ? names.get(r.admin_id) ?? null : null,
  })) as (AuditLogRow & {
    users?: { full_name: string; email: string } | null;
  })[];
}

// ── Overview Statistics ───────────────────────────────────────
export async function getAdminOverviewStats() {
  const [
    membersRes,
    opportunitiesRes,
    pendingKycRes,
    openDisputesRes,
    activeEscrowRes,
  ] = await Promise.all([
    sc().from("users").select("id", { count: "exact", head: true }).eq("app", JOMLINK_APP_TAG),
    sc().from("opportunities").select("id", { count: "exact", head: true }),
    sc().from("kyc_records").select("id", { count: "exact", head: true }).eq("status", "PENDING"),
    sc().from("disputes").select("id", { count: "exact", head: true }).in("status", ["OPEN", "UNDER_REVIEW"]),
    sc().from("opportunities").select("funded_amount").eq("status", "IN_PROGRESS"),
  ]);

  const escrowSum = (activeEscrowRes.data ?? []).reduce(
    (sum: number, opp: { funded_amount?: number | null }) =>
      sum + Number(opp.funded_amount ?? 0),
    0
  );

  return {
    totalMembers: membersRes.count ?? 0,
    totalOpportunities: opportunitiesRes.count ?? 0,
    pendingKyc: pendingKycRes.count ?? 0,
    openDisputes: openDisputesRes.count ?? 0,
    escrowHeld: escrowSum,
  };
}

/**
 * Resolves user display info for a set of user ids.
 *
 * NOTE: `transactions`, `payouts`, `refunds` and `audit_logs` intentionally have
 * no FK to `users` (they may reference system/platform accounts), so PostgREST
 * cannot embed `users(...)` on them. We resolve names with a second query instead.
 */
async function resolveUserNames(
  ids: (string | null | undefined)[]
): Promise<Map<string, { full_name: string; email: string }>> {
  const unique = Array.from(new Set(ids.filter(Boolean) as string[]));
  if (unique.length === 0) return new Map();
  const { data, error } = await sc()
    .from("users")
    .select("id, full_name, email")
    .in("id", unique);
  if (error) throw error;
  return new Map(
    (data ?? []).map((u: { id: string; full_name: string; email: string }) => [
      u.id,
      { full_name: u.full_name, email: u.email },
    ])
  );
}

export async function listAllTransactionsAdmin(limit = 50) {
  const { data, error } = await sc()
    .from("transactions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = data ?? [];
  const names = await resolveUserNames(rows.map((r: { user_id: string }) => r.user_id));
  return rows.map((r: { user_id: string }) => ({
    ...r,
    users: names.get(r.user_id) ?? null,
  }));
}

export async function listAllPayoutsAdmin(limit = 50) {
  const { data, error } = await sc()
    .from("payouts")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = data ?? [];
  const names = await resolveUserNames(
    rows.map((r: { recipient_id: string }) => r.recipient_id)
  );
  return rows.map((r: { recipient_id: string }) => ({
    ...r,
    users: names.get(r.recipient_id) ?? null,
  }));
}

export async function listAllRefundsAdmin(limit = 50) {
  const { data, error } = await sc()
    .from("refunds")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  const rows = data ?? [];
  const names = await resolveUserNames(
    rows.map((r: { recipient_id: string }) => r.recipient_id)
  );
  return rows.map((r: { recipient_id: string }) => ({
    ...r,
    users: names.get(r.recipient_id) ?? null,
  }));
}

// ============================================================
// PHASE 8: NOTIFICATIONS
// ============================================================

export async function getNotificationsByUser(
  userId: string,
  limit = 50
): Promise<NotificationRow[]> {
  const { data, error } = await sc()
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data as NotificationRow[] | null) ?? [];
}

export async function getUnreadNotificationCount(
  userId: string
): Promise<number> {
  const { count, error } = await sc()
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("read", false);
  if (error) throw error;
  return count ?? 0;
}

export async function createNotification(
  values: Record<string, unknown>
): Promise<NotificationRow> {
  const { data, error } = await sc()
    .from("notifications")
    .insert(values)
    .select("*")
    .single();
  if (error) throw error;
  return data as NotificationRow;
}

export async function markNotificationRead(
  id: string,
  userId: string
): Promise<void> {
  const { error } = await sc()
    .from("notifications")
    .update({ read: true })
    .eq("id", id)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const { error } = await sc()
    .from("notifications")
    .update({ read: true })
    .eq("user_id", userId)
    .eq("read", false);
  if (error) throw error;
}

