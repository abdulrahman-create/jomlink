"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { getServiceRoleClient } from "@/lib/supabase/admin";
import {
  getConnectionById,
  getOpportunityById,
  createEvidence,
  updateConnection,
} from "@/lib/queries";
import { notifyUser } from "@/lib/notify";
import { isConnectionOpen } from "@/lib/status";
import { COMPLETION } from "@/lib/constants";

// ── Storage ─────────────────────────────────────────────────
// Private bucket; objects are addressed by path only (never a public URL) and
// the path is persisted on `connection_evidence.file_access_key`.
const EVIDENCE_BUCKET = "connection-evidence";
const ALLOWED_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB, must match the bucket limit.

/** Timestamped, collision-resistant path scoped to the connection. */
function evidenceObjectPath(
  connectionId: string,
  type: string,
  file: File
): string {
  const ext =
    file.type === "application/pdf"
      ? "pdf"
      : file.type === "image/png"
        ? "png"
        : file.type === "image/webp"
          ? "webp"
          : "jpg";
  const stamp = Date.now();
  const rand = Math.random().toString(36).slice(2, 8);
  return `${connectionId}/${type.toLowerCase()}-${stamp}-${rand}.${ext}`;
}

const EvidenceSchema = z.object({
  type: z.enum([
    "INTRODUCTION",
    "COMMUNICATION",
    "MEETING_PHOTO",
    "MEETING_SCREENSHOT",
    "APPOINTMENT_CONFIRMATION",
    "TARGET_ACKNOWLEDGEMENT",
    "OTHER",
  ]),
  description: z.string().max(1000).optional().or(z.literal("")),
  fileUrl: z.string().url().optional().or(z.literal("")),
});

export type EvidenceState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  success?: boolean;
};

/** Linker submits evidence of a completed introduction/meeting. */
export async function submitEvidenceAction(
  prevState: EvidenceState | undefined,
  formData: FormData
): Promise<EvidenceState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  const connectionId = String(formData.get("connectionId") || "");
  const conn = connectionId ? await getConnectionById(connectionId) : null;
  if (!conn) return { error: "Connection not found." };
  if (conn.linker_id !== user.id) {
    return { error: "Only the Linker can submit evidence." };
  }
  // A completed/failed/disputed connection is a closed record — it is the
  // evidence base for escrow release or an admin ruling, so no new evidence may
  // be added to it. Withdrawals and the dispute flow remain available.
  if (!isConnectionOpen(conn.status)) {
    return {
      error:
        "This connection is closed, so no further evidence can be submitted.",
    };
  }

  const parsed = EvidenceSchema.safeParse({
    type: formData.get("type"),
    description: formData.get("description") || undefined,
    fileUrl: formData.get("fileUrl") || undefined,
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  // Optional attachment. Absent file input still arrives as a zero-byte File,
  // so size 0 means "no file chosen" rather than an error.
  const file = formData.get("document");
  const hasFile = file instanceof File && file.size > 0;
  if (hasFile) {
    if (!ALLOWED_TYPES.has(file.type)) {
      return { error: "Only JPEG, PNG, WebP or PDF documents can be attached." };
    }
    if (file.size > MAX_SIZE) {
      return { error: "Attachment must be 10 MB or smaller." };
    }
  }

  try {
    let accessKey: string | null = null;
    if (hasFile) {
      const supabase = getServiceRoleClient();
      const path = evidenceObjectPath(conn.id, parsed.data.type, file);
      const { error: upErr } = await supabase.storage
        .from(EVIDENCE_BUCKET)
        .upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) throw upErr;
      accessKey = path;
    }

    await createEvidence({
      connection_id: conn.id,
      type: parsed.data.type,
      description: parsed.data.description || null,
      file_url: parsed.data.fileUrl || null,
      file_access_key: accessKey,
      approved: null,
    });

    // Advance the completion workflow (Phase 14, §5.7): evidence on the record
    // moves the connection to EVIDENCE_SUBMITTED, then the Seeker is asked to
    // confirm. A submitted fact is timestamped — it is the immutability anchor
    // for the platform's verification window. Money does NOT move here.
    const submittedAt = new Date().toISOString();
    await updateConnection(conn.id, {
      status: "EVIDENCE_SUBMITTED",
      evidence_submitted_at: submittedAt,
      seeker_confirmation_status: "PENDING",
    });

    // The Seeker reviews evidence before releasing escrow — they must know it
    // landed. They must also know the clock is now running: if they do nothing,
    // the window elapses and verification proceeds without them.
    const opp = await getOpportunityById(conn.opportunity_id);
    await notifyUser(opp?.seeker_id, conn.id, {
      type: "EVIDENCE_SUBMITTED",
      title: "The Linker submitted evidence",
      body: `${
        parsed.data.description?.slice(0, 120) ||
        `New ${parsed.data.type.replace(/_/g, " ").toLowerCase()} evidence is on the record.`
      } Confirm within ${COMPLETION.SEEKER_CONFIRM_WINDOW_DAYS} days or it advances to platform verification automatically.`,
      data: { connectionId: conn.id, hasAttachment: !!accessKey },
    });

    revalidatePath("/dashboard/connections/" + conn.id);
    return { success: true };
  } catch (e: unknown) {
    console.error("submitEvidenceAction error", e);
    return { error: "Could not submit evidence." };
  }
}