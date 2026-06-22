import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import type { CardRarity } from "@/shared/types/database";
import type { PlayerPosition, PoolRole } from "@/features/matches/lib/lineupRoster";
import { teamSlug, slugifyName } from "./card-photo-local-export";

export const CARD_COLLECTION_DIR = path.join(
  process.cwd(),
  "scripts",
  "output",
  "card-collection",
);

export const CARD_COLLECTION_ROSTER_PATH = path.join(CARD_COLLECTION_DIR, "roster.json");
export const CARD_COLLECTION_FINAL_DIR = path.join(CARD_COLLECTION_DIR, "final");
export const CARD_COLLECTION_PREVIEWS_DIR = path.join(
  CARD_COLLECTION_DIR,
  "card-photo-previews",
);
export const CARD_COLLECTION_SELECTIONS_PATH = path.join(
  CARD_COLLECTION_DIR,
  "card-photo-selections.json",
);
export const CARD_COLLECTION_PUSH_MANIFEST_PATH = path.join(
  CARD_COLLECTION_DIR,
  "push-manifest.json",
);
export const CARD_COLLECTION_STUDIO_HTML_PATH = path.join(
  CARD_COLLECTION_DIR,
  "studio.html",
);
export const CARD_COLLECTION_STUDIO_STATE_PATH = path.join(
  CARD_COLLECTION_DIR,
  "studio-state.json",
);

export interface CardPhotoSelection {
  playerId: string;
  playerSlug: string;
  playerName: string;
  teamName: string;
  fileTitle: string;
  sourceUrl: string;
  score: number;
}

export interface StudioState {
  updatedAt: string;
  applySucceeded: boolean;
  pushSucceeded: boolean;
  lastApplyAt: string | null;
  lastPushAt: string | null;
  applyLogs: string[];
  pushLogs: string[];
}

export interface LocalRosterPlayer {
  slug: string;
  name: string;
  shirtNumber: number | null;
  position: PlayerPosition;
  poolRole: PoolRole;
  inFinalSet: boolean;
  rarity?: CardRarity;
}

export interface LocalTeamRoster {
  teamName: string;
  sourceMatch: {
    kickoffAt: string;
    opponent: string;
    side: "home" | "away";
    formation: string | null;
  };
  players: LocalRosterPlayer[];
}

export interface LocalCardRoster {
  updatedAt: string;
  teams: Record<string, LocalTeamRoster>;
}

export async function loadCardRoster(
  rosterPath = CARD_COLLECTION_ROSTER_PATH,
): Promise<LocalCardRoster> {
  const raw = await readFile(rosterPath, "utf8");
  return JSON.parse(raw) as LocalCardRoster;
}

export async function saveCardRoster(
  roster: LocalCardRoster,
  rosterPath = CARD_COLLECTION_ROSTER_PATH,
): Promise<void> {
  await mkdir(path.dirname(rosterPath), { recursive: true });
  await writeFile(rosterPath, JSON.stringify(roster, null, 2));
}

export function buildLocalRosterPlayer(input: {
  name: string;
  shirtNumber: number | null;
  position: PlayerPosition;
  poolRole: PoolRole;
  inFinalSet?: boolean;
  rarity?: CardRarity;
}): LocalRosterPlayer {
  return {
    slug: slugifyName(input.name),
    name: input.name,
    shirtNumber: input.shirtNumber,
    position: input.position,
    poolRole: input.poolRole,
    inFinalSet: input.inFinalSet ?? false,
    rarity: input.rarity,
  };
}

export function getTeamRoster(
  roster: LocalCardRoster,
  teamName: string,
): LocalTeamRoster | null {
  return roster.teams[teamSlug(teamName)] ?? null;
}

export async function loadStudioState(
  statePath = CARD_COLLECTION_STUDIO_STATE_PATH,
): Promise<StudioState | null> {
  try {
    const raw = await readFile(statePath, "utf8");
    return JSON.parse(raw) as StudioState;
  } catch {
    return null;
  }
}

export async function saveStudioState(
  state: StudioState,
  statePath = CARD_COLLECTION_STUDIO_STATE_PATH,
): Promise<void> {
  await mkdir(path.dirname(statePath), { recursive: true });
  await writeFile(statePath, JSON.stringify(state, null, 2));
}

export function emptyStudioState(): StudioState {
  return {
    updatedAt: new Date().toISOString(),
    applySucceeded: false,
    pushSucceeded: false,
    lastApplyAt: null,
    lastPushAt: null,
    applyLogs: [],
    pushLogs: [],
  };
}
