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
  getConnectionByProposal,
  createTransaction,
  createLedgerEntry,
  getWalletBalance,
} from "@/lib/queries";
import { doubleEntry, accounts } from "@/lib/ledger";
import { FEES, formatMYR } from "@/lib/constants";
import { notify } from "@/lib/notify";

// ── Validation ──────────────────────────────────────────────
// The agreed reward must stay at or above the platform floor so the 10%
// posting deposit always covers the RM10 listing fee (blueprint §3.9).
const MIN_REWARD = FEES.MIN_OPPORTUNITY_REWARD;

const CounterSchema = z.object({
  offeredReward: z.coerce
    .number()
    .min(MIN_REWARD, `Reward must be at least ${formatMYR(MIN_REWARD)}`)
    .max(1_000_000_000),
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

    // Tell the counterparty a counter-offer landed.
    const recipient = isLinker ? opp.seeker_id : proposal.linker_id;
    await notify({
      userId: recipient,
      type: "NEGOTIATION_COUNTER_OFFER",
      title: "New counter-offer on a proposal",
      body:
        parsed.data.message?.slice(0, 140) ||
        `A new reward of ${parsed.data.offeredReward} was proposed.`,
      data: { proposalId: proposal.id, opportunityId: opp.id },
    });

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

  // Reward floor: the agreed reward must still cover the RM10 listing fee.
  if (!Number.isFinite(agreedReward) || agreedReward < MIN_REWARD) {
    return {
      error: `The agreed reward must be at least ${formatMYR(MIN_REWARD)}.`,
    };
  }

  try {
    await updateProposal(proposal.id, {
      status: "ACCEPTED",
      agreed_reward: agreedReward,
      agreed_deliverable: agreedDeliverable || null,
      agreed_at: new Date().toISOString(),
    });

    const recipient = isLinker ? opp.seeker_id : proposal.linker_id;
    await notify({
      userId: recipient,
      type: "NEGOTIATION_TERMS_ACCEPTED",
      title: "Terms were accepted",
      body: "The agreed reward and deliverable are now locked for this proposal.",
      data: { proposalId: proposal.id, opportunityId: opp.id },
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
 *
 * Accepting a Linker requires FULL SETTLEMENT of the agreed reward: the Seeker's
 * wallet must cover it, and the reward is then deducted and held in ESCROW until
 * verified completion. (The 10% posting deposit was already paid at post time
 * and is refundable less the listing fee only until a Linker is selected, after
 * which it is consumed.)
 *
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
  if (opp.linker_id) {
    return { error: "A Linker has already been selected for this opportunity." };
  }
  if (opp.status !== "ACTIVE" && opp.status !== "PROPOSAL_RECEIVED" && opp.status !== "NEGOTIATION") {
    return { error: "This opportunity is not in a selectable state." };
  }

  const agreedReward = Number(formData.get("agreedReward") || proposal.proposed_reward);
  const agreedDeliverable = String(formData.get("agreedDeliverable") || proposal.proposed_deliverable || "");

  // Reward floor: the agreed reward must still cover the RM10 listing fee.
  if (!Number.isFinite(agreedReward) || agreedReward < MIN_REWARD) {
    return {
      error: `The agreed reward must be at least ${formatMYR(MIN_REWARD)}.`,
    };
  }

  // Full settlement: the wallet must cover the full agreed reward.
  const balance = await getWalletBalance(user.id);
  if (balance < agreedReward) {
    return {
      error: `Insufficient wallet credit. Accepting this Linker requires full settlement of the ${formatMYR(
        agreedReward
      )} reward, but your balance is ${formatMYR(
        balance
      )}. Top up your wallet and try again.`,
    };
  }

  // Idempotency / recovery: if this proposal was already selected, escrow is
  // already funded — don't charge twice. This also lets a proposal that was
  // left SELECTED without a connection (e.g. the flow was interrupted) be
  // completed by pressing Select again.
  const existingConnection = await getConnectionByProposal(proposal.id);
  if (proposal.status === "SELECTED" || existingConnection) {
    if (existingConnection) {
      revalidatePath("/opportunities/" + opp.id + "/proposals");
      revalidatePath("/dashboard/connections");
      return { success: true };
    }
    // Selected but no connection — finish the handoff without re-charging escrow.
    try {
      await createConnection({
        opportunity_id: opp.id,
        proposal_id: proposal.id,
        linker_id: proposal.linker_id,
        status: "PENDING_ACKNOWLEDGEMENT",
        agreed_reward: agreedReward,
      });
      revalidatePath("/opportunities/" + opp.id + "/proposals");
      revalidatePath("/dashboard/connections");
      return { success: true };
    } catch (e: unknown) {
      console.error("selectLinkerAction: connection recovery failed", e);
      return { error: "Could not open the connection. Please try again." };
    }
  }

  try {
    // 1) Commit the opportunity FIRST. If anything below fails, the listing is
    //    already LINKER_SELECTED and therefore refuses new proposals — the
    //    failure mode is "escrow not yet funded", never "still accepting
    //    applications after a Linker was chosen".
    await updateOpportunityIfOwned(opp.id, user.id, {
      status: "LINKER_SELECTED",
      linker_id: proposal.linker_id,
    });

    // 2) Full reward → escrow (OPPORTUNITY_FUNDING).
    const fundTx = await createTransaction({
      user_id: user.id,
      opportunity_id: opp.id,
      type: "OPPORTUNITY_FUNDING",
      status: "COMPLETED",
      amount: agreedReward,
      currency: "MYR",
      description: `Reward escrow for "${opp.title}"`,
      reference: `OPP-FUND-${opp.id.slice(0, 8)}-${Date.now()}`,
    });
    for (const e of doubleEntry(
      accounts.wallet(user.id),
      accounts.escrow(opp.id),
      agreedReward
    )) {
      await createLedgerEntry({ transaction_id: fundTx.id, ...e });
    }

    // 3) Lock terms + select the proposal.
    await updateProposal(proposal.id, {
      status: "SELECTED",
      agreed_reward: agreedReward,
      agreed_deliverable: agreedDeliverable || null,
      agreed_at: new Date().toISOString(),
    });

    // 4) Record the funded amount now that escrow holds it.
    await updateOpportunityIfOwned(opp.id, user.id, {
      funded_amount: agreedReward,
    });

    // 5) Open a connection for the workflow (appointment → evidence → completion).
    await createConnection({
      opportunity_id: opp.id,
      proposal_id: proposal.id,
      linker_id: proposal.linker_id,
      status: "PENDING_ACKNOWLEDGEMENT",
      agreed_reward: agreedReward,
    });

    // The Linker's proposal won — this is the moment they need to act on.
    await notify({
      userId: proposal.linker_id,
      type: "CONNECTION_OPENED",
      title: "You were selected for an opportunity",
      body: `"${opp.title}" — reward ${formatMYR(agreedReward)}, held in escrow. Set the task deadline to begin.`,
      data: { opportunityId: opp.id, proposalId: proposal.id },
    });

    revalidatePath("/opportunities/" + opp.id);
    revalidatePath("/opportunities/" + opp.id + "/proposals");
    revalidatePath("/dashboard/wallet");
    revalidatePath("/dashboard/connections");
    return { success: true };
  } catch (e: unknown) {
    console.error("selectLinkerAction error", e);
    return { error: "Could not select the Linker." };
  }
}