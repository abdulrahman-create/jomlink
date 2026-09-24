"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  getConnectionById,
  createEvidence,
} from "@/lib/queries";

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

  const parsed = EvidenceSchema.safeParse({
    type: formData.get("type"),
    description: formData.get("description") || undefined,
    fileUrl: formData.get("fileUrl") || undefined,
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await createEvidence({
      connection_id: conn.id,
      type: parsed.data.type,
      description: parsed.data.description || null,
      file_url: parsed.data.fileUrl || null,
      approved: null,
    });
    revalidatePath("/dashboard/connections/" + conn.id);
    return { success: true };
  } catch (e: unknown) {
    console.error("submitEvidenceAction error", e);
    return { error: "Could not submit evidence." };
  }
}