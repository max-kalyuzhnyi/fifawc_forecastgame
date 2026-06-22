import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { CARD_TEAMS, PLAYERS_PER_TEAM } from "@/shared/lib/cards/config";
import { compositeFifaCardArt } from "@/shared/lib/commonsPhoto/compositeFifaCardArt";
import { downloadCandidateImage } from "@/shared/lib/commonsPhoto/fifarostersClient";
import { isCandidateBytesTooSmall } from "@/shared/lib/commonsPhoto/rankCandidate";
import type { PlayerPhotoReviewEntry } from "@/shared/lib/commonsPhoto/types";
import {
  CARD_COLLECTION_DIR,
  CARD_COLLECTION_FINAL_DIR,
  CARD_COLLECTION_PUSH_MANIFEST_PATH,
  CARD_COLLECTION_SELECTIONS_PATH,
  type CardPhotoSelection,
  type LocalRosterPlayer,
} from "./card-collection";
import { teamSlug } from "./card-photo-local-export";
import { assignRarities } from "./load-local-roster";
import { loadPushManifest, type PushManifest } from "./push-card-collection";

const POSITION_PRIORITY: Record<string, number> = {
  FW: 0,
  MF: 1,
  DF: 2,
  GK: 3,
};

function sortSelectionsByPosition(
  selections: CardPhotoSelection[],
  rosterPlayers: LocalRosterPlayer[],
): CardPhotoSelection[] {
  const positionBySlug = new Map(rosterPlayers.map((player) => [player.slug, player.position]));
  const shirtBySlug = new Map(rosterPlayers.map((player) => [player.slug, player.shirtNumber]));

  return [...selections].sort((left, right) => {
    const leftPos = POSITION_PRIORITY[positionBySlug.get(left.playerSlug) ?? "MF"] ?? 2;
    const rightPos = POSITION_PRIORITY[positionBySlug.get(right.playerSlug) ?? "MF"] ?? 2;
    if (leftPos !== rightPos) {
      return leftPos - rightPos;
    }

    const leftShirt = shirtBySlug.get(left.playerSlug) ?? 99;
    const rightShirt = shirtBySlug.get(right.playerSlug) ?? 99;
    return leftShirt - rightShirt;
  });
}

export interface ApplySelectionsResult {
  applied: number;
  skipped: number;
  reviewPath: string;
  selectionsPath: string;
  entries: Array<CardPhotoSelection & { rarity: string }>;
  logs: string[];
}

export function validateSelectionsPerTeam(
  selections: CardPhotoSelection[],
  reviewEntries: PlayerPhotoReviewEntry[],
): { valid: boolean; errors: string[] } {
  const teamsInReview = new Set(reviewEntries.map((entry) => entry.teamName));
  const errors: string[] = [];

  for (const teamName of CARD_TEAMS) {
    if (!teamsInReview.has(teamName)) {
      continue;
    }

    const count = selections.filter((selection) => selection.teamName === teamName).length;
    if (count !== PLAYERS_PER_TEAM) {
      errors.push(`${teamName}: expected ${PLAYERS_PER_TEAM} selections, got ${count}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

function findCandidate(
  entry: PlayerPhotoReviewEntry,
  fileTitle: string,
): PlayerPhotoReviewEntry["candidates"][number] | null {
  return entry.candidates.find((candidate) => candidate.fileTitle === fileTitle) ?? null;
}

export async function applyCardPhotoSelections(input: {
  selections: CardPhotoSelection[];
  reviewPath: string;
  reviewEntries: PlayerPhotoReviewEntry[];
  selectionsPath?: string;
  rosterPlayersByTeam?: Map<string, LocalRosterPlayer[]>;
  onlyPlayerIds?: Set<string>;
  mergeManifest?: boolean;
  skipValidation?: boolean;
}): Promise<ApplySelectionsResult> {
  const activeSelections = input.onlyPlayerIds
    ? input.selections.filter((selection) => input.onlyPlayerIds!.has(selection.playerId))
    : input.selections;

  if (activeSelections.length === 0) {
    throw new Error("No selections matched the requested player filter.");
  }

  if (!input.skipValidation && !input.onlyPlayerIds) {
    const validation = validateSelectionsPerTeam(input.selections, input.reviewEntries);
    if (!validation.valid) {
      throw new Error(validation.errors.join("; "));
    }
  }

  const selectionsPath = input.selectionsPath ?? CARD_COLLECTION_SELECTIONS_PATH;
  const entryByPlayerId = new Map(input.reviewEntries.map((entry) => [entry.playerId, entry]));
  const logs: string[] = [];
  let applied = 0;
  let skipped = 0;

  const selectionsByTeam = new Map<string, CardPhotoSelection[]>();
  for (const selection of activeSelections) {
    const list = selectionsByTeam.get(selection.teamName) ?? [];
    list.push(selection);
    selectionsByTeam.set(selection.teamName, list);
  }

  const manifestEntries: Array<CardPhotoSelection & { rarity: string }> = [];

  for (const [teamName, teamSelections] of selectionsByTeam) {
    const rosterPlayers = input.rosterPlayersByTeam?.get(teamName) ?? [];
    const sortedSelections = sortSelectionsByPosition(teamSelections, rosterPlayers);

    const rarities = assignRarities(sortedSelections.length);

    for (let index = 0; index < sortedSelections.length; index += 1) {
      const selection = sortedSelections[index]!;
      const rarity = rarities[index] ?? "common";
      const entry = entryByPlayerId.get(selection.playerId);

      if (!entry) {
        logs.push(`Skip ${selection.playerName}: no review entry`);
        skipped += 1;
        continue;
      }

      const candidate = findCandidate(entry, selection.fileTitle);
      if (!candidate) {
        logs.push(`Skip ${selection.playerName}: candidate ${selection.fileTitle} missing`);
        skipped += 1;
        continue;
      }

      const sourcePng = await downloadCandidateImage(
        candidate.thumbUrl ?? candidate.sourceUrl,
      );

      if (isCandidateBytesTooSmall(sourcePng.length, candidate.source)) {
        logs.push(`Skip ${selection.playerName}: downloaded file too small`);
        skipped += 1;
        continue;
      }

      const cardWebp = await compositeFifaCardArt(sourcePng, {
        teamName: selection.teamName,
        displayName: selection.playerName,
        photoSource: candidate.source as "fifarosters_face" | "fifarosters_dynamic",
      });

      const exportDir = path.join(
        CARD_COLLECTION_FINAL_DIR,
        teamSlug(selection.teamName),
        selection.playerSlug,
      );
      await mkdir(exportDir, { recursive: true });

      const meta = {
        ...selection,
        rarity,
        source: candidate.source,
        exportedAt: new Date().toISOString(),
        reviewFile: input.reviewPath,
        selectionsFile: selectionsPath,
      };

      await writeFile(path.join(exportDir, "card.webp"), cardWebp);
      await writeFile(path.join(exportDir, `${selection.fileTitle}.png`), sourcePng);
      await writeFile(path.join(exportDir, "meta.json"), JSON.stringify(meta, null, 2));

      manifestEntries.push({ ...selection, rarity });
      applied += 1;
      logs.push(
        `Applied ${selection.playerName} (${rarity}) -> ${path.relative(CARD_COLLECTION_DIR, exportDir)}/card.webp`,
      );
    }
  }

  const existingManifest =
    input.mergeManifest || input.onlyPlayerIds ? await loadPushManifest() : null;
  const mergedEntries = mergeManifestEntries(existingManifest?.entries ?? [], manifestEntries);

  const pushManifest: PushManifest = {
    updatedAt: new Date().toISOString(),
    reviewPath: input.reviewPath,
    selectionsPath,
    applied: mergedEntries.length,
    skipped: (existingManifest?.skipped ?? 0) + skipped,
    entries: mergedEntries,
  };

  await writeFile(CARD_COLLECTION_PUSH_MANIFEST_PATH, JSON.stringify(pushManifest, null, 2));

  return {
    applied,
    skipped,
    reviewPath: input.reviewPath,
    selectionsPath,
    entries: mergedEntries,
    logs,
  };
}

function mergeManifestEntries(
  existing: Array<CardPhotoSelection & { rarity?: string }>,
  incoming: Array<CardPhotoSelection & { rarity: string }>,
): Array<CardPhotoSelection & { rarity: string }> {
  const byPlayerId = new Map(existing.map((entry) => [entry.playerId, entry]));

  for (const entry of incoming) {
    byPlayerId.set(entry.playerId, entry);
  }

  return [...byPlayerId.values()].map((entry) => ({
    ...entry,
    rarity: entry.rarity ?? "common",
  }));
}
