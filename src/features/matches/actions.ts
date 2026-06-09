"use server";

import { createClient } from "@/shared/lib/supabase/server";

export interface MatchPlayerOption {
  id: string;
  name: string;
  team_id: string;
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
    .select("id, name, team_id")
    .in("team_id", teamIds)
    .order("name");

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}
