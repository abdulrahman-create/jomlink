import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Admin client — SERVER ONLY.
 * Uses the service-role key. NEVER import this into a client component
 * or expose it to the browser. Used in route handlers / server actions
 * for privileged operations (user management, admin actions).
 *
 * The `jomlink` schema MUST be set here, at construction time. supabase-js
 * derives its `Accept-Profile`/`Content-Profile` headers during `createClient`;
 * calling `.schema(...)` on an already-built client returns a *new* client whose
 * REST headers are dropped, so every query silently falls back to `public` and
 * fails with PGRST205 ("Could not find the table 'public.…' in the schema
 * cache"). Do not remove this option or the whole data layer breaks.
 */
const JOMLINK_SCHEMA = "jomlink";

let serviceRoleClient: ReturnType<typeof createClient> | null = null;

export function getServiceRoleClient() {
  if (serviceRoleClient) return serviceRoleClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  serviceRoleClient = createClient(url, key, {
    db: { schema: JOMLINK_SCHEMA as never },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return serviceRoleClient;
}