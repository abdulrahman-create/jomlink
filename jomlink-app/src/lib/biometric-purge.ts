import { BIOMETRIC_RETENTION } from "./constants";

/**
 * Biometric retention / purge + secondary-use consent rules
 * (blueprint v1.2 §11.11, risk register `PRIV-01`).
 *
 * Kept as PURE functions in `lib/` — NOT inside a `"use server"` action file —
 * so the cron route, the member actions and the UI all read the same rule, and
 * so the rule can be unit tested without a database or storage bucket.
 *
 * Two obligations are modelled here:
 *
 * 1. **Purge is mandatory.** `purge_requested_at` rows must be *deleted*, not
 *    merely flagged. `planBiometricPurge()` decides which captures a run must
 *    delete, the storage object paths to remove, and which rows to retain (and
 *    why). It is defensive: a row is retained only when it matches none of the
 *    deletion reasons.
 *
 * 2. **Training is a separate purpose.** A capture may only be used to train a
 *    model when the member granted the *training* consent (a distinct opt-in
 *    from the identity-verification consent), that consent has not been
 *    withdrawn, and no purge has been requested.
 */

/** The subset of a `kyc_biometrics` row the purge planner needs. */
export interface PurgeCandidate {
  id: string;
  user_id: string;
  selfie_path?: string | null;
  id_document_path?: string | null;
  created_at: string;
  purge_requested_at?: string | null;
}

/** Consent state as read from the member's `users` row. */
export interface TrainingConsentState {
  /** Identity-verification consent (primary purpose). */
  biometricConsent: boolean;
  /** Model-training consent (secondary purpose, §11.11). */
  trainingConsent: boolean;
  /** Set when the member withdrew training consent — frames already collected. */
  trainingConsentWithdrawnAt?: string | null;
}

export type PurgeReason =
  /** Member explicitly asked for deletion (`purge_requested_at`). */
  | "PURGE_REQUESTED"
  /** Identity image is older than `KYC_RETENTION_DAYS`. */
  | "KYC_RETENTION_EXPIRED"
  /** Training-consented capture is older than `TRAINING_RETENTION_DAYS`. */
  | "TRAINING_RETENTION_EXPIRED";

export interface PurgeDecision {
  id: string;
  delete: boolean;
  reason?: PurgeReason;
}

export interface PurgePlan {
  /** Rows the run must delete from `kyc_biometrics`. */
  deleteIds: string[];
  /** Private-bucket object paths the run must remove. */
  deletePaths: string[];
  /** Rows kept this run, with the reason, for an auditable summary. */
  retained: { id: string; note: string }[];
  counts: {
    scanned: number;
    deleted: number;
    retained: number;
    purgeRequested: number;
    ageExpired: number;
  };
  /** True when the batch limit truncated the scan (run again for the rest). */
  truncated: boolean;
}

const DAY_MS = 24 * 60 * 60 * 1000;

function ageInDays(fromIso: string, now: Date): number | null {
  const t = Date.parse(fromIso);
  if (Number.isNaN(t)) return null;
  return (now.getTime() - t) / DAY_MS;
}

/**
 * Decide what a purge run must delete.
 *
 * Order of precedence (first match wins) — all of them DELETE:
 *   1. `PURGE_REQUESTED`   — the member asked; a withdrawn consent or erasure
 *                            request always outranks retention.
 *   2. `KYC_RETENTION_EXPIRED`      — older than the identity retention cap.
 *   3. `TRAINING_RETENTION_EXPIRED` — training capture past its retention cap.
 *
 * Fails **closed on deletion**: an unparseable `created_at` is still deleted
 * only if a purge was requested; otherwise it is retained but reported, so a
 * malformed row is never silently kept forever without visibility. Rows are
 * bounded by `PURGE_BATCH_SIZE` and the result says when it truncated.
 */
export function planBiometricPurge(
  rows: readonly PurgeCandidate[],
  now: Date = new Date(),
  options?: { batchSize?: number }
): PurgePlan {
  const batchSize = options?.batchSize ?? BIOMETRIC_RETENTION.PURGE_BATCH_SIZE;
  const limited = rows.slice(0, Math.max(0, batchSize));

  const deleteIds: string[] = [];
  const deletePaths: string[] = [];
  const retained: { id: string; note: string }[] = [];
  let purgeRequested = 0;
  let ageExpired = 0;

  for (const row of limited) {
    let reason: PurgeReason | undefined;

    if (row.purge_requested_at) {
      reason = "PURGE_REQUESTED";
    } else {
      const age = ageInDays(row.created_at, now);
      if (age === null) {
        retained.push({ id: row.id, note: "unparseable created_at — needs review" });
        continue;
      }
      if (age >= BIOMETRIC_RETENTION.KYC_RETENTION_DAYS) {
        reason = "KYC_RETENTION_EXPIRED";
      } else if (age >= BIOMETRIC_RETENTION.TRAINING_RETENTION_DAYS) {
        reason = "TRAINING_RETENTION_EXPIRED";
      }
    }

    if (!reason) {
      retained.push({ id: row.id, note: "within retention — retained" });
      continue;
    }

    deleteIds.push(row.id);
    if (reason === "PURGE_REQUESTED") purgeRequested += 1;
    else ageExpired += 1;

    for (const p of [row.selfie_path, row.id_document_path]) {
      if (p && !deletePaths.includes(p)) deletePaths.push(p);
    }
  }

  return {
    deleteIds,
    deletePaths,
    retained,
    counts: {
      scanned: limited.length,
      deleted: deleteIds.length,
      retained: retained.length,
      purgeRequested,
      ageExpired,
    },
    truncated: rows.length > limited.length,
  };
}

/**
 * May this capture be used as model-training data? (§11.11 secondary purpose)
 *
 * Requires ALL of:
 *   • the distinct **training** consent (not the KYC consent) is granted,
 *   • training consent has not been withdrawn,
 *   • no purge has been requested for the capture.
 *
 * The primary KYC consent is NOT sufficient on its own — that is exactly the
 * bundled-consent failure §11.11 prohibits.
 */
export function isEligibleForTraining(
  capture: Pick<PurgeCandidate, "purge_requested_at">,
  consent: TrainingConsentState
): boolean {
  if (capture.purge_requested_at) return false;
  if (consent.trainingConsentWithdrawnAt) return false;
  return consent.trainingConsent === true;
}

/**
 * Human-readable status of the training consent, for the member-facing panel.
 * Never implies training consent is required to be verified.
 */
export function trainingConsentStatus(
  consent: TrainingConsentState
): { label: string; tone: "active" | "withdrawn" | "not-granted" } {
  if (consent.trainingConsent && !consent.trainingConsentWithdrawnAt) {
    return { label: "Training consent given", tone: "active" };
  }
  if (consent.trainingConsentWithdrawnAt) {
    return { label: "Training consent withdrawn", tone: "withdrawn" };
  }
  return { label: "Training consent not given", tone: "not-granted" };
}
