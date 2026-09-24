"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  getProposalById,
  getOpportunityById,
  createNegotiation,
  updateProposal,
  updateOpportunityIfOwned,
  createConnection,
} from "@/lib/queries";

// ── Validation ──────────────────────────────────────────────
const CounterSchema = z.object({
  offeredReward: z.coerce.number().min(1).max(1_000_000_000),
  message: z.string().max(1000).optional().or(z.literal("")),
});

export type NegotiationState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  success?: boolean;
};

/**
 * Post a counter-offer on a proposal's reward/terms.
 * Both the Linker (owner) and the Seeker (opportunity owner) may counter.
 */
export async function counterOfferAction(
  prevState: NegotiationState | undefined,
  formData: FormData
): Promise<NegotiationState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  const proposalId = String(formData.get("proposalId") || "");
  const proposal = proposalId ? await getProposalById(proposalId) : null;
  if (!proposal) return { error: "Proposal not found." };

  const opp = await getOpportunityById(proposal.opportunity_id);
  if (!opp) return { error: "Opportunity not found." };

  const isLinker = proposal.linker_id === user.id;
  const isSeeker = opp.seeker_id === user.id;
  if (!isLinker && !isSeeker) {
    return { error: "You are not part of this proposal." };
  }

  // Only allow negotiation while the proposal is still open.
  if (["SELECTED", "COMPLETED", "REJECTED", "WITHDRAWN"].includes(proposal.status)) {
    return { error: "This proposal is no longer open for negotiation." };
  }

  const parsed = CounterSchema.safeParse({
    offeredReward: formData.get("offeredReward"),
    message: formData.get("message") || undefined,
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await createNegotiation({
      proposal_id: proposal.id,
      from_role: isLinker ? "LINKER" : "SEEKER",
      offered_reward: parsed.data.offeredReward,
      message: parsed.data.message || null,
      status: "COUNTER",
    });
    // Move proposal to UNDER_REVIEW so both sides know it's being negotiated.
    if (proposal.status === "SUBMITTED") {
      await updateProposal(proposal.id, { status: "UNDER_REVIEW" });
    }
    revalidatePath("/opportunities/" + opp.id + "/proposals");
    revalidatePath("/dashboard/proposals");
    return { success: true };
  } catch (e: unknown) {
    console.error("counterOfferAction error", e);
    return { error: "Could not post the counter-offer." };
  }
}

/**
 * Accept the current agreed terms (mutual acceptance → terms locked).
 * The Linker accepts the Seeker's latest offer, or vice-versa.
 */
export async function acceptTermsAction(
  prevState: NegotiationState | undefined,
  formData: FormData
): Promise<NegotiationState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  const proposalId = String(formData.get("proposalId") || "");
  const proposal = proposalId ? await getProposalById(proposalId) : null;
  if (!proposal) return { error: "Proposal not found." };

  const opp = await getOpportunityById(proposal.opportunity_id);
  if (!opp) return { error: "Opportunity not found." };

  const isLinker = proposal.linker_id === user.id;
  const isSeeker = opp.seeker_id === user.id;
  if (!isLinker && !isSeeker) {
    return { error: "You are not part of this proposal." };
  }

  const agreedReward = Number(formData.get("agreedReward") || proposal.proposed_reward);
  const agreedDeliverable = String(formData.get("agreedDeliverable") || proposal.proposed_deliverable || "");

  try {
    await updateProposal(proposal.id, {
      status: "ACCEPTED",
      agreed_reward: agreedReward,
      agreed_deliverable: agreedDeliverable || null,
      agreed_at: new Date().toISOString(),
    });
    revalidatePath("/opportunities/" + opp.id + "/proposals");
    revalidatePath("/dashboard/proposals");
    return { success: true };
  } catch (e: unknown) {
    console.error("acceptTermsAction error", e);
    return { error: "Could not accept the terms." };
  }
}

/**
 * Seeker selects a Linker's proposal → opportunity becomes LINKER_SELECTED.
 * Terms are locked (agreed_reward/deliverable) and the proposal is SELECTED.
 */
export async function selectLinkerAction(
  prevState: NegotiationState | undefined,
  formData: FormData
): Promise<NegotiationState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  const proposalId = String(formData.get("proposalId") || "");
  const proposal = proposalId ? await getProposalById(proposalId) : null;
  if (!proposal) return { error: "Proposal not found." };

  const opp = await getOpportunityById(proposal.opportunity_id);
  if (!opp) return { error: "Opportunity not found." };
  if (opp.seeker_id !== user.id) {
    return { error: "Only the Seeker can select a Linker." };
  }
  if (opp.status !== "ACTIVE" && opp.status !== "PROPOSAL_RECEIVED" && opp.status !== "NEGOTIATION") {
    return { error: "This opportunity is not in a selectable state." };
  }

  const agreedReward = Number(formData.get("agreedReward") || proposal.proposed_reward);
  const agreedDeliverable = String(formData.get("agreedDeliverable") || proposal.proposed_deliverable || "");

  try {
    await updateProposal(proposal.id, {
      status: "SELECTED",
      agreed_reward: agreedReward,
      agreed_deliverable: agreedDeliverable || null,
      agreed_at: new Date().toISOString(),
    });
    await updateOpportunityIfOwned(opp.id, user.id, { status: "LINKER_SELECTED" });
    // Open a connection for the workflow (appointment → evidence → completion).
    await createConnection({
      opportunity_id: opp.id,
      proposal_id: proposal.id,
      linker_id: proposal.linker_id,
      status: "PENDING_ACKNOWLEDGEMENT",
      agreed_reward: agreedReward,
    });
    revalidatePath("/opportunities/" + opp.id);
    revalidatePath("/opportunities/" + opp.id + "/proposals");
    return { success: true };
  } catch (e: unknown) {
    console.error("selectLinkerAction error", e);
    return { error: "Could not select the Linker." };
  }
}