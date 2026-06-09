import type { Match } from "@/entities/match/model/types";
import type { MatchPlayerOption } from "@/features/matches/actions";

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

    result[match.id] = matchPlayers.sort((a, b) => a.name.localeCompare(b.name));
  }

  return result;
}
