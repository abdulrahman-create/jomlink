"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getServiceRoleClient } from "@/lib/supabase/admin";
import { jomlinkSchema } from "@/lib/data";
import {
  createKycRecord,
  createKycBiometric,
  getKycBiometricsByUser,
  getTrainingConsentState,
  setBiometricConsent,
  setTrainingConsent,
  isMemberVerifiedForPayout,
  upsertProfile,
} from "@/lib/queries";
import {
  BIOMETRIC_CONSENT_VERSION,
  BIOMETRIC_TRAINING_CONSENT_VERSION,
} from "@/lib/constants";
import { kycDevBypassState } from "@/lib/kyc-dev-bypass";
import { recordAuditLog, AUDIT_ACTIONS } from "@/lib/audit";

// ── Validation ──────────────────────────────────────────────
const KYC_BUCKET = "kyc-documents";
const BIOMETRIC_BUCKET = "kyc-biometrics";
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);
const BIOMETRIC_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB, must match storage bucket limit.

const DOCUMENT_TYPES = [
  "PASSPORT",
  "NATIONAL_ID",
  "DRIVING_LICENSE",
  "OTHER",
] as const;

const KycSchema = z.object({
  documentType: z.enum(DOCUMENT_TYPES),
  documentRef: z.string().trim().max(80).optional().or(z.literal("")),
});

export type KycState = { error?: string; success?: boolean };

/**
 * DEV / TEST ONLY — mark the current member as identity-verified without
 * uploading a document or waiting for admin review.
 *
 * Use case: exercising the withdrawal → AML screen → Compliance clearance →
 * payout flows in dev or QA without hand-approving KYC for every test account.
 *
 * Guarding (all enforced here, server-side):
 *   1. **Refused in production.** Uses the same `kycDevBypassState()` helper as
 *      the payout gate, which hard-blocks when `NODE_ENV === "production"` — a
 *      stray `KYC_DEV_BYPASS=true` in a production `.env` cannot reach this.
 *   2. **Opt-in only.** Outside production it additionally requires
 *      `KYC_DEV_BYPASS=true`, so a normal dev session behaves like production.
 *   3. **Audited.** Writes `KYC_DEV_VERIFIED` with the actor, the previous
 *      verification state and the environment, so a faked badge is never silent.
 *
 * It writes the same two fields the admin review flow writes, so nothing about
 * the rest of the platform needs a special case:
 *   `member_profiles.verified_badge = true`, `verification_status = "VERIFIED"`.
 */
export async function devVerifySelfKycAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const bypass = kycDevBypassState();
  if (!bypass.enabled) {
    // Fail closed and say nothing that helps an attacker in production.
    console.error(
      `devVerifySelfKycAction refused (${bypass.reason}) for user ${user.id}`
    );
    return;
  }

  const before = await isMemberVerifiedForPayout(user.id);

  await upsertProfile(user.id, {
    verified_badge: true,
    verification_status: "VERIFIED",
  });

  await recordAuditLog({
    adminId: null,
    action: AUDIT_ACTIONS.KYC_DEV_VERIFIED,
    entity: "USER",
    entityId: user.id,
    details: {
      devBypass: true,
      previouslyVerified: before,
      email: user.email,
      nodeEnv: process.env.NODE_ENV ?? null,
    },
  });

  revalidatePath("/dashboard/kyc");
  revalidatePath("/dashboard/wallet");
  revalidatePath("/dashboard");
  revalidatePath("/admin/kyc");
}

/** Deterministic per-user path so re-submissions overwrite cleanly. */
function kycObjectPath(userId: string, file: File) {
  const ext =
    file.type === "application/pdf"
      ? "pdf"
      : file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : "jpg";
  return `${userId}.${ext}`;
}

/** Timestamped path for biometric captures — we KEEP every capture (dataset). */
function biometricObjectPath(userId: string, kind: "selfie" | "id", file: File) {
  const ext =
    file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${userId}/${kind}-${stamp}-${rand}.${ext}`;
}

/**
 * Member-facing KYC submission. Uploads an identity document to the private
 * `kyc-documents` bucket and creates a PENDING `kyc_records` row that appears
 * in the admin `/admin/kyc` review queue.
 */
export async function submitKycAction(
  prevState: KycState | undefined,
  formData: FormData
): Promise<KycState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  const parsed = KycSchema.safeParse({
    documentType: formData.get("documentType"),
    documentRef: formData.get("documentRef") || undefined,
  });
  if (!parsed.success) {
    return { error: "Please select a document type." };
  }

  const file = formData.get("document");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Please attach an identity document." };
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return { error: "Only JPEG, PNG, WebP or PDF documents are allowed." };
  }
  if (file.size > MAX_SIZE) {
    return { error: "Document must be 10 MB or smaller." };
  }

  try {
    const supabase = getServiceRoleClient();
    const path = kycObjectPath(user.id, file);
    // Upload (overwrites any prior doc for this user). service_role bypasses RLS.
    const { error: upErr } = await supabase.storage
      .from(KYC_BUCKET)
      .upload(path, file, { upsert: true, contentType: file.type });
    if (upErr) throw upErr;

    // Store the object path (not a public URL - bucket is private). The admin
    // review flow reads it server-side via the service-role client to mint a
    // short-lived signed URL. Without `document_path` the admin page has no
    // bucket key to sign and shows no "View document" link (#KYC-visibility).
    await createKycRecord({
      user_id: user.id,
      status: "PENDING",
      document_type: parsed.data.documentType,
      document_ref: parsed.data.documentRef || null,
      document_path: path,
    });

    revalidatePath("/dashboard/kyc");
    revalidatePath("/admin/kyc");
    return { success: true };
  } catch (e) {
    console.error("submitKycAction", e);
    return { error: "Could not submit your KYC document. Please try again." };
  }
}

// ── Biometric capture (face + ID) for future ML training ──────
/**
 * Submit a CONSENTED biometric capture: a live face selfie + a photo of the
 * identity document, plus capture metadata. This is a DATA-COLLECTION pipeline
 * ONLY — no automated face matching happens here. The labelled data will later
 * train an in-house face-verification model.
 *
 * Privacy:
 *  • Images go to the PRIVATE `kyc-biometrics` bucket (never public URLs).
 *  • Consent is explicit and recorded (version + timestamp) on the user row.
 *  • **Two separate consents** (§11.11): the identity-verification consent is
 *    required to store the capture at all; the model-training consent is a
 *    SEPARATE, voluntary opt-in. Refusing training does not block verification,
 *    and `kyc_biometrics.training_consent_granted` records which purpose each
 *    capture was actually collected for.
 *  • `withdrawBiometricConsentAction` flags the member's captures for purge and the
 *    scheduled purge job DELETES them (§11.11 — not just a flag).
 */
export async function submitKycBiometricAction(
  prevState: KycState | undefined,
  formData: FormData
): Promise<KycState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  // EXPLICIT KYC consent is mandatory — it is the lawful basis for holding a
  // face image and an ID photo at all.
  const consent = formData.get("consent");
  if (consent !== "on" && consent !== "true") {
    return {
      error:
        "Consent is required. Please tick the box to store your face and ID images for identity verification.",
    };
  }

  // Model training is a SEPARATE secondary purpose (§11.11). It is voluntary:
  // leaving it unticked stores the capture for verification only and excludes it
  // from any training set.
  const trainingConsent =
    formData.get("trainingConsent") === "on" ||
    formData.get("trainingConsent") === "true";
  // Whether the per-capture purpose marker can be written at all. Checked with
  // the same helper the page uses, so a missing migration degrades instead of
  // failing the member's capture (§11.11 columns).
  const trainingConsentColumnsReady = (
    await getTrainingConsentState(user.id)
  ).columnsReady;

  const selfie = formData.get("selfie");
  const idDocument = formData.get("idDocument");
  if (!(selfie instanceof File) || selfie.size === 0) {
    return { error: "Please capture a face selfie." };
  }
  if (!(idDocument instanceof File) || idDocument.size === 0) {
    return { error: "Please capture a photo of your identity document." };
  }
  for (const [label, f] of [
    ["selfie", selfie],
    ["ID document", idDocument],
  ] as const) {
    if (!BIOMETRIC_TYPES.has(f.type)) {
      return { error: `The ${label} must be a JPEG, PNG or WebP image.` };
    }
    if (f.size > MAX_SIZE) {
      return { error: `The ${label} must be 10 MB or smaller.` };
    }
  }

  // Metadata the client captured (face box + detector confidence + liveness).
  const faceWidth = Math.round(Number(formData.get("faceWidth") || 0)) || null;
  const faceHeight = Math.round(Number(formData.get("faceHeight") || 0)) || null;
  const faceConfidence = Number(formData.get("faceConfidence") || 0) || null;
  const livenessPassed = formData.get("livenessPassed") === "true";
  const captureSource = String(formData.get("captureSource") || "WEB_CAMERA");
  const captureDevice =
    String(formData.get("captureDevice") || "").slice(0, 250) || null;

  try {
    const supabase = getServiceRoleClient();

    const selfiePath = biometricObjectPath(user.id, "selfie", selfie);
    const idPath = biometricObjectPath(user.id, "id", idDocument);

    const [{ error: selfieErr }, { error: idErr }] = await Promise.all([
      supabase.storage
        .from(BIOMETRIC_BUCKET)
        .upload(selfiePath, selfie, { upsert: false, contentType: selfie.type }),
      supabase.storage
        .from(BIOMETRIC_BUCKET)
        .upload(idPath, idDocument, { upsert: false, contentType: idDocument.type }),
    ]);
    if (selfieErr) throw selfieErr;
    if (idErr) throw idErr;

    // Record consent on the member's row (explicit + versioned). The training
    // consent is stored separately and only when it was actually given, so the
    // two purposes can never be inferred from each other.
    await setBiometricConsent(user.id, true, BIOMETRIC_CONSENT_VERSION);
    // `setTrainingConsent` degrades to a no-op when the migration has not been
    // applied (42703), so the member's capture still succeeds.
    await setTrainingConsent(
      user.id,
      trainingConsent,
      BIOMETRIC_TRAINING_CONSENT_VERSION
    );

    await createKycBiometric({
      user_id: user.id,
      selfie_path: selfiePath,
      id_document_path: idPath,
      face_width: faceWidth,
      face_height: faceHeight,
      face_confidence: faceConfidence,
      capture_device: captureDevice,
      capture_source: captureSource,
      liveness_passed: livenessPassed,
      consent_version: BIOMETRIC_CONSENT_VERSION,
      // Purpose marker for this specific capture (§11.11). Omitted entirely
      // when the column does not exist yet, so the capture is still stored
      // (verification-only is the correct default anyway).
      ...(trainingConsentColumnsReady
        ? {
            training_consent_granted: trainingConsent,
            training_consent_version: trainingConsent
              ? BIOMETRIC_TRAINING_CONSENT_VERSION
              : null,
          }
        : {}),
      label_status: "UNLABELLED",
    });

    // Every granted training consent is attributable (§11.11, §11.9.2 rule 4).
    if (trainingConsent) {
      await recordAuditLog({
        adminId: null,
        action: AUDIT_ACTIONS.BIOMETRIC_TRAINING_CONSENT_GRANTED,
        entity: "USER",
        entityId: user.id,
        details: { version: BIOMETRIC_TRAINING_CONSENT_VERSION },
      });
    }

    revalidatePath("/dashboard/kyc");
    revalidatePath("/admin/kyc");
    return { success: true };
  } catch (e) {
    console.error("submitKycBiometricAction", e);
    return { error: "Could not store your biometric capture. Please try again." };
  }
}

/**
 * Withdraw biometric consent + mark all of the member's captures for purge.
 *
 * The purge is performed by the scheduled retention job
 * (`/api/admin/biometrics/purge` → `runBiometricPurge`), NOT here, so a member
 * click cannot block on storage. §11.11 requires that job to actually delete the
 * objects AND the rows — it is no longer flag-only.
 *
 * Training consent is withdrawn at the same time, because the member is asking
 * us to stop holding the images entirely.
 */
export async function withdrawBiometricConsentAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  await setBiometricConsent(user.id, false, BIOMETRIC_CONSENT_VERSION);
  await setTrainingConsent(user.id, false, BIOMETRIC_TRAINING_CONSENT_VERSION);

  const records = await getKycBiometricsByUser(user.id);
  const db = jomlinkSchema();
  const now = new Date().toISOString();
  let flagged = 0;
  for (const r of records) {
    if (r.purge_requested_at) continue;
    await db
      .from("kyc_biometrics")
      .update({ purge_requested_at: now, updated_at: now })
      .eq("id", r.id);
    flagged += 1;
  }

  await recordAuditLog({
    adminId: null,
    action: AUDIT_ACTIONS.BIOMETRIC_PURGE_REQUESTED,
    entity: "USER",
    entityId: user.id,
    details: { captures: flagged, reason: "CONSENT_WITHDRAWN" },
  });

  revalidatePath("/dashboard/kyc");
  revalidatePath("/admin/kyc");
  revalidatePath("/dashboard/wallet");
}

/**
 * Withdraw ONLY the model-training consent (§11.11 secondary purpose).
 *
 * Identity verification and the images held for it are untouched — a member can
 * opt out of their data being used to train a face-match model without losing
 * their verified badge. Their captures stop being eligible as training data
 * (`isEligibleForTraining`) and their identity images still age out under the
 * retention policy.
 */
export async function withdrawTrainingConsentAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  await setTrainingConsent(user.id, false, BIOMETRIC_TRAINING_CONSENT_VERSION);

  await recordAuditLog({
    adminId: null,
    action: AUDIT_ACTIONS.BIOMETRIC_TRAINING_CONSENT_WITHDRAWN,
    entity: "USER",
    entityId: user.id,
    details: { version: BIOMETRIC_TRAINING_CONSENT_VERSION },
  });

  revalidatePath("/dashboard/kyc");
  revalidatePath("/admin/kyc");
}

/**
 * Hard-delete the member's biometric objects + rows (right-to-erasure),
 * performed immediately rather than waiting for the scheduled purge job.
 */
export async function wipeBiometricDataAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  const records = await getKycBiometricsByUser(user.id);
  const supabase = getServiceRoleClient();

  const paths: string[] = [];
  for (const r of records) {
    if (r.selfie_path) paths.push(r.selfie_path);
    if (r.id_document_path) paths.push(r.id_document_path);
  }
  if (paths.length > 0) {
    await supabase.storage.from(BIOMETRIC_BUCKET).remove(paths);
  }

  await jomlinkSchema()
    .from("kyc_biometrics")
    .delete()
    .eq("user_id", user.id);

  await setBiometricConsent(user.id, false, BIOMETRIC_CONSENT_VERSION);
  await setTrainingConsent(user.id, false, BIOMETRIC_TRAINING_CONSENT_VERSION);

  await recordAuditLog({
    adminId: null,
    action: AUDIT_ACTIONS.BIOMETRIC_PURGE_REQUESTED,
    entity: "USER",
    entityId: user.id,
    details: { captures: records.length, immediate: true },
  });

  revalidatePath("/dashboard/kyc");
  revalidatePath("/admin/kyc");
}