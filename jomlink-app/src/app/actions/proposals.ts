"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  getOpportunityById,
  getProposalByLinkerAndOpportunity,
  createProposal,
  updateProposalIfOwned,
} from "@/lib/queries";

// ── Validation ──────────────────────────────────────────────
const ProposalSchema = z.object({
  relationshipId: z.string().optional().or(z.literal("")),
  relationshipDeclared: z.string().min(10, "Describe the basis of your relationship").max(1000),
  proposedTarget: z.string().max(160).optional().or(z.literal("")),
  proposedMethod: z.string().max(500).optional().or(z.literal("")),
  proposedDeliverable: z.string().min(10, "Describe what you will deliver").max(2000),
  proposedReward: z.coerce.number().min(1, "Proposed reward must be more than 0").max(1_000_000_000),
  proposedDeadline: z.coerce.date().optional(),
  remarks: z.string().max(1000).optional().or(z.literal("")),
  isTargetSubstitution: z.boolean().optional(),
  substitutionReason: z.string().max(1000).optional().or(z.literal("")),
});

export type ProposalState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  success?: boolean;
  proposalId?: string;
};

/**
 * Submit a Linker proposal for an ACTIVE opportunity.
 * A Linker may only have ONE active proposal per opportunity.
 */
export async function submitProposalAction(
  prevState: ProposalState | undefined,
  formData: FormData
): Promise<ProposalState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  const opportunityId = String(formData.get("opportunityId") || "");
  const opp = opportunityId ? await getOpportunityById(opportunityId) : null;
  if (!opp) return { error: "Opportunity not found." };
  if (opp.status !== "ACTIVE") {
    return { error: "This opportunity is not open for proposals." };
  }
  if (opp.seeker_id === user.id) {
    return { error: "You cannot apply to your own opportunity." };
  }

  const parsed = ProposalSchema.safeParse({
    relationshipId: formData.get("relationshipId") || undefined,
    relationshipDeclared: formData.get("relationshipDeclared"),
    proposedTarget: formData.get("proposedTarget") || undefined,
    proposedMethod: formData.get("proposedMethod") || undefined,
    proposedDeliverable: formData.get("proposedDeliverable"),
    proposedReward: formData.get("proposedReward"),
    proposedDeadline: formData.get("proposedDeadline") || undefined,
    remarks: formData.get("remarks") || undefined,
    isTargetSubstitution: formData.get("isTargetSubstitution") === "on",
    substitutionReason: formData.get("substitutionReason") || undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const d = parsed.data;
  const isSubstitution = d.isTargetSubstitution ?? false;

  // Enforce substitution reason when flagged.
  if (isSubstitution && !d.substitutionReason) {
    return {
      fieldErrors: {
        substitutionReason: ["Please explain the substitution."],
      },
    };
  }

  const existing = await getProposalByLinkerAndOpportunity(user.id, opp.id);
  if (existing && existing.status !== "REJECTED" && existing.status !== "WITHDRAWN") {
    return { error: "You already have an active proposal for this opportunity." };
  }

  const values: Record<string, unknown> = {
    opportunity_id: opp.id,
    linker_id: user.id,
    relationship_id: d.relationshipId || null,
    relationship_declared: d.relationshipDeclared,
    proposed_target: d.proposedTarget || null,
    proposed_method: d.proposedMethod || null,
    proposed_deliverable: d.proposedDeliverable,
    proposed_reward: d.proposedReward,
    proposed_deadline: d.proposedDeadline ? d.proposedDeadline.toISOString() : null,
    remarks: d.remarks || null,
    is_target_substitution: isSubstitution,
    substitution_reason: isSubstitution ? d.substitutionReason : null,
    status: "SUBMITTED",
  };

  try {
    const proposal = existing
      ? await updateProposalIfOwned(existing.id, user.id, values)
      : await createProposal(values);
    revalidatePath("/opportunities/" + opp.id);
    revalidatePath("/dashboard/proposals");
    return { success: true, proposalId: proposal?.id };
  } catch (e: unknown) {
    console.error("submitProposalAction error", e);
    return { error: "Could not submit your proposal. Please try again." };
  }
}

/** Linker withdraws their own proposal. */
export async function withdrawProposalAction(
  prevState: ProposalState | undefined,
  formData: FormData
): Promise<ProposalState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  const proposalId = String(formData.get("id") || "");
  try {
    await updateProposalIfOwned(proposalId, user.id, { status: "WITHDRAWN" });
    revalidatePath("/dashboard/proposals");
    return { success: true };
  } catch (e: unknown) {
    console.error("withdrawProposalAction error", e);
    return { error: "Could not withdraw the proposal." };
  }
}