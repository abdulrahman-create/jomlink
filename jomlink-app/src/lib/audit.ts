import { getServiceRoleClient } from "@/lib/supabase/admin";
import type { UntypedSchemaClient } from "@/lib/data";
import type { AuditLogRow } from "@/lib/jomlink-types";

const sc = () =>
  getServiceRoleClient() as unknown as UntypedSchemaClient;

export interface CreateAuditLogParams {
  adminId?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  details?: Record<string, unknown> | null;
  ip?: string | null;
}

export const AUDIT_ACTIONS = {
  // Members
  MEMBER_SUSPENDED: "MEMBER_SUSPENDED",
  MEMBER_REINSTATED: "MEMBER_REINSTATED",
  MEMBER_ROLE_UPDATED: "MEMBER_ROLE_UPDATED",
  // Opportunities
  OPPORTUNITY_APPROVED: "OPPORTUNITY_APPROVED",
  OPPORTUNITY_FLAGGED: "OPPORTUNITY_FLAGGED",
  OPPORTUNITY_REJECTED: "OPPORTUNITY_REJECTED",
  OPPORTUNITY_RESTRICTED_TOGGLED: "OPPORTUNITY_RESTRICTED_TOGGLED",
  // §11.9.1 — a post/publish/edit/approve was refused because the category is
  // on the compliance deny-list. Written with a null admin_id when the actor is
  // a member, so every refused attempt is still attributable.
  OPPORTUNITY_CATEGORY_BLOCKED: "OPPORTUNITY_CATEGORY_BLOCKED",
  // KYC & Relationships
  KYC_APPROVED: "KYC_APPROVED",
  KYC_REJECTED: "KYC_REJECTED",
  // Dev/test only: the member self-verified through the KYC bypass. Never
  // reachable in production (see lib/kyc-dev-bypass.ts).
  KYC_DEV_VERIFIED: "KYC_DEV_VERIFIED",
  RELATIONSHIP_VERIFIED: "RELATIONSHIP_VERIFIED",
  RELATIONSHIP_REJECTED: "RELATIONSHIP_REJECTED",
  // Disputes
  DISPUTE_RAISED: "DISPUTE_RAISED",
  DISPUTE_UNDER_REVIEW: "DISPUTE_UNDER_REVIEW",
  DISPUTE_RESOLVED: "DISPUTE_RESOLVED",
  // Finance
  REFUND_ISSUED: "REFUND_ISSUED",
  PAYOUT_RELEASED: "PAYOUT_RELEASED",
  PAYOUT_REQUESTED: "PAYOUT_REQUESTED",
  PAYOUT_PAID: "PAYOUT_PAID",
  // §11.9.2 — AML / sanctions / PEP screening on money-out. Every screen is
  // written whether or not it results in a payment, so the record is
  // attributable (party, list version, result, reviewer, timestamp).
  PAYOUT_SCREEN_RECORDED: "PAYOUT_SCREEN_RECORDED",
  PAYOUT_SCREEN_BLOCKED: "PAYOUT_SCREEN_BLOCKED",
  PAYOUT_COMPLIANCE_CLEARED: "PAYOUT_COMPLIANCE_CLEARED",
  PAYOUT_REQUEST_DECLINED: "PAYOUT_REQUEST_DECLINED",
  CLAWBACK_OPENED: "CLAWBACK_OPENED",
  CLAWBACK_RECOVERED: "CLAWBACK_RECOVERED",
  CLAWBACK_CLOSED: "CLAWBACK_CLOSED",
} as const;

/**
 * Inserts a permanent, tamper-resistant audit log record into `jomlink.audit_logs`.
 */
export async function recordAuditLog(
  params: CreateAuditLogParams
): Promise<AuditLogRow> {
  const { data, error } = await sc()
    .from("audit_logs")
    .insert({
      admin_id: params.adminId ?? null,
      action: params.action,
      entity: params.entity,
      entity_id: params.entityId ?? null,
      details: params.details ?? {},
      ip: params.ip ?? null,
    })
    .select("*")
    .single();

  if (error) {
    console.error("Failed to write audit log:", error);
    throw error;
  }
  return data as AuditLogRow;
}

