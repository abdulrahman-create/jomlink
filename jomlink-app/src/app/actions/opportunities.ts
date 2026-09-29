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
  createLedgerEntry,
  getWalletBalance,
} from "@/lib/queries";
import { postingDepositFor } from "@/lib/funding";
import { doubleEntry, accounts } from "@/lib/ledger";
import { OPPORTUNITY_CATEGORIES, FEES, formatMYR } from "@/lib/constants";

// ── Validation ──────────────────────────────────────────────
const categoryValues = OPPORTUNITY_CATEGORIES.map((c) => c.value) as [
  string,
  ...string[],
];

// The 10% posting deposit must cover the flat RM10 listing fee, so the reward
// has a floor (RM100 by default). See blueprint §3.9.
const MIN_REWARD = FEES.MIN_OPPORTUNITY_REWARD;

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
  offerAmount: z.coerce
    .number()
    .min(
      MIN_REWARD,
      `Reward must be at least ${formatMYR(
        MIN_REWARD
      )} so the 10% posting deposit covers the ${formatMYR(
        FEES.LISTING_FEE
      )} listing fee`
    )
    .max(1_000_000_000),
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
 * The Seeker posts a Draft. They can either leave it as DRAFT or publish it
 * immediately (DRAFT → ACTIVE, 10% posting deposit deducted from the wallet).
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
 *
 * Posting requires a REFUNDABLE 10% posting deposit (of the reward), which is
 * auto-deducted from the Seeker's wallet. Posting is blocked when the wallet
 * cannot cover the deposit. The reward itself is NOT charged here — it is only
 * settled later, when the Seeker accepts a Linker's submission.
 *
 * If the Seeker cancels BEFORE any Linker is selected, the deposit is refunded
 * less the flat non-refundable listing fee (RM10). Once a Linker is selected the
 * deposit is consumed.
 *
 * Status: DRAFT → ACTIVE (the opportunity goes live immediately).
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

  const deposit = postingDepositFor(Number(opp.offer_amount) || 0);

  // Posting is blocked unless the wallet can cover the 10% deposit.
  const balance = await getWalletBalance(user.id);
  if (balance < deposit) {
    return {
      error: `Insufficient wallet credit. Posting requires a ${formatMYR(
        deposit
      )} deposit (10% of the reward), but your balance is ${formatMYR(
        balance
      )}. Top up your wallet and try again.`,
    };
  }

  try {
    // 1) Posting deposit → platform (POSTING_DEPOSIT). Refundable less the
    //    listing fee if the Seeker cancels before selecting a Linker.
    const depositTx = await createTransaction({
      user_id: user.id,
      opportunity_id: opp.id,
      type: "POSTING_DEPOSIT",
      status: "COMPLETED",
      amount: deposit,
      fee_raw: deposit,
      currency: "MYR",
      description: `Posting deposit (10%) for "${opp.title}"`,
      reference: `OPP-DEP-${opp.id.slice(0, 8)}-${Date.now()}`,
    });
    for (const e of doubleEntry(
      accounts.wallet(user.id),
      accounts.platformActivation,
      deposit
    )) {
      await createLedgerEntry({ transaction_id: depositTx.id, ...e });
    }

    // 2) Opportunity goes live. Reward is NOT funded yet (funded_amount = 0).
    await updateOpportunityIfOwned(opp.id, user.id, {
      status: "ACTIVE",
      activation_fee: deposit,
      funded_amount: 0,
    });

    revalidatePath("/marketplace");
    revalidatePath("/opportunities/" + opp.id);
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/wallet");
    return { success: true, opportunityId: opp.id };
  } catch (e: unknown) {
    console.error("publishOpportunityAction error", e);
    return { error: "Could not publish the opportunity. Please try again." };
  }
}

/** Navigate to the created opportunity's detail page. */
export async function goToOpportunity(state: OpportunityState) {
  if (state.opportunityId) redirect(`/opportunities/${state.opportunityId}`);
}