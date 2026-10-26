import { getServiceRoleClient } from "@/lib/supabase/admin";
import {
  deleteKycBiometricsByIds,
  listBiometricCapturesForPurge,
} from "@/lib/queries";
import { planBiometricPurge } from "@/lib/biometric-purge";
import { recordAuditLog, AUDIT_ACTIONS } from "@/lib/audit";
import { BIOMETRIC_RETENTION } from "@/lib/constants";

const BIOMETRIC_BUCKET = "kyc-biometrics";

export interface BiometricPurgeResult {
  ok: boolean;
  /** Rows deleted from `kyc_biometrics`. */
  deleted: number;
  /** Private-bucket objects removed. */
  objectsDeleted: number;
  /** Captures kept this run (within retention). */
  retained: number;
  /** True when the batch cap was hit — schedule the job again. */
  truncated: boolean;
  /** Non-fatal problems, so a partial run is never reported as clean. */
  warnings: string[];
}

/**
 * Biometric retention / purge job — blueprint v1.2 §11.11 (`PRIV-01`).
 *
 * §11.11: "the retention/purge job is **mandatory** — `purge_requested_at` rows
 * must actually be deleted by a scheduled job, not merely flagged."
 *
 * Before this module a member could request deletion and *nothing ever happened*:
 * the flag sat on the row forever, the face image and ID photo stayed in the
 * private bucket, and the platform had no evidence it had ever honoured a
 * deletion request.
 *
 * Ordering is deliberate:
 *   1. Decide with the pure planner (`planBiometricPurge`) — retention, purge
 *      requests and the batch cap live in one testable rule.
 *   2. Remove the STORAGE objects first. If object removal fails we do NOT
 *      delete the row: the row is the only index of the still-existing image, so
 *      dropping it would orphan sensitive data with nothing pointing at it.
 *   3. Delete the rows.
 *   4. Write an immutable audit event — on EVERY run, including a no-op run, so
 *      the audit trail shows the schedule is actually running (§11.11).
 *
 * Idempotent: a re-run simply finds fewer (or no) rows to delete.
 */
export async function runBiometricPurge(
  now: Date = new Date()
): Promise<BiometricPurgeResult> {
  const warnings: string[] = [];
  const rows = await listBiometricCapturesForPurge(
    Math.max(BIOMETRIC_RETENTION.PURGE_BATCH_SIZE * 5, 200)
  );

  const plan = planBiometricPurge(rows, now);

  let objectsDeleted = 0;
  let deleted = 0;

  if (plan.deleteIds.length > 0) {
    const supabase = getServiceRoleClient();

    if (plan.deletePaths.length > 0) {
      const { error: removeErr } = await supabase.storage
        .from(BIOMETRIC_BUCKET)
        .remove(plan.deletePaths);
      if (removeErr) {
        // Do NOT delete rows whose images we could not remove — the row is the
        // only pointer to that sensitive object. Report and retry next run.
        warnings.push(
          `storage removal failed (${removeErr.message}); rows were retained for retry`
        );
        await recordAuditLog({
          adminId: null,
          action: AUDIT_ACTIONS.BIOMETRIC_PURGE_RUN,
          entity: "KYC_BIOMETRIC",
          entityId: null,
          details: {
            outcome: "STORAGE_FAILED",
            scanned: plan.counts.scanned,
            scheduled: plan.deleteIds.length,
            objectsScheduled: plan.deletePaths.length,
            error: removeErr.message,
          },
        });
        return {
          ok: false,
          deleted: 0,
          objectsDeleted: 0,
          retained: plan.counts.retained,
          truncated: plan.truncated,
          warnings,
        };
      }
      objectsDeleted = plan.deletePaths.length;
    }

    await deleteKycBiometricsByIds(plan.deleteIds);
    deleted = plan.deleteIds.length;
  }

  await recordAuditLog({
    adminId: null,
    action: AUDIT_ACTIONS.BIOMETRIC_PURGE_RUN,
    entity: "KYC_BIOMETRIC",
    entityId: null,
    details: {
      outcome: deleted > 0 ? "PURGED" : "NO_OP",
      scanned: plan.counts.scanned,
      deleted,
      objectsDeleted,
      retained: plan.counts.retained,
      purgeRequested: plan.counts.purgeRequested,
      ageExpired: plan.counts.ageExpired,
      truncated: plan.truncated,
      retention: {
        kycDays: BIOMETRIC_RETENTION.KYC_RETENTION_DAYS,
        trainingDays: BIOMETRIC_RETENTION.TRAINING_RETENTION_DAYS,
      },
      warnings,
    },
  });

  return {
    ok: true,
    deleted,
    objectsDeleted,
    retained: plan.counts.retained,
    truncated: plan.truncated,
    warnings,
  };
}
