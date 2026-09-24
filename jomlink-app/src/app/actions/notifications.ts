"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import {
  markNotificationRead,
  markAllNotificationsRead,
} from "@/lib/queries";

export async function markNotificationReadAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Authentication required");
  }

  const id = formData.get("notificationId") as string;
  if (!id) {
    throw new Error("Notification ID is required");
  }

  await markNotificationRead(id, user.id);

  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard");
}

export async function markAllNotificationsReadAction() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Authentication required");
  }

  await markAllNotificationsRead(user.id);

  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard");
}
