import type { SupabaseClient } from "@supabase/supabase-js";
import type { Match } from "@/entities/match/model/types";
import type { MatchPlayerOption } from "@/features/matches/actions";
import type { Database } from "@/shared/types/database";
import { sortPlayersForScorerSelect } from "@/shared/lib/sortPlayers";

const PLAYERS_SELECT = "id, name, team_id, position, shirt_number, photo_url";
// PostgREST caps each response at 1000 rows, so we page through with .range()
// to avoid silently dropping players when many teams are requested at once.
const PLAYERS_PAGE_SIZE = 1000;

export async function fetchPlayersByTeamIds(
  supabase: SupabaseClient<Database>,
  teamIds: string[],
): Promise<MatchPlayerOption[]> {
  if (teamIds.length === 0) {
    return [];
  }

  const all: MatchPlayerOption[] = [];

  for (let from = 0; ; from += PLAYERS_PAGE_SIZE) {
    const { data, error } = await supabase
      .from("players")
      .select(PLAYERS_SELECT)
      .in("team_id", teamIds)
      .order("id", { ascending: true })
      .range(from, from + PLAYERS_PAGE_SIZE - 1);

    if (error) {
      throw new Error(error.message);
    }

    if (!data || data.length === 0) {
      break;
    }

    all.push(...(data as MatchPlayerOption[]));

    if (data.length < PLAYERS_PAGE_SIZE) {
      break;
    }
  }

  return all;
}

export function getMatchTeamIds(matches: Match[]): string[] {
  return [
    ...new Set(
      matches.flatMap((match) =>
        [match.home_team_id, match.away_team_id].filter(Boolean),
      ),
    ),
  ] as string[];
}

export function buildPlayersByMatch(
  matches: Match[],
  players: MatchPlayerOption[],
): Record<string, MatchPlayerOption[]> {
  const byTeam = new Map<string, MatchPlayerOption[]>();

  for (const player of players) {
    const list = byTeam.get(player.team_id) ?? [];
    list.push(player);
    byTeam.set(player.team_id, list);
  }

  const result: Record<string, MatchPlayerOption[]> = {};

  for (const match of matches) {
    const matchPlayers: MatchPlayerOption[] = [];

    if (match.home_team_id) {
      matchPlayers.push(...(byTeam.get(match.home_team_id) ?? []));
    }
    if (match.away_team_id) {
      matchPlayers.push(...(byTeam.get(match.away_team_id) ?? []));
    }

    result[match.id] = sortPlayersForScorerSelect(matchPlayers);
  }

  return result;
}
