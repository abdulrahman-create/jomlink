"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentAdmin } from "@/lib/rbac";
import {
  getConnectionById,
  getOpportunityById,
  updateConnection,
  updateOpportunityIfOwned,
  upsertReputation,
  getOpenExtensionByConnection,
  getExtensionById,
  createExtension,
  updateExtension,
  createDispute,
  getReputationByUserId,
} from "@/lib/queries";
import { buildReputationValues } from "@/lib/reputation";
import { clearMissedCommitmentFlag, raiseMissedCommitmentFlag } from "@/lib/flags";
import { notify, notifyUser } from "@/lib/notify";
import { isConnectionOpen, isSeekerConfirmable, isVerifiable } from "@/lib/status";
import { verifyCompletionCore } from "@/lib/completion";

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
 * Seeker CONFIRMS or REJECTS the evidence the Linker submitted (Phase 14, Â§5.7).
 *
 * The Seeker no longer pays. Confirming advances the connection to
 * `AWAITING_VERIFICATION` and hands the decision to the platform â€” **no money
 * moves here**. Rejecting (with a stated reason) opens a dispute and freezes
 * escrow; a bare rejection is not a refund, it is the start of adjudication.
 *
 * Guard: the connection must be `AWAITING_SEEKER_CONFIRMATION` (allow-list,
 * fail-closed) and the caller must be the Seeker.
 */
export async function confirmEvidenceAction(
  prevState: CompletionState | undefined,
  formData: FormData
): Promise<CompletionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  const connectionId = String(formData.get("connectionId") || "");
  const decision = String(formData.get("decision") || "CONFIRM").toUpperCase();
  const reason = String(formData.get("reason") || "").trim();

  const conn = connectionId ? await getConnectionById(connectionId) : null;
  if (!conn) return { error: "Connection not found." };

  const opp = await getOpportunityById(conn.opportunity_id);
  if (!opp) return { error: "Opportunity not found." };
  if (opp.seeker_id !== user.id) {
    return { error: "Only the Seeker can confirm the evidence." };
  }
  if (!isSeekerConfirmable(conn.status)) {
    return {
      error:
        "This connection is not awaiting your confirmation. Evidence may not have been submitted yet, or it has already advanced.",
    };
  }

  try {
    if (decision === "REJECT") {
      if (!reason) {
        return { error: "Please state a reason for rejecting the evidence." };
      }
      // Rejecting opens adjudication and freezes escrow â€” it is NOT a refund.
      await createDispute({
        opportunity_id: opp.id,
        connection_id: conn.id,
        raised_by_id: user.id,
        reason,
        description: null,
        evidence: null,
        status: "OPEN",
      });
      await updateConnection(conn.id, {
        status: "DISPUTED",
        release_status: "HELD",
        seeker_confirmation_status: "REJECTED",
        seeker_confirmed_at: new Date().toISOString(),
      });

      await notify({
        userId: conn.linker_id,
        type: "CONNECTION_DISPUTED",
        title: "The Seeker rejected the evidence",
        body: `Reason: ${reason}. A dispute is open and the escrow is frozen pending review.`,
        data: { connectionId: conn.id, opportunityId: opp.id },
      });

      revalidatePath("/dashboard/connections/" + conn.id);
      revalidatePath("/dashboard");
      return { success: true };
    }

    // Confirm â†’ hand off to the platform. NO money moves on this path.
    const now = new Date().toISOString();
    await updateConnection(conn.id, {
      status: "AWAITING_VERIFICATION",
      seeker_confirmed_at: now,
      seeker_confirmation_status: "CONFIRMED",
      verification_status: "PENDING",
    });

    // The Linker is told their evidence passed the Seeker's review; the platform
    // will now verify before any release.
    await notify({
      userId: conn.linker_id,
      type: "CONNECTION_COMPLETED",
      title: "The Seeker confirmed your evidence",
      body: `"${opp.title}" is now awaiting platform verification. Your reward is released once verification passes.`,
      data: { connectionId: conn.id, opportunityId: opp.id },
    });

    revalidatePath("/dashboard/connections/" + conn.id);
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e: unknown) {
    console.error("confirmEvidenceAction error", e);
    return { error: "Could not record your decision." };
  }
}

/**
 * Platform VERIFIES the completion and releases escrow (Phase 14, Â§5.7).
 *
 * The platform is the ONLY actor that releases escrow. This action:
 *   1. requires an admin with the review permission (or the automated sweep,
 *      which calls the same core directly);
 *   2. requires the connection to be `AWAITING_VERIFICATION` (allow-list);
 *   3. scores the completion risk;
 *   4. LOW/MEDIUM â†’ VERIFIED, complete + release the reward;
 *      HIGH â†’ hold (`release_hold_until = now + HIGH_RISK_HOLD_DAYS`, status
 *      `MANUAL_REVIEW`) and release NOTHING.
 */
export async function verifyCompletionAction(
  prevState: CompletionState | undefined,
  formData: FormData
): Promise<CompletionState> {
  const admin = await getCurrentAdmin();
  if (!admin || (!admin.can("disputes:resolve") && !admin.can("finance:payout"))) {
    return { error: "Not authorised to verify completions." };
  }

  const connectionId = String(formData.get("connectionId") || "");
  const conn = connectionId ? await getConnectionById(connectionId) : null;
  if (!conn) return { error: "Connection not found." };
  if (!isVerifiable(conn.status)) {
    return { error: "This connection is not awaiting verification." };
  }

  try {
    const result = await verifyCompletionCore(conn.id);
    if (!result.ok) return { error: result.error ?? "Verification failed." };

    revalidatePath("/dashboard/connections/" + conn.id);
    revalidatePath("/dashboard/wallet");
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e: unknown) {
    console.error("verifyCompletionAction error", e);
    return { error: "Could not verify this completion." };
  }
}
/**
 * Linker REQUESTS an extension (blueprint Â§5.14).
 *
 * This creates a REQUESTED record only. It deliberately does **not** move the
 * deadline and does **not** clear the yellow flag â€” the Seeker decides, via
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
    return { error: "This connection is closed â€” an extension cannot be requested." };
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
 * Seeker accepts a pending extension (blueprint Â§5.14).
 *
 * Only now does the deadline actually move, and only now is the yellow flag
 * cleared â€” "If accepted, the new deadline becomes the official Opportunity
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
    // it clears the flag (Â§5.14). This is the Seeker's decision, not the Linker's.
    await clearMissedCommitmentFlag({
      connectionId: conn.id,
      reason: "Extension accepted by the Seeker â€” deadline extended.",
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
 * Seeker rejects a pending extension (blueprint Â§5.14).
 *
 * "If rejected, the original deadline remains applicable and the yellow flag
 * remains raised if the deadline is subsequently missed." So nothing moves here
 * â€” the flag is deliberately left alone.
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
    // with no accepted extension (Â§5.6.1, Â§5.13). The flag does NOT release the
    // reward itself â€” the failure of the Opportunity does that.
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
