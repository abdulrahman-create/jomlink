"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getServiceRoleClient } from "@/lib/supabase/admin";
import {
  createKycRecord,
  createKycBiometric,
  getKycBiometricsByUser,
  setBiometricConsent,
} from "@/lib/queries";
import { BIOMETRIC_CONSENT_VERSION } from "@/lib/constants";

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
    // review flow reads it server-side via the service-role client.
    await createKycRecord({
      user_id: user.id,
      status: "PENDING",
      document_type: parsed.data.documentType,
      document_ref: parsed.data.documentRef || null,
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
 *  • `wipeBiometricDataAction` lets the member delete everything on request.
 */
export async function submitKycBiometricAction(
  prevState: KycState | undefined,
  formData: FormData
): Promise<KycState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  // Explicit consent is mandatory.
  const consent = formData.get("consent");
  if (consent !== "on" && consent !== "true") {
    return {
      error:
        "Consent is required. Please tick the consent box to store your face and ID images for identity verification and model training.",
    };
  }

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

    // Record consent on the member's row (explicit + versioned).
    await setBiometricConsent(user.id, true, BIOMETRIC_CONSENT_VERSION);

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
      label_status: "UNLABELLED",
    });

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
 * (A hard delete of storage objects is performed by an admin/retention job, so
 * accidental data loss is impossible from the client side.)
 */
export async function withdrawBiometricConsentAction(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) return;

  await setBiometricConsent(user.id, false, BIOMETRIC_CONSENT_VERSION);

  const records = await getKycBiometricsByUser(user.id);
  const supabase = getServiceRoleClient();
  const now = new Date().toISOString();
  for (const r of records) {
    if (r.purge_requested_at) continue;
    await supabase
      .schema("jomlink" as never)
      .from("kyc_biometrics")
      .update({ purge_requested_at: now, updated_at: now })
      .eq("id", r.id);
  }

  revalidatePath("/dashboard/kyc");
  revalidatePath("/admin/kyc");
}

/**
 * Hard-delete the member's biometric objects + rows (right-to-erasure).
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

  await supabase
    .schema("jomlink" as never)
    .from("kyc_biometrics")
    .delete()
    .eq("user_id", user.id);

  await setBiometricConsent(user.id, false, BIOMETRIC_CONSENT_VERSION);

  revalidatePath("/dashboard/kyc");
  revalidatePath("/admin/kyc");
}