"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/rbac";
import { recordAuditLog, AUDIT_ACTIONS } from "@/lib/audit";
import {
  updateUserStatus,
  updateUserRole,
  updateOpportunityAdmin,
  getOpportunityById,
  getKycRecordById,
  updateKycRecord,
  updateRelationshipAdmin,
  createTransaction,
  recordLedgerEntries,
  createRefund,
} from "@/lib/queries";
import { accounts, doubleEntry } from "@/lib/ledger";

// ── Member Management Actions ────────────────────────────────

export async function suspendMemberAction(formData: FormData) {
  const admin = await requireAdmin("members:suspend");
  const userId = formData.get("userId") as string;
  const reason = (formData.get("reason") as string) || "Administrative suspension";

  if (!userId) {
    throw new Error("Member ID is required");
  }

  await updateUserStatus(userId, "SUSPENDED");

  await recordAuditLog({
    adminId: admin.user.id,
    action: AUDIT_ACTIONS.MEMBER_SUSPENDED,
    entity: "USER",
    entityId: userId,
    details: { reason, suspendedBy: admin.user.email },
  });

  revalidatePath("/admin/members");
  revalidatePath("/admin");
}

export async function reinstateMemberAction(formData: FormData) {
  const admin = await requireAdmin("members:suspend");
  const userId = formData.get("userId") as string;

  if (!userId) {
    throw new Error("Member ID is required");
  }

  await updateUserStatus(userId, "ACTIVE");

  await recordAuditLog({
    adminId: admin.user.id,
    action: AUDIT_ACTIONS.MEMBER_REINSTATED,
    entity: "USER",
    entityId: userId,
    details: { reinstatedBy: admin.user.email },
  });

  revalidatePath("/admin/members");
  revalidatePath("/admin");
}

export async function updateMemberRoleAction(formData: FormData) {
  const admin = await requireAdmin("members:write");
  const userId = formData.get("userId") as string;
  const newRole = formData.get("role") as string;

  if (!userId || !newRole) {
    throw new Error("User ID and Role are required");
  }

  await updateUserRole(userId, newRole);

  await recordAuditLog({
    adminId: admin.user.id,
    action: AUDIT_ACTIONS.MEMBER_ROLE_UPDATED,
    entity: "USER",
    entityId: userId,
    details: { newRole, updatedBy: admin.user.email },
  });

  revalidatePath("/admin/members");
  revalidatePath("/admin");
}

// ── Opportunity Moderation Actions ───────────────────────────

export async function moderateOpportunityAction(formData: FormData) {
  const admin = await requireAdmin("opportunities:moderate");
  const opportunityId = formData.get("opportunityId") as string;
  const newStatus = formData.get("status") as string;
  const reason = (formData.get("reason") as string) || null;

  if (!opportunityId || !newStatus) {
    throw new Error("Opportunity ID and target status required");
  }

  const opp = await getOpportunityById(opportunityId);
  if (!opp) {
    throw new Error("Opportunity not found");
  }

  // If rejected and funded, initiate refund of reward escrow back to Seeker
  if (newStatus === "CANCELLED" && opp.funded_amount && opp.funded_amount > 0) {
    const refundAmount = Number(opp.funded_amount);
    const txn = await createTransaction({
      user_id: opp.seeker_id,
      opportunity_id: opp.id,
      type: "REFUND",
      status: "COMPLETED",
      amount: refundAmount,
      currency: opp.currency,
      description: `Opportunity rejected by admin: ${reason ?? "Prohibited conduct"}`,
    });

    const entries = doubleEntry(
      accounts.escrow(opp.id),
      accounts.seeker(opp.seeker_id),
      refundAmount
    );
    if (entries.length > 0) {
      await recordLedgerEntries(txn.id, entries);
    }

    await createRefund({
      transaction_id: txn.id,
      recipient_id: opp.seeker_id,
      amount: refundAmount,
      reason: reason ?? "Admin moderation rejection",
      status: "COMPLETED",
      approved_by: admin.user.id,
    });
  }

  await updateOpportunityAdmin(opportunityId, {
    status: newStatus,
  });

  await recordAuditLog({
    adminId: admin.user.id,
    action:
      newStatus === "ACTIVE"
        ? AUDIT_ACTIONS.OPPORTUNITY_APPROVED
        : newStatus === "CANCELLED"
        ? AUDIT_ACTIONS.OPPORTUNITY_REJECTED
        : AUDIT_ACTIONS.OPPORTUNITY_FLAGGED,
    entity: "OPPORTUNITY",
    entityId: opportunityId,
    details: {
      previousStatus: opp.status,
      newStatus,
      reason,
      moderatedBy: admin.user.email,
    },
  });

  revalidatePath("/admin/opportunities");
  revalidatePath("/marketplace");
  revalidatePath(`/opportunities/${opportunityId}`);
}

export async function toggleRestrictedCategoryAction(formData: FormData) {
  const admin = await requireAdmin("compliance:write");
  const opportunityId = formData.get("opportunityId") as string;
  const isRestricted = formData.get("isRestricted") === "true";

  if (!opportunityId) {
    throw new Error("Opportunity ID is required");
  }

  await updateOpportunityAdmin(opportunityId, {
    is_restricted_category: isRestricted,
    confidentiality: isRestricted ? "RESTRICTED" : "PUBLIC",
  });

  await recordAuditLog({
    adminId: admin.user.id,
    action: AUDIT_ACTIONS.OPPORTUNITY_RESTRICTED_TOGGLED,
    entity: "OPPORTUNITY",
    entityId: opportunityId,
    details: { isRestricted, toggledBy: admin.user.email },
  });

  revalidatePath("/admin/opportunities");
  revalidatePath(`/opportunities/${opportunityId}`);
}

// ── KYC & Verification Review Actions ────────────────────────

export async function reviewKycAction(formData: FormData) {
  const admin = await requireAdmin("kyc:write");
  const kycId = formData.get("kycId") as string;
  const status = formData.get("status") as "VERIFIED" | "REJECTED";
  const notes = (formData.get("notes") as string) || null;

  if (!kycId || !status) {
    throw new Error("KYC ID and status required");
  }

  const kyc = await getKycRecordById(kycId);
  if (kyc) {
    await updateKycRecord(kycId, {
      status,
      notes,
      reviewed_by: admin.user.id,
      reviewed_at: new Date().toISOString(),
    });

    const { upsertProfile } = await import("@/lib/queries");
    await upsertProfile(kyc.user_id, {
      verification_status: status,
      verified_badge: status === "VERIFIED",
    });
  }

  await recordAuditLog({
    adminId: admin.user.id,
    action: status === "VERIFIED" ? AUDIT_ACTIONS.KYC_APPROVED : AUDIT_ACTIONS.KYC_REJECTED,
    entity: "KYC_RECORD",
    entityId: kycId,
    details: { status, notes, reviewedBy: admin.user.email, userId: kyc?.user_id },
  });

  revalidatePath("/admin/kyc");
  revalidatePath("/admin");
}

export async function reviewRelationshipAction(formData: FormData) {
  const admin = await requireAdmin("kyc:write");
  const relationshipId = formData.get("relationshipId") as string;
  const status = formData.get("status") as "VERIFIED" | "REJECTED";
  const verified = status === "VERIFIED";

  if (!relationshipId || !status) {
    throw new Error("Relationship ID and status required");
  }

  await updateRelationshipAdmin(relationshipId, {
    verification_status: status,
    verified,
  });

  await recordAuditLog({
    adminId: admin.user.id,
    action: verified
      ? AUDIT_ACTIONS.RELATIONSHIP_VERIFIED
      : AUDIT_ACTIONS.RELATIONSHIP_REJECTED,
    entity: "RELATIONSHIP",
    entityId: relationshipId,
    details: { status, verified, reviewedBy: admin.user.email },
  });

  revalidatePath("/admin/kyc");
  revalidatePath("/admin");
}
