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
 * Structural type for a schema-scoped Supabase query builder.
 *
 * The chain is intentionally untyped: the `jomlink` schema is not in
 * supabase-js's generated `Database` types, so `.select()/.eq()/...` cannot be
 * type-checked and PostgREST validates the query at runtime. Casting to this
 * named type (rather than sprinkling `any` through the data layer) keeps the
 * intent in one place, and all results are cast to the `*Row` types in
 * `jomlink-types.ts` at each call site.
 */
export type UntypedSchemaClient = {
  from: (table: string) => any; // eslint-disable-line @typescript-eslint/no-explicit-any
};

/**
 * Returns a supabase-js client scoped to the `jomlink` schema (server-only).
 * The schema name is not in the generated Database types, so we cast the
 * schema-scoped client to a permissive builder type to allow `.from(...)` on
 * any table.
 */
export function jomlinkSchema() {
  return getServiceRoleClient() as unknown as UntypedSchemaClient;
}

/** Shape of a Supabase auth user's App Metadata (Supabase-managed claims). */
export type AppMetadata = { app?: string; [key: string]: unknown };

/** True if a Supabase auth user belongs to Jomlink (conflict-avoidance). */
export function isJomlinkAuthUser(user: { app_metadata?: AppMetadata }): boolean {
  return user.app_metadata?.app === JOMLINK_APP_TAG;
}