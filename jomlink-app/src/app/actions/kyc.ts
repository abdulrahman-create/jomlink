"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getServiceRoleClient } from "@/lib/supabase/admin";
import { createKycRecord } from "@/lib/queries";

// ── Validation ──────────────────────────────────────────────
const KYC_BUCKET = "kyc-documents";
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);
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