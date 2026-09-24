"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  createOpportunity,
  updateOpportunityIfOwned,
  getOpportunityById,
  createTransaction,
} from "@/lib/queries";
import { computeFunding } from "@/lib/funding";
import { OPPORTUNITY_CATEGORIES } from "@/lib/constants";

// ── Validation ──────────────────────────────────────────────
const categoryValues = OPPORTUNITY_CATEGORIES.map((c) => c.value) as [
  string,
  ...string[],
];

const OpportunitySchema = z.object({
  title: z.string().min(5, "Title is required").max(160),
  category: z.enum(categoryValues),
  targetEntity: z.string().min(2, "Target entity is required").max(160),
  targetRole: z.string().max(160).optional().or(z.literal("")),
  targetRoleExact: z.boolean().optional(),
  purpose: z.string().min(10, "Purpose is required").max(1000),
  businessDescription: z.string().max(2000).optional().or(z.literal("")),
  requiredOutcome: z.string().min(10, "Required outcome is required").max(2000),
  connectionMethod: z.string().max(500).optional().or(z.literal("")),
  acceptableAlternatives: z.string().max(500).optional().or(z.literal("")),
  geographicPreference: z.string().max(100).optional().or(z.literal("")),
  deadline: z.coerce.date().optional(),
  offerAmount: z.coerce.number().min(1, "Reward must be more than 0").max(1_000_000_000),
  confidentiality: z.enum(["PUBLIC", "MATCHED", "RESTRICTED", "PRIVATE_DIRECT"]).default("PUBLIC"),
  additionalRequirements: z.string().max(1000).optional().or(z.literal("")),
});

export type OpportunityState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  success?: boolean;
  opportunityId?: string;
};

const RESTRICTED_CATEGORY = "GOVERNMENT_PUBLIC_SECTOR";

/**
 * Create a NEW opportunity.
 * The Seekers posts a Draft. They can either leave it as DRAFT or publish it
 * immediately (DRAFT → PENDING_PAYMENT, funding computed + transaction stubbed).
 */
export async function createOpportunityAction(
  prevState: OpportunityState | undefined,
  formData: FormData
): Promise<OpportunityState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  const parsed = OpportunitySchema.safeParse({
    title: formData.get("title"),
    category: formData.get("category"),
    targetEntity: formData.get("targetEntity"),
    targetRole: formData.get("targetRole") || undefined,
    targetRoleExact: formData.get("targetRoleExact") === "on",
    purpose: formData.get("purpose"),
    businessDescription: formData.get("businessDescription") || undefined,
    requiredOutcome: formData.get("requiredOutcome"),
    connectionMethod: formData.get("connectionMethod") || undefined,
    acceptableAlternatives: formData.get("acceptableAlternatives") || undefined,
    geographicPreference: formData.get("geographicPreference") || undefined,
    deadline: formData.get("deadline") || undefined,
    offerAmount: formData.get("offerAmount"),
    confidentiality: formData.get("confidentiality") || "PUBLIC",
    additionalRequirements: formData.get("additionalRequirements") || undefined,
  });

  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const d = parsed.data;
  const isRestricted = d.category === RESTRICTED_CATEGORY;

  const values: Record<string, unknown> = {
    title: d.title,
    category: d.category,
    target_entity: d.targetEntity,
    target_role: d.targetRole || null,
    target_role_exact: d.targetRoleExact ?? true,
    purpose: d.purpose,
    business_description: d.businessDescription || null,
    required_outcome: d.requiredOutcome,
    connection_method: d.connectionMethod || null,
    acceptable_alternatives: d.acceptableAlternatives || null,
    geographic_preference: d.geographicPreference || null,
    deadline: d.deadline ? d.deadline.toISOString() : null,
    offer_amount: d.offerAmount,
    currency: "MYR",
    confidentiality: isRestricted ? "RESTRICTED" : d.confidentiality,
    additional_requirements: d.additionalRequirements || null,
    is_restricted_category: isRestricted,
    status: "DRAFT",
  };

  try {
    const opp = await createOpportunity(user.id, values);
    revalidatePath("/marketplace");
    revalidatePath("/opportunities/new");
    return { success: true, opportunityId: opp.id };
  } catch (e: unknown) {
    console.error("createOpportunityAction error", e);
    return { error: "Could not create the opportunity. Please try again." };
  }
}

/**
 * Publish an existing DRAFT opportunity.
 * Computes funding (10% activation fee + reward escrow) and records a simulated
 * ("stubbed") transaction so the amounts are visible. Status DRAFT →
 * PENDING_PAYMENT. (No real payment in Phase 3.)
 */
export async function publishOpportunityAction(
  prevState: OpportunityState | undefined,
  formData: FormData
): Promise<OpportunityState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  const oppId = String(formData.get("id") || "");
  const opp = oppId ? await getOpportunityById(oppId) : null;
  if (!opp || opp.seeker_id !== user.id) {
    return { error: "Opportunity not found or not yours." };
  }
  if (opp.status !== "DRAFT") {
    return { error: "Only draft opportunities can be published." };
  }

  const funding = computeFunding(Number(opp.offer_amount) || 0);

  // Simulated payment records (Phase 3 stubs).
  try {
    // 1) Reward held in escrow (OPPORTUNITY_FUNDING).
    await createTransaction({
      user_id: user.id,
      opportunity_id: opp.id,
      type: "OPPORTUNITY_FUNDING",
      status: "PENDING",
      amount: funding.reward,
      currency: "MYR",
      description: `Reward escrow for "${opp.title}"`,
      reference: `OPP-FUND-${opp.id.slice(0, 8)}-${Date.now()}`,
    });
    // 2) Activation fee (10%).
    await createTransaction({
      user_id: user.id,
      opportunity_id: opp.id,
      type: "ACTIVATION_FEE",
      status: "PENDING",
      amount: funding.activationFee,
      fee_raw: funding.activationFee,
      currency: "MYR",
      description: `Activation fee (${Math.round(
        (funding.activationFee / (funding.reward || 1)) * 100
      )}%) for "${opp.title}"`,
      reference: `OPP-ACT-${opp.id.slice(0, 8)}-${Date.now()}`,
    });

    await updateOpportunityIfOwned(
      opp.id,
      user.id,
      {
        status: "PENDING_PAYMENT",
        activation_fee: funding.activationFee,
        funded_amount: funding.escrowAmount,
      }
    );

    revalidatePath("/marketplace");
    revalidatePath("/opportunities/" + opp.id);
    revalidatePath("/dashboard");
    return { success: true, opportunityId: opp.id };
  } catch (e: unknown) {
    console.error("publishOpportunityAction error", e);
    return { error: "Could not publish the opportunity. Please try again." };
  }
}

/** Simulated payment confirmation: PENDING_PAYMENT → ACTIVE (Phase 3 stub). */
export async function confirmFundingAction(
  prevState: OpportunityState | undefined,
  formData: FormData
): Promise<OpportunityState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  const oppId = String(formData.get("id") || "");
  const opp = oppId ? await getOpportunityById(oppId) : null;
  if (!opp || opp.seeker_id !== user.id) {
    return { error: "Opportunity not found or not yours." };
  }
  if (opp.status !== "PENDING_PAYMENT") {
    return { error: "This opportunity is not awaiting funding." };
  }

  try {
    await updateOpportunityIfOwned(opp.id, user.id, { status: "ACTIVE" });
    revalidatePath("/marketplace");
    revalidatePath("/opportunities/" + opp.id);
    return { success: true, opportunityId: opp.id };
  } catch (e: unknown) {
    console.error("confirmFundingAction error", e);
    return { error: "Could not activate the opportunity." };
  }
}

/** Navigate to the created opportunity's detail page. */
export async function goToOpportunity(state: OpportunityState) {
  if (state.opportunityId) redirect(`/opportunities/${state.opportunityId}`);
}