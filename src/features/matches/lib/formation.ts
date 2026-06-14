import type {
  LineupPlayer,
  MatchEvent,
  MatchEventSide,
} from "@/entities/match/model/types";

export interface FormationSlot {
  player: LineupPlayer;
  x: number;
  y: number;
  isGK: boolean;
}

export interface PlayerBadge {
  goals: number;
  yellow: boolean;
  red: boolean;
}

const HORIZONTAL_PADDING = 0.1;
const VERTICAL_PADDING = 0.08;

export function parseFormation(
  formation: string | null,
  lineup: LineupPlayer[],
): FormationSlot[] | null {
  if (!formation || lineup.length === 0) return null;

  const parts = formation
    .split("-")
    .map((part) => Number.parseInt(part.trim(), 10))
    .filter((n) => Number.isFinite(n) && n > 0);

  if (parts.length === 0) return null;

  const expectedCount = 1 + parts.reduce((sum, n) => sum + n, 0);
  if (lineup.length !== expectedCount) return null;

  const slots: FormationSlot[] = [];
  const totalRows = parts.length + 1;
  let playerIndex = 0;

  const gk = lineup[playerIndex];
  if (!gk) return null;
  slots.push({
    player: gk,
    x: 0.5,
    y: verticalPosition(0, totalRows),
    isGK: true,
  });
  playerIndex += 1;

  for (let row = 0; row < parts.length; row += 1) {
    const count = parts[row] ?? 0;
    const displayRow = row + 1;
    for (let i = 0; i < count; i += 1) {
      const player = lineup[playerIndex];
      if (!player) return null;
      slots.push({
        player,
        x: horizontalPosition(i, count),
        y: verticalPosition(displayRow, totalRows),
        isGK: false,
      });
      playerIndex += 1;
    }
  }

  return slots;
}

function horizontalPosition(index: number, count: number): number {
  const usable = 1 - HORIZONTAL_PADDING * 2;
  return HORIZONTAL_PADDING + usable * ((index + 0.5) / count);
}

function verticalPosition(row: number, totalRows: number): number {
  const usable = 1 - VERTICAL_PADDING * 2;
  return VERTICAL_PADDING + usable * (1 - (row + 0.5) / totalRows);
}

function normalizePlayerName(name: string): string {
  return name.trim().toLowerCase();
}

function surnameOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts[parts.length - 1]?.toLowerCase() ?? "";
}

function eventMatchesPlayer(eventName: string, playerName: string): boolean {
  const normalizedEvent = normalizePlayerName(eventName);
  const normalizedPlayer = normalizePlayerName(playerName);
  if (normalizedEvent === normalizedPlayer) return true;

  const eventSurname = surnameOf(eventName);
  const playerSurname = surnameOf(playerName);
  return eventSurname.length > 0 && eventSurname === playerSurname;
}

export function buildPlayerBadges(
  events: MatchEvent[],
  side: MatchEventSide,
): Map<string, PlayerBadge> {
  const badges = new Map<string, PlayerBadge>();

  for (const event of events) {
    if (event.side !== side) continue;

    const key = normalizePlayerName(event.player_name);
    const existing = badges.get(key) ?? { goals: 0, yellow: false, red: false };

    switch (event.type) {
      case "goal":
      case "penalty":
      case "own_goal":
        existing.goals += 1;
        break;
      case "yellow_card":
        existing.yellow = true;
        break;
      case "red_card":
      case "yellow_red_card":
        existing.red = true;
        break;
      default:
        break;
    }

    badges.set(key, existing);
  }

  return badges;
}

export function getPlayerBadge(
  badges: Map<string, PlayerBadge>,
  playerName: string,
  events: MatchEvent[],
  side: MatchEventSide,
): PlayerBadge | null {
  const direct = badges.get(normalizePlayerName(playerName));
  if (direct) return direct;

  for (const event of events) {
    if (event.side !== side) continue;
    if (!eventMatchesPlayer(event.player_name, playerName)) continue;

    const key = normalizePlayerName(event.player_name);
    return badges.get(key) ?? null;
  }

  return null;
}

export function formatPlayerShortName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return name;
  const first = parts[0];
  const last = parts[parts.length - 1];
  return `${first[0]}. ${last}`;
}
