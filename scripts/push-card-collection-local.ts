import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { createClient } from "@supabase/supabase-js";
import { pushCardCollectionLocal } from "./lib/push-card-collection";

async function main(): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const teamFilter = process.env.CARD_ROSTER_TEAMS
    ?.split(",")
    .map((team) => team.trim())
    .filter(Boolean);

  const result = await pushCardCollectionLocal({
    supabase,
    supabaseUrl,
    teams: teamFilter?.length ? teamFilter : undefined,
  });

  for (const log of result.logs) {
    console.log(log);
  }

  console.log("\n=== Push local card collection summary ===");
  console.log(`Uploaded/updated cards: ${result.uploadedCards}`);
  console.log(`Deactivated old cards: ${result.deactivatedCards}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
