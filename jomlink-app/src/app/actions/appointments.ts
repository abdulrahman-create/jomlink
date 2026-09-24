"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import {
  getConnectionById,
  getOpportunityById,
  getAppointmentById,
  createAppointment,
  updateAppointment,
  updateConnection,
} from "@/lib/queries";

const AppointmentSchema = z.object({
  date: z.coerce.date(),
  location: z.string().max(200).optional().or(z.literal("")),
  method: z.string().max(100).optional().or(z.literal("")),
  target: z.string().max(160).optional().or(z.literal("")),
  remarks: z.string().max(500).optional().or(z.literal("")),
});

export type AppointmentState = {
  error?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  success?: boolean;
};

/** Linker proposes an appointment for a connection. */
export async function proposeAppointmentAction(
  prevState: AppointmentState | undefined,
  formData: FormData
): Promise<AppointmentState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  const connectionId = String(formData.get("connectionId") || "");
  const conn = connectionId ? await getConnectionById(connectionId) : null;
  if (!conn) return { error: "Connection not found." };
  if (conn.linker_id !== user.id) {
    return { error: "Only the Linker can propose an appointment." };
  }

  const parsed = AppointmentSchema.safeParse({
    date: formData.get("date"),
    location: formData.get("location") || undefined,
    method: formData.get("method") || undefined,
    target: formData.get("target") || undefined,
    remarks: formData.get("remarks") || undefined,
  });
  if (!parsed.success) {
    return { fieldErrors: parsed.error.flatten().fieldErrors };
  }

  try {
    await createAppointment({
      connection_id: conn.id,
      date: parsed.data.date.toISOString(),
      location: parsed.data.location || null,
      method: parsed.data.method || null,
      target: parsed.data.target || null,
      remarks: parsed.data.remarks || null,
      status: "PROPOSED",
    });
    // Move connection to IN_PROGRESS if freshly linked.
    if (conn.status === "PENDING_ACKNOWLEDGEMENT") {
      await updateConnection(conn.id, { status: "IN_PROGRESS" });
    }
    revalidatePath("/dashboard/connections/" + conn.id);
    return { success: true };
  } catch (e: unknown) {
    console.error("proposeAppointmentAction error", e);
    return { error: "Could not propose the appointment." };
  }
}

/** Seeker acknowledges or rejects a proposed appointment. */
export async function acknowledgeAppointmentAction(
  prevState: AppointmentState | undefined,
  formData: FormData
): Promise<AppointmentState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Not authenticated." };

  const appointmentId = String(formData.get("appointmentId") || "");
  const decision = String(formData.get("decision") || ""); // ACKNOWLEDGED | REJECTED

  const appointment = appointmentId ? await getAppointmentById(appointmentId) : null;
  if (!appointment) return { error: "Appointment not found." };
  const conn = await getConnectionById(appointment.connection_id);
  if (!conn) return { error: "Connection not found." };
  const opp = await getOpportunityById(conn.opportunity_id);
  if (!opp) return { error: "Opportunity not found." };
  if (opp.seeker_id !== user.id) {
    return { error: "Only the Seeker can acknowledge the appointment." };
  }

  const status = decision === "REJECTED" ? "REJECTED" : "ACKNOWLEDGED";
  try {
    await updateAppointment(appointmentId, { status });
    revalidatePath("/dashboard/connections/" + conn.id);
    return { success: true };
  } catch (e: unknown) {
    console.error("acknowledgeAppointmentAction error", e);
    return { error: "Could not update the appointment." };
  }
}