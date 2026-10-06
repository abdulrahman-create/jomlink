"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

/**
 * Open a notification: mark it read, then send the member to the page it refers to.
 *
 * The row is a form submit rather than a plain link so the read state is written
 * as part of the navigation — a member who clicks a notification should never
 * return to it still flagged "New".
 *
 * The redirect target is validated to be a same-origin path. The value arrives
 * from the client, so without this check a forged form post could use the
 * notification list as an open redirect.
 */
export async function openNotificationAction(formData: FormData) {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("Authentication required");
  }

  const id = formData.get("notificationId") as string;
  const rawHref = String(formData.get("href") || "");

  if (id) {
    await markNotificationRead(id, user.id);
    revalidatePath("/dashboard/notifications");
    revalidatePath("/dashboard");
  }

  // Only allow relative, single-slash paths. "//evil.com" and "https://evil.com"
  // are both rejected.
  const safe =
    rawHref.startsWith("/") && !rawHref.startsWith("//") ? rawHref : null;

  redirect(safe ?? "/dashboard/notifications");
}
