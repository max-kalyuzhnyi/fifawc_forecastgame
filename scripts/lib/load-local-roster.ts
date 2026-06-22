import { CARD_TEAMS, TEAM_RARITY_SPLIT } from "../../src/shared/lib/cards/config";
import type { CardRarity } from "../../src/shared/types/database";
import type { PoolRole } from "@/features/matches/lib/lineupRoster";
import {
  buildLocalRosterPlayer,
  CARD_COLLECTION_ROSTER_PATH,
  getTeamRoster,
  loadCardRoster,
  saveCardRoster,
  type LocalCardRoster,
  type LocalRosterPlayer,
} from "./card-collection";
import { teamSlug } from "./card-photo-local-export";

const POSITION_PRIORITY: Record<string, number> = {
  FW: 0,
  MF: 1,
  DF: 2,
  GK: 3,
};

export interface LocalCardPlayerRow {
  playerId: string;
  playerSlug: string;
  playerName: string;
  teamName: string;
  shirtNumber: number | null;
  position: string;
  poolRole: PoolRole;
  rarity?: CardRarity;
  wikiTitle: string | null;
  currentPhotoUrl: string | null;
}

export function assignRarities(playerCount: number): CardRarity[] {
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

export function sortRosterPlayers(players: LocalRosterPlayer[]): LocalRosterPlayer[] {
  return [...players].sort((left, right) => {
    const leftPos = POSITION_PRIORITY[left.position] ?? 2;
    const rightPos = POSITION_PRIORITY[right.position] ?? 2;
    if (leftPos !== rightPos) {
      return leftPos - rightPos;
    }

    const leftShirt = left.shirtNumber ?? 99;
    const rightShirt = right.shirtNumber ?? 99;
    return leftShirt - rightShirt;
  });
}

export async function loadLocalCardPlayerRows(options?: {
  teams?: string[];
  rosterPath?: string;
}): Promise<LocalCardPlayerRow[]> {
  const roster = await loadCardRoster(options?.rosterPath ?? CARD_COLLECTION_ROSTER_PATH);
  const allowedTeams = new Set(options?.teams?.length ? options.teams : [...CARD_TEAMS]);
  const rows: LocalCardPlayerRow[] = [];

  for (const teamName of CARD_TEAMS) {
    if (!allowedTeams.has(teamName)) {
      continue;
    }

    const teamRoster = getTeamRoster(roster, teamName);
    if (!teamRoster) {
      continue;
    }

    for (const player of teamRoster.players) {
      rows.push({
        playerId: player.slug,
        playerSlug: player.slug,
        playerName: player.name,
        teamName,
        shirtNumber: player.shirtNumber,
        position: player.position,
        poolRole: player.poolRole,
        rarity: player.rarity,
        wikiTitle: null,
        currentPhotoUrl: null,
      });
    }
  }

  return rows;
}

export async function loadExistingRosterOrEmpty(
  rosterPath = CARD_COLLECTION_ROSTER_PATH,
): Promise<LocalCardRoster> {
  try {
    return await loadCardRoster(rosterPath);
  } catch {
    return {
      updatedAt: new Date().toISOString(),
      teams: {},
    };
  }
}

export async function replaceTeamsInRoster(input: {
  teams: Array<{
    teamName: string;
    sourceMatch: LocalCardRoster["teams"][string]["sourceMatch"];
    players: LocalRosterPlayer[];
  }>;
  rosterPath?: string;
}): Promise<LocalCardRoster> {
  const roster = await loadExistingRosterOrEmpty(input.rosterPath);

  for (const team of input.teams) {
    roster.teams[teamSlug(team.teamName)] = {
      teamName: team.teamName,
      sourceMatch: team.sourceMatch,
      players: team.players,
    };
  }

  roster.updatedAt = new Date().toISOString();
  await saveCardRoster(roster, input.rosterPath);
  return roster;
}

export { buildLocalRosterPlayer };
