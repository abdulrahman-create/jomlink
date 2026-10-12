"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import {
  getConnectionById,
  getOpportunityById,
  updateConnection,
  updateOpportunityIfOwned,
  getReputationByUserId,
  upsertReputation,
  getDeadlineByConnection,
  getOpenExtensionByConnection,
  getExtensionById,
  createExtension,
  updateExtension,
} from "@/lib/queries";
import { buildReputationValues } from "@/lib/reputation";
import { clearMissedCommitmentFlag, raiseMissedCommitmentFlag } from "@/lib/flags";
import { notify, notifyUser } from "@/lib/notify";
import { FEES } from "@/lib/constants";
import { isConnectionOpen } from "@/lib/status";

export type CompletionState = {
  error?: string;
  success?: boolean;
};

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/**
 * Seeker marks a connection complete after reviewing evidence.
 * Moves connection → AWAITING_VERIFICATION then COMPLETED, opportunity → COMPLETED,
 * computes auto_release_at (completion + 7 days) for the escrow payout.
 */
export async function markConnectionCompleteAction(
  prevState: CompletionState | undefined,
  formData: FormData
): Promise<CompletionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  const connectionId = String(formData.get("connectionId") || "");
  const conn = connectionId ? await getConnectionById(connectionId) : null;
  if (!conn) return { error: "Connection not found." };

  const opp = await getOpportunityById(conn.opportunity_id);
  if (!opp) return { error: "Opportunity not found." };
  if (opp.seeker_id !== user.id) {
    return { error: "Only the Seeker can mark the connection complete." };
  }

  const completionNotes = String(formData.get("completionNotes") || "");

  try {
    const completedAt = new Date().toISOString();
    const autoReleaseAt = addDays(completedAt, FEES.RELEASE_WAIT_DAYS);

    await updateConnection(conn.id, {
      status: "COMPLETED",
      completion_notes: completionNotes || null,
      completed_at: completedAt,
      auto_release_at: autoReleaseAt,
      release_status: "PENDING_RELEASE",
    });
    await updateOpportunityIfOwned(opp.id, opp.seeker_id, { status: "COMPLETED" });

    // Update Linker reputation: increment completed/successful.
    const linkerRep = await getReputationByUserId(conn.linker_id);
    const completedCount = (linkerRep?.completed_count ?? 0) + 1;
    const successfulCount = (linkerRep?.successful_count ?? 0) + 1;

    // Commitment record (§5.6.1, §5.15): was the task delivered by the accepted
    // deadline? Delivery counts as a deadline met and clears any yellow flag.
    const deadline = await getDeadlineByConnection(conn.id);
    const onTime =
      !!deadline &&
      deadline.status === "ACCEPTED" &&
      !!deadline.accepted_date &&
      new Date(completedAt).getTime() <= new Date(deadline.accepted_date).getTime();

    await clearMissedCommitmentFlag({
      connectionId: conn.id,
      reason: "Task delivered — commitment problem resolved.",
    });

    await upsertReputation(conn.linker_id, {
      completed_count: completedCount,
      successful_count: successfulCount,
      ...buildReputationValues({
        completed_count: completedCount,
        successful_count: successfulCount,
        success_rate: linkerRep?.success_rate ?? 0,
        average_rating: linkerRep?.average_rating ?? 0,
        response_rate: linkerRep?.response_rate ?? 0,
        cancellation_count: linkerRep?.cancellation_count ?? 0,
        dispute_count: linkerRep?.dispute_count ?? 0,
        on_time_count:
          (linkerRep?.on_time_count ?? 0) + (onTime ? 1 : 0),
        deadlines_met: (linkerRep?.deadlines_met ?? 0) + (onTime ? 1 : 0),
        deadlines_missed:
          (linkerRep?.deadlines_missed ?? 0) + (deadline && !onTime ? 1 : 0),
      }),
    });

    // The Linker is waiting on this decision, and the payout clock has started.
    await notify({
      userId: conn.linker_id,
      type: "CONNECTION_COMPLETED",
      title: "The Seeker marked your connection complete",
      body: `Reward release is scheduled for ${new Date(autoReleaseAt).toDateString()} unless a dispute is raised.`,
      data: { connectionId: conn.id, opportunityId: opp.id },
    });

    revalidatePath("/dashboard/connections/" + conn.id);
    revalidatePath("/opportunities/" + opp.id);
    return { success: true };
  } catch (e: unknown) {
    console.error("markConnectionCompleteAction error", e);
    return { error: "Could not mark the connection complete." };
  }
}
/**
 * Linker REQUESTS an extension (blueprint §5.14).
 *
 * This creates a REQUESTED record only. It deliberately does **not** move the
 * deadline and does **not** clear the yellow flag — the Seeker decides, via
 * `acceptExtensionAction` / `rejectExtensionAction`.
 *
 * The previous implementation applied the extension immediately and cleared the
 * Linker's own flag, which let the party the mechanism is meant to hold
 * accountable decide whether to hold them accountable: a Linker could postpone
 * their own escrow release and erase their own missed-commitment signal.
 */
export async function requestExtensionAction(
  prevState: CompletionState | undefined,
  formData: FormData
): Promise<CompletionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  const connectionId = String(formData.get("connectionId") || "");
  const days = Math.max(1, Math.min(30, Number(formData.get("days") || 3)));
  const reason = String(formData.get("reason") || "").trim() || null;

  const conn = connectionId ? await getConnectionById(connectionId) : null;
  if (!conn) return { error: "Connection not found." };
  if (conn.linker_id !== user.id) {
    return { error: "Only the Linker can request an extension." };
  }
  // An extension moves the escrow release date, so it is only meaningful while
  // the task is still open.
  if (!isConnectionOpen(conn.status)) {
    return { error: "This connection is closed — an extension cannot be requested." };
  }

  try {
    // One live request at a time. The database enforces this too (partial unique
    // index), but checking here turns a constraint violation into a clear message.
    const open = await getOpenExtensionByConnection(conn.id);
    if (open) {
      return { error: "An extension request is already awaiting the Seeker's decision." };
    }

    const base = conn.auto_release_at ?? new Date().toISOString();
    const requestedDeadline = addDays(base, days);

    await createExtension({
      connection_id: conn.id,
      requested_by_id: user.id,
      previous_deadline: conn.auto_release_at ?? null,
      requested_deadline: requestedDeadline,
      days_requested: days,
      reason,
      status: "REQUESTED",
    });

    const opp = await getOpportunityById(conn.opportunity_id);
    await notifyUser(opp?.seeker_id, conn.id, {
      type: "CONNECTION_EXTENSION_REQUESTED",
      title: "The Linker requested an extension",
      body: `Requested ${days} more day(s). Review and accept or reject it.`,
      data: { connectionId: conn.id, days },
    });

    revalidatePath("/dashboard/connections/" + conn.id);
    return { success: true };
  } catch (e: unknown) {
    console.error("requestExtensionAction error", e);
    return { error: "Could not request an extension." };
  }
}

/**
 * Seeker accepts a pending extension (blueprint §5.14).
 *
 * Only now does the deadline actually move, and only now is the yellow flag
 * cleared — "If accepted, the new deadline becomes the official Opportunity
 * deadline and the yellow flag is cleared for the original deadline."
 */
export async function acceptExtensionAction(
  prevState: CompletionState | undefined,
  formData: FormData
): Promise<CompletionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  const extensionId = String(formData.get("extensionId") || "");
  const extension = extensionId ? await getExtensionById(extensionId) : null;
  if (!extension) return { error: "Extension request not found." };

  const conn = await getConnectionById(extension.connection_id);
  if (!conn) return { error: "Connection not found." };
  const opp = await getOpportunityById(conn.opportunity_id);
  if (!opp) return { error: "Opportunity not found." };

  if (opp.seeker_id !== user.id) {
    return { error: "Only the Seeker can decide on an extension." };
  }
  if (extension.status !== "REQUESTED") {
    return { error: "This extension request has already been decided." };
  }
  if (!isConnectionOpen(conn.status)) {
    return { error: "This connection is closed." };
  }

  try {
    await updateExtension(extension.id, {
      status: "ACCEPTED",
      responded_by_id: user.id,
      responded_at: new Date().toISOString(),
      rejection_reason: null,
    });

    // The requested deadline becomes the official one.
    await updateConnection(conn.id, {
      auto_release_at: extension.requested_deadline,
      release_status: "EXTENDED",
    });

    // An ACCEPTED extension is the corrective action for an at-risk deadline, so
    // it clears the flag (§5.14). This is the Seeker's decision, not the Linker's.
    await clearMissedCommitmentFlag({
      connectionId: conn.id,
      reason: "Extension accepted by the Seeker — deadline extended.",
    });

    await notifyUser(conn.linker_id, conn.id, {
      type: "CONNECTION_EXTENSION_ACCEPTED",
      title: "Your extension request was accepted",
      body: `The deadline moved by ${extension.days_requested} day(s).`,
      data: { connectionId: conn.id, days: extension.days_requested },
    });

    revalidatePath("/dashboard/connections/" + conn.id);
    return { success: true };
  } catch (e: unknown) {
    console.error("acceptExtensionAction error", e);
    return { error: "Could not accept the extension." };
  }
}

/**
 * Seeker rejects a pending extension (blueprint §5.14).
 *
 * "If rejected, the original deadline remains applicable and the yellow flag
 * remains raised if the deadline is subsequently missed." So nothing moves here
 * — the flag is deliberately left alone.
 */
export async function rejectExtensionAction(
  prevState: CompletionState | undefined,
  formData: FormData
): Promise<CompletionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  const extensionId = String(formData.get("extensionId") || "");
  const rejectionReason = String(formData.get("rejectionReason") || "").trim() || null;
  const extension = extensionId ? await getExtensionById(extensionId) : null;
  if (!extension) return { error: "Extension request not found." };

  const conn = await getConnectionById(extension.connection_id);
  if (!conn) return { error: "Connection not found." };
  const opp = await getOpportunityById(conn.opportunity_id);
  if (!opp) return { error: "Opportunity not found." };

  if (opp.seeker_id !== user.id) {
    return { error: "Only the Seeker can decide on an extension." };
  }
  if (extension.status !== "REQUESTED") {
    return { error: "This extension request has already been decided." };
  }

  try {
    await updateExtension(extension.id, {
      status: "REJECTED",
      responded_by_id: user.id,
      responded_at: new Date().toISOString(),
      rejection_reason: rejectionReason,
    });

    // The original deadline stands and the flag is NOT cleared.
    await notifyUser(conn.linker_id, conn.id, {
      type: "CONNECTION_EXTENSION_REJECTED",
      title: "Your extension request was rejected",
      body: rejectionReason ?? "The original deadline remains in force.",
      data: { connectionId: conn.id },
    });

    revalidatePath("/dashboard/connections/" + conn.id);
    return { success: true };
  } catch (e: unknown) {
    console.error("rejectExtensionAction error", e);
    return { error: "Could not reject the extension." };
  }
}

/** Mark a connection as failed (deadline missed, no valid extension). */
export async function markConnectionFailedAction(
  prevState: CompletionState | undefined,
  formData: FormData
): Promise<CompletionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  const connectionId = String(formData.get("connectionId") || "");
  const conn = connectionId ? await getConnectionById(connectionId) : null;
  if (!conn) return { error: "Connection not found." };
  const opp = await getOpportunityById(conn.opportunity_id);
  if (!opp) return { error: "Opportunity not found." };
  if (opp.seeker_id !== user.id) {
    return { error: "Only the Seeker can mark the connection failed." };
  }

  try {
    await updateConnection(conn.id, { status: "FAILED", release_status: "VOID" });
    await updateOpportunityIfOwned(opp.id, opp.seeker_id, { status: "FAILED" });

    // Raise the yellow flag: the Linker set a deadline and did not deliver by it
    // with no accepted extension (§5.6.1, §5.13). The flag does NOT release the
    // reward itself — the failure of the Opportunity does that.
    await raiseMissedCommitmentFlag({
      connectionId: conn.id,
      reason:
        "Linker did not deliver the agreed task by the deadline they proposed (Opportunity marked failed).",
    });

    // Decrement/flag Linker reputation as a cancellation.
    const linkerRep = await getReputationByUserId(conn.linker_id);
    const cancellationCount = (linkerRep?.cancellation_count ?? 0) + 1;
    await upsertReputation(conn.linker_id, {
      cancellation_count: cancellationCount,
      ...buildReputationValues({
        completed_count: linkerRep?.completed_count ?? 0,
        successful_count: linkerRep?.successful_count ?? 0,
        success_rate: linkerRep?.success_rate ?? 0,
        average_rating: linkerRep?.average_rating ?? 0,
        response_rate: linkerRep?.response_rate ?? 0,
        cancellation_count: cancellationCount,
        dispute_count: linkerRep?.dispute_count ?? 0,
        on_time_count: linkerRep?.on_time_count ?? 0,
        deadlines_missed: (linkerRep?.deadlines_missed ?? 0) + 1,
        flags_raised: (linkerRep?.flags_raised ?? 0) + 1,
      }),
    });

    // Both parties need the record: the Linker is flagged, the Seeker's escrow
    // is being voided back to them.
    await notify({
      userId: conn.linker_id,
      type: "CONNECTION_FAILED",
      title: "The connection was marked failed",
      body: "The Seeker marked this connection failed. A commitment flag was recorded against your profile.",
      data: { connectionId: conn.id, opportunityId: opp.id },
    });
    await notify({
      userId: opp.seeker_id,
      type: "CONNECTION_FAILED",
      title: "You marked this connection failed",
      body: "Your escrow is being voided. Any refund will appear in your wallet.",
      data: { connectionId: conn.id, opportunityId: opp.id },
    });

    revalidatePath("/dashboard/connections/" + conn.id);
    revalidatePath("/opportunities/" + opp.id);
    return { success: true };
  } catch (e: unknown) {
    console.error("markConnectionFailedAction error", e);
    return { error: "Could not mark the connection failed." };
  }
}