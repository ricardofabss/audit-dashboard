import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicEnv } from "@/lib/auth/env";

let adminClient: ReturnType<typeof createClient> | null = null;

export function createSupabaseAdminClient() {
  if (adminClient) return adminClient;

  const publicEnv = getSupabasePublicEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!publicEnv || !serviceRoleKey) return null;

  adminClient = createClient(publicEnv.url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}
