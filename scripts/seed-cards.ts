import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { createClient } from "@supabase/supabase-js";
import {
  CARD_TEAMS,
  PLAYERS_PER_TEAM,
  TEAM_RARITY_SPLIT,
} from "../src/shared/lib/cards/config";
import type { CardRarity } from "../src/shared/types/database";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

const POSITION_PRIORITY: Record<string, number> = {
  FW: 0,
  MF: 1,
  DF: 2,
  GK: 3,
};

function assignRarities(playerCount: number): CardRarity[] {
  const rarities: CardRarity[] = [];

  for (const [rarity, count] of Object.entries(TEAM_RARITY_SPLIT) as [
    CardRarity,
    number,
  ][]) {
    for (let index = 0; index < count; index += 1) {
      rarities.push(rarity);
    }
  }

  return rarities.slice(0, playerCount);
}

async function main(): Promise<void> {
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("id, name")
    .in("name", [...CARD_TEAMS]);

  if (teamsError) {
    throw teamsError;
  }

  const teamByName = new Map((teams ?? []).map((team) => [team.name, team.id]));
  let sortOrder = 0;
  let inserted = 0;

  for (const teamName of CARD_TEAMS) {
    const teamId = teamByName.get(teamName);
    if (!teamId) {
      console.warn(`Team not found: ${teamName}`);
      continue;
    }

    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("id, name, position, shirt_number, photo_url")
      .eq("team_id", teamId);

    if (playersError) {
      throw playersError;
    }

    const sorted = [...(players ?? [])].sort((a, b) => {
      const aHasPhoto = a.photo_url ? 0 : 1;
      const bHasPhoto = b.photo_url ? 0 : 1;
      if (aHasPhoto !== bHasPhoto) {
        return aHasPhoto - bHasPhoto;
      }

      const aPos = POSITION_PRIORITY[a.position ?? "MF"] ?? 2;
      const bPos = POSITION_PRIORITY[b.position ?? "MF"] ?? 2;
      if (aPos !== bPos) {
        return aPos - bPos;
      }

      const aShirt = a.shirt_number ?? 99;
      const bShirt = b.shirt_number ?? 99;
      return aShirt - bShirt;
    });

    const selected = sorted.slice(0, PLAYERS_PER_TEAM);
    const rarities = assignRarities(selected.length);

    for (let index = 0; index < selected.length; index += 1) {
      const player = selected[index];
      const rarity = rarities[index] ?? "common";

      const { data: existing } = await supabase
        .from("cards")
        .select("id")
        .eq("player_id", player.id)
        .maybeSingle();

      const payload = {
        player_id: player.id,
        team_id: teamId,
        is_legend: false,
        display_name: player.name,
        image_url: player.photo_url,
        rarity,
        sort_order: sortOrder,
        is_active: true,
        updated_at: new Date().toISOString(),
      };

      const { error } = existing
        ? await supabase.from("cards").update(payload).eq("id", existing.id)
        : await supabase.from("cards").insert(payload);

      if (error) {
        console.error(`Failed to upsert ${player.name}:`, error.message);
      } else {
        inserted += 1;
      }

      sortOrder += 1;
    }

    console.log(`${teamName}: ${selected.length} cards`);
  }

  console.log(`Done. Upserted ${inserted} cards.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
