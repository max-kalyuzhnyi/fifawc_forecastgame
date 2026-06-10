"use server";

import { createClient } from "@/shared/lib/supabase/server";

export interface MatchPlayerOption {
  id: string;
  name: string;
  team_id: string;
  position: "GK" | "DF" | "MF" | "FW" | null;
  shirt_number: number | null;
}

export async function loadMatchPlayers(
  homeTeamId: string | null,
  awayTeamId: string | null,
): Promise<MatchPlayerOption[]> {
  const teamIds = [homeTeamId, awayTeamId].filter(Boolean) as string[];

  if (teamIds.length === 0) {
    return [];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .select("id, name, team_id, position, shirt_number")
    .in("team_id", teamIds);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}
