import {
  createNotification,
  getConnectionById,
  getOpportunityById,
} from "@/lib/queries";
import type { NotificationRow } from "@/lib/jomlink-types";

/**
 * Notification fan-out for connection activity.
 *
 * Jomlink's central rule: both parties to a connection — the Seeker who posted
 * the opportunity and the Linker who is delivering it — must be told about every
 * material event on that connection, whether it originates from the counterparty
 * or from an administrator. Neither side should have to poll a page to discover
 * that something moved.
 *
 * These helpers are deliberately best-effort: a notification failure must never
 * roll back the business action that triggered it. Every call is wrapped in
 * try/catch and logs rather than throws, matching the existing inline pattern in
 * `deadlines.ts` / `progress-reports.ts`.
 *
 * `type` is free-form text in the schema (no enum), so new event types need no
 * migration — but keep the prefix conventional (CONNECTION_*, DISPUTE_*,
 * ADMIN_*) so the notifications page can pick the right icon.
 */

export type NotifyInput = {
  userId: string;
  type: string;
  title: string;
  body?: string | null;
  data?: Record<string, unknown>;
};

/** Send one notification. Never throws. */
export async function notify(input: NotifyInput): Promise<void> {
  try {
    await createNotification({
      user_id: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      channel: "IN_APP",
      data: input.data ?? null,
    });
  } catch (e) {
    console.error("notify failed", input.type, e);
  }
}

/** Send the same notification to several users, de-duplicated and self-excluded. */
export async function notifyMany(
  userIds: (string | null | undefined)[],
  input: Omit<NotifyInput, "userId">
): Promise<void> {
  const unique = [...new Set(userIds.filter((id): id is string => !!id))];
  await Promise.all(unique.map((userId) => notify({ ...input, userId })));
}

type ConnectionParties = {
  seekerId: string | null;
  linkerId: string | null;
};

/**
 * Resolve both parties of a connection from its id.
 * Returns nulls (rather than throwing) so callers can still notify whoever
 * exists if the opportunity row has gone missing.
 */
export async function getConnectionParties(
  connectionId: string
): Promise<ConnectionParties> {
  try {
    const conn = await getConnectionById(connectionId);
    if (!conn) return { seekerId: null, linkerId: null };
    const opp = await getOpportunityById(conn.opportunity_id);
    return { seekerId: opp?.seeker_id ?? null, linkerId: conn.linker_id ?? null };
  } catch (e) {
    console.error("getConnectionParties failed", e);
    return { seekerId: null, linkerId: null };
  }
}

/**
 * Tell BOTH parties about an event on their shared connection.
 *
 * Used for events that concern the connection as a whole — an admin ruling, a
 * dispute being opened or resolved, a completion or failure — where neither
 * party is the "author" and both need the record.
 *
 * Pass `actorId` when one party triggered the event: they are excluded so they
 * don't get notified about their own action.
 */
export async function notifyConnectionParties(
  connectionId: string,
  input: Omit<NotifyInput, "userId"> & { actorId?: string | null },
  parties?: ConnectionParties
): Promise<void> {
  const { seekerId, linkerId } = parties ?? (await getConnectionParties(connectionId));
  const recipients = [seekerId, linkerId].filter((id) => id && id !== input.actorId);
  await notifyMany(recipients, {
    type: input.type,
    title: input.title,
    body: input.body,
    data: { ...(input.data ?? {}), connectionId },
  });
}

/** Notify a single user about a connection-scoped event. */
export async function notifyUser(
  userId: string | null | undefined,
  connectionId: string | null,
  input: Omit<NotifyInput, "userId">
): Promise<void> {
  if (!userId) return;
  await notify({
    userId,
    type: input.type,
    title: input.title,
    body: input.body,
    data: { ...(input.data ?? {}), ...(connectionId ? { connectionId } : {}) },
  });
}

export type { NotificationRow };
