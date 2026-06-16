import { normalizeScorerName } from "@/entities/prediction/lib/normalizeScorerName";

export interface MatchEventScorerInput {
  matchId: string;
  type: string;
  playerName: string;
}

export interface MatchScorersData {
  namesByMatch: Record<string, string[]>;
  playerIdsByMatch: Record<string, string[]>;
}

function isGoalEvent(type: string): boolean {
  return type === "goal" || type === "penalty";
}

export function buildMatchScorers(
  events: MatchEventScorerInput[],
  players: { id: string; name: string }[] = [],
): MatchScorersData {
  const playerIdByName = new Map(
    players.map((player) => [normalizeScorerName(player.name), player.id]),
  );

  const namesByMatch: Record<string, string[]> = {};
  const playerIdsByMatch: Record<string, string[]> = {};

  for (const event of events) {
    if (!isGoalEvent(event.type)) {
      continue;
    }

    const names = namesByMatch[event.matchId] ?? [];
    names.push(event.playerName);
    namesByMatch[event.matchId] = names;

    const playerId = playerIdByName.get(normalizeScorerName(event.playerName));
    if (!playerId) {
      continue;
    }

    const ids = playerIdsByMatch[event.matchId] ?? [];
    if (!ids.includes(playerId)) {
      ids.push(playerId);
      playerIdsByMatch[event.matchId] = ids;
    }
  }

  return { namesByMatch, playerIdsByMatch };
}

export function buildScorersByMatch(
  events: MatchEventScorerInput[],
): Record<string, string[]> {
  return buildMatchScorers(events).namesByMatch;
}
