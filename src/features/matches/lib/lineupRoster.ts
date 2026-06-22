import type { LineupPlayer, TeamLineup } from "@/entities/match/model/types";
import { normalizeFdTeamName } from "@/entities/match/lib/footballDataTeamNames";
import { normalizePlayerName } from "@/features/matches/lib/apiFootballPhotos";

export type PlayerPosition = "GK" | "DF" | "MF" | "FW";
export type PoolRole = "starter" | "substitute" | "bench";

export const DEFAULT_ROSTER_POOL_SIZE = 15;
export const STARTING_XI_SIZE = 11;

export interface MatchWithLineup {
  id?: string;
  kickoff_at: string;
  status: string;
  home_team_name: string;
  away_team_name: string;
  home_lineup: TeamLineup | null;
  away_lineup: TeamLineup | null;
}

export interface SubstitutionEvent {
  side: "home" | "away";
  player_name: string;
}

export interface RosterLineupPlayer {
  name: string;
  shirtNumber: number | null;
  position: PlayerPosition;
}

export interface PoolRosterPlayer extends RosterLineupPlayer {
  poolRole: PoolRole;
}

export interface ResolvedTeamLineup {
  matchId: string | null;
  kickoffAt: string;
  opponent: string;
  side: "home" | "away";
  formation: string | null;
  starters: RosterLineupPlayer[];
  substituteIns: RosterLineupPlayer[];
  benchPlayers: RosterLineupPlayer[];
  poolPlayers: PoolRosterPlayer[];
}

const POSITION_MAP: Record<string, PlayerPosition> = {
  GK: "GK",
  Goalkeeper: "GK",
  DF: "DF",
  Defender: "DF",
  MF: "MF",
  Midfielder: "MF",
  FW: "FW",
  Attacker: "FW",
  Forward: "FW",
};

export function mapFdPosition(position: string | null): PlayerPosition {
  if (!position) {
    return "MF";
  }

  const normalized = position.trim();
  if (POSITION_MAP[normalized]) {
    return POSITION_MAP[normalized];
  }

  const upper = normalized.toUpperCase();
  if (upper.includes("GOAL")) return "GK";
  if (upper.startsWith("D")) return "DF";
  if (upper.startsWith("F") || upper.startsWith("A")) return "FW";
  return "MF";
}

function mapLineupPlayer(player: LineupPlayer): RosterLineupPlayer {
  return {
    name: player.name.trim(),
    shirtNumber: player.shirtNumber,
    position: mapFdPosition(player.position),
  };
}

export function mapLineupToRosterPlayers(lineup: LineupPlayer[]): RosterLineupPlayer[] {
  return lineup.slice(0, STARTING_XI_SIZE).map(mapLineupPlayer);
}

function playerKey(player: Pick<RosterLineupPlayer, "name" | "shirtNumber">): string {
  const shirt = player.shirtNumber ?? "na";
  return `${normalizePlayerName(player.name)}:${shirt}`;
}

function isDuplicate(
  player: RosterLineupPlayer,
  existing: RosterLineupPlayer[],
): boolean {
  const key = playerKey(player);
  return existing.some((entry) => playerKey(entry) === key);
}

function isNameDuplicate(
  player: Pick<RosterLineupPlayer, "name">,
  existing: RosterLineupPlayer[],
): boolean {
  const normalized = normalizePlayerName(player.name);
  return existing.some((entry) => normalizePlayerName(entry.name) === normalized);
}

export function extractSubstituteIns(
  events: SubstitutionEvent[],
  teamSide: "home" | "away",
  starters: RosterLineupPlayer[],
): RosterLineupPlayer[] {
  const substituteIns: RosterLineupPlayer[] = [];

  for (const event of events) {
    if (event.side !== teamSide) {
      continue;
    }

    const player = {
      name: event.player_name.trim(),
      shirtNumber: null,
      position: "MF" as const,
    };

    if (!player.name || isNameDuplicate(player, starters) || isNameDuplicate(player, substituteIns)) {
      continue;
    }

    substituteIns.push(player);
  }

  return substituteIns;
}

export function buildRosterPoolPlayers(input: {
  lineup: LineupPlayer[];
  bench: LineupPlayer[];
  substituteIns: RosterLineupPlayer[];
  poolSize?: number;
}): {
  starters: RosterLineupPlayer[];
  substituteIns: RosterLineupPlayer[];
  benchPlayers: RosterLineupPlayer[];
  poolPlayers: PoolRosterPlayer[];
} {
  const poolSize = input.poolSize ?? DEFAULT_ROSTER_POOL_SIZE;
  const extraSlots = Math.max(0, poolSize - STARTING_XI_SIZE);
  const starters = mapLineupToRosterPlayers(input.lineup);

  const substituteIns = input.substituteIns.filter(
    (player) => !isNameDuplicate(player, starters),
  );

  const benchPlayers: RosterLineupPlayer[] = [];
  for (const benchPlayer of input.bench.map(mapLineupPlayer)) {
    if (isNameDuplicate(benchPlayer, starters) || isNameDuplicate(benchPlayer, substituteIns)) {
      continue;
    }
    if (isDuplicate(benchPlayer, benchPlayers)) {
      continue;
    }
    benchPlayers.push(benchPlayer);
  }

  const extras: PoolRosterPlayer[] = [];

  for (const player of substituteIns) {
    if (extras.length >= extraSlots) {
      break;
    }
    extras.push({ ...player, poolRole: "substitute" });
  }

  for (const player of benchPlayers) {
    if (extras.length >= extraSlots) {
      break;
    }
    extras.push({ ...player, poolRole: "bench" });
  }

  const poolPlayers: PoolRosterPlayer[] = [
    ...starters.map((player) => ({ ...player, poolRole: "starter" as const })),
    ...extras,
  ];

  return {
    starters,
    substituteIns,
    benchPlayers,
    poolPlayers: poolPlayers.slice(0, poolSize),
  };
}

function teamSideInMatch(
  match: MatchWithLineup,
  teamName: string,
): "home" | "away" | null {
  const normalizedTeam = teamName.trim();
  const home = normalizeFdTeamName(match.home_team_name);
  const away = normalizeFdTeamName(match.away_team_name);

  if (home === normalizedTeam) return "home";
  if (away === normalizedTeam) return "away";
  return null;
}

export function findLatestLineupForTeam(
  matches: MatchWithLineup[],
  teamName: string,
  options?: {
    poolSize?: number;
    substitutionEventsByMatchId?: Map<string, SubstitutionEvent[]>;
  },
): ResolvedTeamLineup | null {
  const poolSize = options?.poolSize ?? DEFAULT_ROSTER_POOL_SIZE;

  const eligible = matches
    .filter((match) => match.status === "finished")
    .map((match) => {
      const side = teamSideInMatch(match, teamName);
      if (!side) return null;

      const teamLineup = side === "home" ? match.home_lineup : match.away_lineup;
      if (!teamLineup || teamLineup.lineup.length < STARTING_XI_SIZE) return null;

      const opponent =
        side === "home"
          ? normalizeFdTeamName(match.away_team_name)
          : normalizeFdTeamName(match.home_team_name);

      const events =
        match.id && options?.substitutionEventsByMatchId
          ? options.substitutionEventsByMatchId.get(match.id) ?? []
          : [];

      const starters = mapLineupToRosterPlayers(teamLineup.lineup);
      const substituteIns = extractSubstituteIns(events, side, starters);
      const pool = buildRosterPoolPlayers({
        lineup: teamLineup.lineup,
        bench: teamLineup.bench,
        substituteIns,
        poolSize,
      });

      return {
        matchId: match.id ?? null,
        kickoffAt: match.kickoff_at,
        opponent,
        side,
        formation: teamLineup.formation,
        starters: pool.starters,
        substituteIns: pool.substituteIns,
        benchPlayers: pool.benchPlayers,
        poolPlayers: pool.poolPlayers,
      } satisfies ResolvedTeamLineup;
    })
    .filter((entry): entry is ResolvedTeamLineup => entry !== null)
    .sort((left, right) => right.kickoffAt.localeCompare(left.kickoffAt));

  return eligible[0] ?? null;
}
