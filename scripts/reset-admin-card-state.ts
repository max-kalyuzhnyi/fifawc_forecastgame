/**
 * Reset card packs and owned cards for all admin users.
 * Run: npx tsx scripts/reset-admin-card-state.ts
 */

import { config } from "dotenv";

config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../src/shared/types/database";

function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  return createClient<Database>(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function main(): Promise<void> {
  const supabase = createAdminClient();

  const { data: admins, error: adminsError } = await supabase
    .from("admin_users")
    .select("user_id");

  if (adminsError) {
    throw new Error(adminsError.message);
  }

  const adminIds = (admins ?? []).map((row) => row.user_id);
  console.log(`Admin users: ${adminIds.length}`);

  if (adminIds.length === 0) {
    console.log("Nothing to reset.");
    return;
  }

  const [{ count: packCount }, { count: cardCount }] = await Promise.all([
    supabase
      .from("card_packs")
      .select("id", { count: "exact", head: true })
      .in("user_id", adminIds),
    supabase
      .from("user_cards")
      .select("card_id", { count: "exact", head: true })
      .in("user_id", adminIds),
  ]);

  console.log(`Before reset: ${packCount ?? 0} packs, ${cardCount ?? 0} owned card rows`);

  const { error: packsError } = await supabase
    .from("card_packs")
    .delete()
    .in("user_id", adminIds);

  if (packsError) {
    throw new Error(packsError.message);
  }

  const { error: cardsError } = await supabase
    .from("user_cards")
    .delete()
    .in("user_id", adminIds);

  if (cardsError) {
    throw new Error(cardsError.message);
  }

  console.log("Admin card collection reset complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
