"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  createDeadline,
  createNotification,
  getConnectionById,
  getDeadlineByConnection,
  getOpportunityById,
  updateConnection,
  updateDeadline,
  updateOpportunityIfOwned,
  getReputationByUserId,
  upsertReputation,
} from "@/lib/queries";
import { buildReputationValues } from "@/lib/reputation";
import { clearMissedCommitmentFlag } from "@/lib/flags";
import { isConnectionOpen } from "@/lib/status";

export type DeadlineState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  success?: boolean;
};

const RequestSchema = z.object({
  proposedDate: z.coerce.date(),
  deliverable: z.string().max(500).optional().or(z.literal("")),
  note: z.string().max(1000).optional().or(z.literal("")),
});

const RejectSchema = z.object({
  rejectionReason: z.string().min(3, "Please give a reason.").max(1000),
});

/**
 * Linker requests the task deadline (blueprint §5.6.1, Step 1).
 *
 * A distinct, timestamped step — NOT part of the negotiation trail. The deadline
 * only becomes official once the Seeker accepts it. Moving the Opportunity to
 * DEADLINE_REQUESTED makes that "not yet in progress" state explicit.
 */
export async function requestDeadlineAction(
  prevState: DeadlineState | undefined,
  formData: FormData
): Promise<DeadlineState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  const connectionId = String(formData.get("connectionId") || "");
  const conn = connectionId ? await getConnectionById(connectionId) : null;
  if (!conn) return { error: "Connection not found." };
  if (conn.linker_id !== user.id) {
    return { error: "Only the Linker can request the task deadline." };
  }

  const opp = await getOpportunityById(conn.opportunity_id);
  if (!opp) return { error: "Opportunity not found." };

  if (!isConnectionOpen(conn.status)) {
    return { error: "This connection is closed." };
  }

  const parsed = RequestSchema.safeParse({
    proposedDate: formData.get("proposedDate"),
    deliverable: formData.get("deliverable") || undefined,
    note: formData.get("note") || undefined,
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  const proposedDate = parsed.data.proposedDate;
  if (proposedDate.getTime() <= Date.now()) {
    return { error: "The proposed deadline must be in the future." };
  }

  try {
    const existing = await getDeadlineByConnection(conn.id);

    if (existing) {
      // Re-requesting after a rejection reopens the terms (§5.6). A previously
      // accepted deadline is superseded rather than silently overwritten, so the
      // history of what was agreed and when is not lost.
      await updateDeadline(existing.id, {
        proposed_by_id: user.id,
        proposed_date: proposedDate.toISOString(),
        deliverable: parsed.data.deliverable || null,
        note: parsed.data.note || null,
        status: "REQUESTED",
        accepted_date: null,
        responded_at: null,
        rejection_reason: null,
      });
    } else {
      await createDeadline({
        connection_id: conn.id,
        proposed_by_id: user.id,
        proposed_date: proposedDate.toISOString(),
        deliverable: parsed.data.deliverable || null,
        note: parsed.data.note || null,
        status: "REQUESTED",
      });
    }

    // Deadline-requested is an explicit, non-working state.
    await updateConnection(conn.id, { status: "IN_PROGRESS" });
    await updateOpportunityIfOwned(opp.id, opp.seeker_id, {
      status: "DEADLINE_REQUESTED",
    });

    // Count the request against the Linker's commitment record (§5.15).
    const rep = await getReputationByUserId(conn.linker_id);
    await upsertReputation(conn.linker_id, {
      ...buildReputationValues({
        completed_count: rep?.completed_count ?? 0,
        successful_count: rep?.successful_count ?? 0,
        success_rate: rep?.success_rate ?? 0,
        average_rating: rep?.average_rating ?? 0,
        response_rate: rep?.response_rate ?? 0,
        cancellation_count: rep?.cancellation_count ?? 0,
        dispute_count: rep?.dispute_count ?? 0,
        on_time_count: rep?.on_time_count ?? 0,
      }),
      deadlines_requested: (rep?.deadlines_requested ?? 0) + 1,
    });

    try {
      await createNotification({
        user_id: opp.seeker_id,
        type: "DEADLINE_REQUESTED",
        title: "The Linker proposed a task deadline",
        body: "Review and accept the proposed deadline so the task can start.",
        channel: "IN_APP",
        data: { connectionId: conn.id, opportunityId: opp.id },
      });
    } catch (e) {
      console.error("requestDeadlineAction: notification failed", e);
    }

    revalidatePath("/dashboard/connections/" + conn.id);
    revalidatePath("/dashboard/connections/" + conn.id + "/progress");
    return { success: true };
  } catch (e: unknown) {
    console.error("requestDeadlineAction error", e);
    return { error: "Could not request the deadline." };
  }
}

/**
 * Seeker accepts the proposed deadline (blueprint §5.6.1, Step 2).
 *
 * On acceptance the deadline becomes official, the Opportunity moves to
 * IN_PROGRESS, and the progress report thread opens (§5.6.2).
 */
export async function acceptDeadlineAction(
  prevState: DeadlineState | undefined,
  formData: FormData
): Promise<DeadlineState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  const connectionId = String(formData.get("connectionId") || "");
  const conn = connectionId ? await getConnectionById(connectionId) : null;
  if (!conn) return { error: "Connection not found." };

  const opp = await getOpportunityById(conn.opportunity_id);
  if (!opp) return { error: "Opportunity not found." };
  if (opp.seeker_id !== user.id) {
    return { error: "Only the Seeker can accept the deadline." };
  }

  const deadline = await getDeadlineByConnection(conn.id);
  if (!deadline) return { error: "No deadline has been requested." };
  if (deadline.status === "ACCEPTED") {
    return { error: "The deadline is already accepted." };
  }

  try {
    const now = new Date().toISOString();
    await updateDeadline(deadline.id, {
      status: "ACCEPTED",
      accepted_date: deadline.proposed_date,
      responded_at: now,
      rejection_reason: null,
    });

    await updateConnection(conn.id, { status: "IN_PROGRESS" });
    await updateOpportunityIfOwned(opp.id, opp.seeker_id, { status: "IN_PROGRESS" });

    try {
      await createNotification({
        user_id: conn.linker_id,
        type: "DEADLINE_ACCEPTED",
        title: "Your proposed deadline was accepted",
        body: "The task is now in progress. Post progress reports until the deadline ends.",
        channel: "IN_APP",
        data: { connectionId: conn.id, opportunityId: opp.id },
      });
    } catch (e) {
      console.error("acceptDeadlineAction: notification failed", e);
    }

    revalidatePath("/dashboard/connections/" + conn.id);
    revalidatePath("/dashboard/connections/" + conn.id + "/progress");
    return { success: true };
  } catch (e: unknown) {
    console.error("acceptDeadlineAction error", e);
    return { error: "Could not accept the deadline." };
  }
}

/**
 * Seeker rejects the proposed deadline and asks for a change (blueprint §5.6.1,
 * Step 2). The terms reopen for negotiation and NO deadline is official until a
 * revised one is accepted.
 */
export async function rejectDeadlineAction(
  prevState: DeadlineState | undefined,
  formData: FormData
): Promise<DeadlineState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  const connectionId = String(formData.get("connectionId") || "");
  const conn = connectionId ? await getConnectionById(connectionId) : null;
  if (!conn) return { error: "Connection not found." };

  const opp = await getOpportunityById(conn.opportunity_id);
  if (!opp) return { error: "Opportunity not found." };
  if (opp.seeker_id !== user.id) {
    return { error: "Only the Seeker can reject the deadline." };
  }

  const deadline = await getDeadlineByConnection(conn.id);
  if (!deadline) return { error: "No deadline has been requested." };
  if (deadline.status !== "REQUESTED") {
    return { error: "Only a pending deadline request can be rejected." };
  }

  const parsed = RejectSchema.safeParse({
    rejectionReason: String(formData.get("rejectionReason") || ""),
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await updateDeadline(deadline.id, {
      status: "REJECTED",
      responded_at: new Date().toISOString(),
      rejection_reason: parsed.data.rejectionReason,
    });

    // Terms reopen for negotiation — no official deadline, no flagged state.
    await updateConnection(conn.id, { status: "IN_PROGRESS" });
    await updateOpportunityIfOwned(opp.id, opp.seeker_id, { status: "NEGOTIATION" });

    try {
      await createNotification({
        user_id: conn.linker_id,
        type: "DEADLINE_REJECTED",
        title: "Your proposed deadline was rejected",
        body: parsed.data.rejectionReason,
        channel: "IN_APP",
        data: { connectionId: conn.id, opportunityId: opp.id },
      });
    } catch (e) {
      console.error("rejectDeadlineAction: notification failed", e);
    }

    revalidatePath("/dashboard/connections/" + conn.id);
    revalidatePath("/dashboard/connections/" + conn.id + "/progress");
    return { success: true };
  } catch (e: unknown) {
    console.error("rejectDeadlineAction error", e);
    return { error: "Could not reject the deadline." };
  }
}

/**
 * Clear a yellow flag when the underlying commitment problem is resolved —
 * used by the extension-accepted path (§5.14). Kept here so the deadline module
 * owns every transition of the deadline/flag pair.
 */
export async function clearFlagAction(
  prevState: DeadlineState | undefined,
  formData: FormData
): Promise<DeadlineState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  const connectionId = String(formData.get("connectionId") || "");
  const conn = connectionId ? await getConnectionById(connectionId) : null;
  if (!conn) return { error: "Connection not found." };

  const opp = await getOpportunityById(conn.opportunity_id);
  if (!opp) return { error: "Opportunity not found." };
  if (opp.seeker_id !== user.id && conn.linker_id !== user.id) {
    return { error: "You are not part of this connection." };
  }

  try {
    await clearMissedCommitmentFlag({
      connectionId: conn.id,
      reason: "Commitment problem resolved (delivery or accepted extension).",
    });
    revalidatePath("/dashboard/connections/" + conn.id);
    revalidatePath("/dashboard/connections/" + conn.id + "/progress");
    return { success: true };
  } catch (e: unknown) {
    console.error("clearFlagAction error", e);
    return { error: "Could not clear the flag." };
  }
}
