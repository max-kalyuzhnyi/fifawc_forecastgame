import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/shared/types/database";

// Service-role client for auth admin ops (user provisioning). Server-only.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
