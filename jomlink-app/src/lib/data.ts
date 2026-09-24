import { getServiceRoleClient } from "@/lib/supabase/admin";

/**
 * JOMLINK DATA LAYER
 * Provides a service-role client scoped to the isolated `jomlink` schema.
 * Service-role bypasses RLS and can read/write any schema.
 *
 * The schema isolation (NOT `public`) keeps Jomlink data from ever
 * colliding with the user's other apps in the same Supabase project.
 */

// Auth isolation tag — every Jomlink member row + auth user is tagged with this.
export const JOMLINK_APP_TAG = "jomlink";

/**
 * Returns a supabase-js client scoped to the `jomlink` schema (server-only).
 * The schema name is not in the generated Database types, so we cast the
 * schema-scoped client to a permissive type to allow `.from(...)` on any table.
 */
export function jomlinkSchema() {
  return getServiceRoleClient().schema("jomlink" as never) as unknown as {
    from: (table: string) => any;
  };
}

/** True if a Supabase auth user belongs to Jomlink (conflict-avoidance). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isJomlinkAuthUser(user: { app_metadata?: any }): boolean {
  return user.app_metadata?.app === JOMLINK_APP_TAG;
}