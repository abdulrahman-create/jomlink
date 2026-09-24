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
} from "@/lib/queries";
import { buildReputationValues } from "@/lib/reputation";
import { FEES } from "@/lib/constants";

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
        on_time_count: linkerRep?.on_time_count ?? 0,
      }),
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
 * Linker requests an extension (extends the auto-release / deadline by days).
 * Seeker approves it (no rejection flow in this phase).
 */
export async function requestExtensionAction(
  prevState: CompletionState | undefined,
  formData: FormData
): Promise<CompletionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  const connectionId = String(formData.get("connectionId") || "");
  const days = Number(formData.get("days") || 3);
  const conn = connectionId ? await getConnectionById(connectionId) : null;
  if (!conn) return { error: "Connection not found." };
  if (conn.linker_id !== user.id) {
    return { error: "Only the Linker can request an extension." };
  }

  try {
    const base = conn.auto_release_at ?? new Date().toISOString();
    await updateConnection(conn.id, {
      auto_release_at: addDays(base, Math.max(1, Math.min(30, days))),
      release_status: "EXTENDED",
    });
    revalidatePath("/dashboard/connections/" + conn.id);
    return { success: true };
  } catch (e: unknown) {
    console.error("requestExtensionAction error", e);
    return { error: "Could not request an extension." };
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
      }),
    });

    revalidatePath("/dashboard/connections/" + conn.id);
    revalidatePath("/opportunities/" + opp.id);
    return { success: true };
  } catch (e: unknown) {
    console.error("markConnectionFailedAction error", e);
    return { error: "Could not mark the connection failed." };
  }
}