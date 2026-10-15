/**
 * Completion + escrow-release core (Phase 14, §5.7).
 *
 * A plain module (NOT `"use server"`) so it can be shared by:
 *   • `verifyCompletionAction` — the platform action that verifies evidence and
 *     releases escrow;
 *   • the automated verification sweep — which does the same thing on a timeout;
 *   • the admin manual-review release path.
 *
 * It is the ONLY place that moves a connection from VERIFIED to COMPLETED +
 * RELEASED. Keeping it here means the money path has a single implementation,
 * and "who called it" is an authorisation question, not a bookkeeping one.
 */

import {
  getConnectionById,
  getOpportunityById,
  updateConnection,
  updateOpportunityIfOwned,
  getReputationByUserId,
  upsertReputation,
  getDeadlineByConnection,
  getEvidenceByConnection,
  getProgressReportsByConnection,
} from "@/lib/queries";
import { buildReputationValues } from "@/lib/reputation";
import { clearMissedCommitmentFlag } from "@/lib/flags";
import { notify } from "@/lib/notify";
import { computeFunding } from "@/lib/funding";
import { settleRewardRelease } from "@/lib/release";
import { scoreCompletionRisk } from "@/lib/verification";
import { COMPLETION, FEES } from "@/lib/constants";
import { isVerifiable } from "@/lib/status";
import type { ConnectionRow } from "@/lib/jomlink-types";

export interface CompleteAndReleaseResult {
  ok: boolean;
  /** True when money actually moved on this call. */
  released: boolean;
  /** True when the connection was already settled (idempotent no-op). */
  skipped: boolean;
  releaseStatus: string;
  error?: string;
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

/**
 * Mark a verified connection COMPLETED and release the escrowed reward.
 *
 * Idempotent: a connection whose `release_status` is already settled
 * (RELEASED/REFUNDED/VOID) is left untouched, so overlapping sweeps and retries
 * can never double-pay.
 *
 * On release failure the completion still succeeds with
 * `release_status = PENDING_RELEASE`, so the 7-day fallback sweep recovers it —
 * a transient ledger error must not strand a legitimate payment.
 */
export async function completeAndRelease(
  conn: ConnectionRow
): Promise<CompleteAndReleaseResult> {
  const priorRelease = (conn.release_status ?? "").toUpperCase();
  if (
    priorRelease === "RELEASED" ||
    priorRelease === "REFUNDED" ||
    priorRelease === "VOID"
  ) {
    return {
      ok: true,
      released: false,
      skipped: true,
      releaseStatus: conn.release_status ?? "RELEASED",
    };
  }

  const opp = await getOpportunityById(conn.opportunity_id);
  if (!opp) {
    return {
      ok: false,
      released: false,
      skipped: false,
      releaseStatus: conn.release_status ?? "PENDING_RELEASE",
      error: "Opportunity not found.",
    };
  }

  const completedAt = new Date().toISOString();
  const autoReleaseAt = addDays(completedAt, FEES.RELEASE_WAIT_DAYS);
  const reward = Number(conn.agreed_reward ?? opp.offer_amount ?? 0);
  const funding = computeFunding(reward);

  let releaseStatus = "PENDING_RELEASE";
  let released = false;
  if (funding.reward > 0) {
    try {
      await settleRewardRelease({
        opportunityId: opp.id,
        opportunityTitle: opp.title,
        linkerId: conn.linker_id,
        reward: funding.reward,
        linkerServiceFee: funding.linkerServiceFee,
        linkerPayout: funding.linkerPayout,
      });
      releaseStatus = "RELEASED";
      released = true;
    } catch (releaseErr) {
      console.error(
        "completeAndRelease: immediate release failed; falling back to auto-release sweep",
        releaseErr
      );
      releaseStatus = "PENDING_RELEASE";
    }
  }

  await updateConnection(conn.id, {
    status: "COMPLETED",
    completed_at: completedAt,
    auto_release_at: autoReleaseAt,
    release_status: releaseStatus,
    verification_status: "PASSED",
    release_hold_until: null,
  });
  await updateOpportunityIfOwned(opp.id, opp.seeker_id, { status: "COMPLETED" });

  // Linker reputation: increment completed/successful.
  const linkerRep = await getReputationByUserId(conn.linker_id);
  const completedCount = (linkerRep?.completed_count ?? 0) + 1;
  const successfulCount = (linkerRep?.successful_count ?? 0) + 1;

  // Commitment record (§5.6.1, §5.15): was the work delivered by the accepted
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
      on_time_count: (linkerRep?.on_time_count ?? 0) + (onTime ? 1 : 0),
      deadlines_met: (linkerRep?.deadlines_met ?? 0) + (onTime ? 1 : 0),
      deadlines_missed:
        (linkerRep?.deadlines_missed ?? 0) + (deadline && !onTime ? 1 : 0),
    }),
  });

  await notify({
    userId: conn.linker_id,
    type: released ? "REWARD_RELEASED" : "CONNECTION_COMPLETED",
    title: released
      ? "Your reward has been released"
      : "Your connection was verified and completed",
    body: released
      ? `"${opp.title}" is verified and complete. The reward (net of the 10% service fee) is now in your wallet.`
      : `"${opp.title}" is verified and complete. Reward release is scheduled for ${new Date(
          autoReleaseAt
        ).toDateString()} unless a dispute is raised.`,
    data: { connectionId: conn.id, opportunityId: opp.id },
  });

  return { ok: true, released, skipped: false, releaseStatus };
}


export interface VerifyCompletionResult {
  ok: boolean;
  /** True when the completion was held for manual review (HIGH risk). */
  held?: boolean;
  /** True when money actually moved on this call. */
  released?: boolean;
  error?: string;
}

/**
 * Verify a completion and (unless HIGH risk) release the escrow (Phase 14, �5.7).
 *
 * Shared by the platform `verifyCompletionAction` and the automated sweep. Lives
 * here rather than in the `"use server"` action file so the sweep can call it
 * WITHOUT the function becoming its own publicly-callable action endpoint.
 *
 * Not authorised here � the caller must already have established that it is the
 * platform (an admin with the right permission, or the server-side sweep).
 *
 * Idempotent via `completeAndRelease`: a connection already settled is skipped.
 */
export async function verifyCompletionCore(
  connectionId: string
): Promise<VerifyCompletionResult> {
  const conn = await getConnectionById(connectionId);
  if (!conn) return { ok: false, error: "Connection not found." };
  if (!isVerifiable(conn.status)) {
    return { ok: false, error: "Connection is not awaiting verification." };
  }

  const opp = await getOpportunityById(conn.opportunity_id);
  if (!opp) return { ok: false, error: "Opportunity not found." };

  // Gather the metadata signals for the risk score.
  const [evidence, reports, deadline] = await Promise.all([
    getEvidenceByConnection(conn.id),
    getProgressReportsByConnection(conn.id),
    getDeadlineByConnection(conn.id),
  ]);

  const hasTargetAcknowledgement = (evidence as { type?: string }[]).some(
    (e) => e.type === "TARGET_ACKNOWLEDGEMENT"
  );
  const submissionIso = conn.evidence_submitted_at ?? conn.seeker_confirmed_at;
  const acceptedIso = deadline?.accepted_date ?? null;
  const hoursSinceDeadlineAccepted =
    submissionIso && acceptedIso
      ? (new Date(submissionIso).getTime() - new Date(acceptedIso).getTime()) /
        (1000 * 60 * 60)
      : Number.POSITIVE_INFINITY;

  // Meeting-type opportunities: the target acknowledgement is the strongest
  // anti-collusion signal. Everything that is not an obvious supply/delivery
  // category is treated as meeting-type for this gate.
  const isMeetingType = opp.category !== "SUPPLIER_CONNECTION";

  const [linkerRep, seekerRep] = await Promise.all([
    getReputationByUserId(conn.linker_id),
    getReputationByUserId(opp.seeker_id),
  ]);

  const risk = scoreCompletionRisk({
    connectionId: conn.id,
    evidenceCount: (evidence as unknown[]).length,
    hasTargetAcknowledgement,
    progressReportCount: (reports as unknown[]).length,
    linkerIsFirstTime: (linkerRep?.completed_count ?? 0) <= 0,
    seekerIsFirstTime: (seekerRep?.completed_count ?? 0) <= 0,
    hoursSinceDeadlineAccepted,
    isMeetingType,
    minHoursAfterDeadline: COMPLETION.MIN_HOURS_AFTER_DEADLINE,
  });

  const now = new Date().toISOString();

  if (risk.riskLevel === "HIGH") {
    const holdUntil = addDays(now, COMPLETION.HIGH_RISK_HOLD_DAYS);
    await updateConnection(conn.id, {
      status: "VERIFIED",
      verification_status: "MANUAL_REVIEW",
      verified_at: now,
      verification_notes: risk.reasons.join(" "),
      risk_score: risk.riskScore,
      risk_level: risk.riskLevel,
      release_hold_until: holdUntil,
    });

    await notify({
      userId: conn.linker_id,
      type: "CONNECTION_COMPLETED",
      title: "Your completion is under review",
      body: `"${opp.title}" passed verification but was flagged for a routine manual review. Your reward is held until ${new Date(
        holdUntil
      ).toDateString()}.`,
      data: { connectionId: conn.id, opportunityId: opp.id },
    });

    return { ok: true, held: true, released: false };
  }

  // LOW / MEDIUM -> mark verified, then complete + release.
  await updateConnection(conn.id, {
    status: "VERIFIED",
    verification_status: "PASSED",
    verified_at: now,
    verification_notes: risk.reasons.join(" "),
    risk_score: risk.riskScore,
    risk_level: risk.riskLevel,
    release_hold_until: null,
  });

  const fresh = await getConnectionById(conn.id);
  if (!fresh) return { ok: false, error: "Connection not found." };

  const release = await completeAndRelease(fresh);
  if (!release.ok) {
    return { ok: false, error: release.error ?? "Release failed." };
  }

  await notify({
    userId: opp.seeker_id,
    type: "REWARD_RELEASED",
    title: "Reward released to the Linker",
    body: `"${opp.title}" was verified and completed. The escrowed reward has been paid out.`,
    data: { connectionId: conn.id, opportunityId: opp.id },
  });

  return { ok: true, held: false, released: release.released };
}
