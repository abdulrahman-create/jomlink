import { getServiceRoleClient } from "@/lib/supabase/admin";
import type { AuditLogRow } from "@/lib/jomlink-types";

const sc = () =>
  getServiceRoleClient().schema("jomlink" as never) as unknown as {
    from: (table: string) => any;
  };

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
  // KYC & Relationships
  KYC_APPROVED: "KYC_APPROVED",
  KYC_REJECTED: "KYC_REJECTED",
  RELATIONSHIP_VERIFIED: "RELATIONSHIP_VERIFIED",
  RELATIONSHIP_REJECTED: "RELATIONSHIP_REJECTED",
  // Disputes
  DISPUTE_RAISED: "DISPUTE_RAISED",
  DISPUTE_UNDER_REVIEW: "DISPUTE_UNDER_REVIEW",
  DISPUTE_RESOLVED: "DISPUTE_RESOLVED",
  // Finance
  REFUND_ISSUED: "REFUND_ISSUED",
  PAYOUT_RELEASED: "PAYOUT_RELEASED",
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

