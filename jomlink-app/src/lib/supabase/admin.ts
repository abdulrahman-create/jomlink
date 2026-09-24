import { createClient } from "@supabase/supabase-js";

/**
 * Supabase Admin client — SERVER ONLY.
 * Uses the service-role key. NEVER import this into a client component
 * or expose it to the browser. Used in route handlers / server actions
 * for privileged operations (user management, admin actions).
 */
let serviceRoleClient: ReturnType<typeof createClient> | null = null;

export function getServiceRoleClient() {
  if (serviceRoleClient) return serviceRoleClient;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  serviceRoleClient = createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
  return serviceRoleClient;
}