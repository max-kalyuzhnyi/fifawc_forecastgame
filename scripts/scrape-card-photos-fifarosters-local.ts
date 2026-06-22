import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { compositeFifaCardArt } from "../src/shared/lib/commonsPhoto/compositeFifaCardArt";
import { downloadCandidateImage } from "../src/shared/lib/commonsPhoto/fifarostersClient";
import type { PlayerPhotoReviewEntry } from "../src/shared/lib/commonsPhoto/types";
import {
  CARD_COLLECTION_DIR,
  CARD_COLLECTION_PREVIEWS_DIR,
} from "./lib/card-collection";
import { loadLocalCardPlayerRows } from "./lib/load-local-roster";
import { reviewFifaRostersPlayer } from "./lib/review-fifarosters-player";

const PROGRESS_FILE = path.join(CARD_COLLECTION_DIR, "scrape-progress.json");
const REVIEW_IN_PROGRESS_FILE = path.join(CARD_COLLECTION_DIR, "review-in-progress.json");

function readEnv(name: string): string | undefined {
  return process.env[name];
}

const BATCH_SIZE = Number(readEnv("CARD_PHOTOS_FIFAROSTERS_BATCH_SIZE") ?? 3);
const PLAYER_OFFSET = Number(readEnv("CARD_PHOTOS_FIFAROSTERS_OFFSET") ?? 0);
const PLAYER_LIMIT = readEnv("CARD_PHOTOS_FIFAROSTERS_LIMIT")
  ? Number(readEnv("CARD_PHOTOS_FIFAROSTERS_LIMIT"))
  : null;
const BATCH_PAUSE_MS = Number(readEnv("CARD_PHOTOS_FIFAROSTERS_BATCH_PAUSE_MS") ?? 10_000);
const PLAYER_DELAY_MS = Number(readEnv("CARD_PHOTOS_FIFAROSTERS_PLAYER_DELAY_MS") ?? 3_000);
const TEAM_FILTER = readEnv("CARD_PHOTOS_FIFAROSTERS_TEAMS")
  ?.split(",")
  .map((team) => team.trim())
  .filter(Boolean);

interface ProgressState {
  nextOffset: number;
  processedPlayerIds: string[];
  updatedAt: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isFifaRostersCandidate(source: string): boolean {
  return source === "fifarosters_dynamic" || source === "fifarosters_face";
}

function previewKey(playerId: string, fileTitle: string): string {
  return `${playerId}:${fileTitle}`;
}

async function loadProgress(): Promise<ProgressState | null> {
  try {
    const raw = await readFile(PROGRESS_FILE, "utf8");
    return JSON.parse(raw) as ProgressState;
  } catch {
    return null;
  }
}

async function saveProgress(state: ProgressState): Promise<void> {
  await mkdir(CARD_COLLECTION_DIR, { recursive: true });
  await writeFile(PROGRESS_FILE, JSON.stringify(state, null, 2));
}

async function loadReviewInProgress(): Promise<PlayerPhotoReviewEntry[]> {
  try {
    const raw = await readFile(REVIEW_IN_PROGRESS_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PlayerPhotoReviewEntry[]) : [];
  } catch {
    return [];
  }
}

async function saveReviewInProgress(entries: PlayerPhotoReviewEntry[]): Promise<void> {
  await mkdir(CARD_COLLECTION_DIR, { recursive: true });
  await writeFile(REVIEW_IN_PROGRESS_FILE, JSON.stringify(entries, null, 2));
}

function mergeReviewEntries(
  existing: PlayerPhotoReviewEntry[],
  incoming: PlayerPhotoReviewEntry[],
): PlayerPhotoReviewEntry[] {
  const byPlayerId = new Map(existing.map((entry) => [entry.playerId, entry]));
  for (const entry of incoming) {
    byPlayerId.set(entry.playerId, entry);
  }
  return [...byPlayerId.values()];
}

async function buildCompositedPreviews(
  entries: PlayerPhotoReviewEntry[],
): Promise<Map<string, string>> {
  const previewByKey = new Map<string, string>();

  for (const entry of entries) {
    for (const candidate of entry.candidates) {
      if (!isFifaRostersCandidate(candidate.source)) {
        continue;
      }

      const key = previewKey(entry.playerId, candidate.fileTitle);
      const relativePath = path.join(entry.playerId, `${candidate.fileTitle}.webp`);
      const absolutePath = path.join(CARD_COLLECTION_PREVIEWS_DIR, relativePath);

      try {
        const bytes = await downloadCandidateImage(
          candidate.thumbUrl ?? candidate.sourceUrl,
        );
        const webp = await compositeFifaCardArt(bytes, {
          teamName: entry.teamName,
          displayName: entry.playerName,
          photoSource: candidate.source as "fifarosters_face" | "fifarosters_dynamic",
        });

        await mkdir(path.dirname(absolutePath), { recursive: true });
        await writeFile(absolutePath, webp);
        previewByKey.set(key, relativePath.replaceAll("\\", "/"));
      } catch (error) {
        console.warn(
          `Preview composite failed for ${entry.playerName} (${candidate.fileTitle}):`,
          error instanceof Error ? error.message : error,
        );
      }
    }
  }

  return previewByKey;
}

async function main(): Promise<void> {
  if (process.env.FIFAROSTERS_MANUAL_PICK !== "1") {
    console.warn("FIFAROSTERS_MANUAL_PICK is not set; enabling manual pick for this scrape.");
    process.env.FIFAROSTERS_MANUAL_PICK = "1";
  }

  const savedProgress = await loadProgress();
  const startOffset = savedProgress?.nextOffset ?? PLAYER_OFFSET;
  const rows = await loadLocalCardPlayerRows({ teams: TEAM_FILTER });
  const sliceEnd = PLAYER_LIMIT ? startOffset + PLAYER_LIMIT : rows.length;
  const batchRows = rows.slice(startOffset, sliceEnd);

  const reviewEntries = await loadReviewInProgress();
  const reviewByPlayerId = new Set(reviewEntries.map((entry) => entry.playerId));
  let withCandidates = 0;
  let unresolved = 0;
  let failed = 0;
  let skipped = 0;

  console.log(`Scraping ${batchRows.length} player(s) from local roster at offset ${startOffset}.`);
  console.log(`Output: ${CARD_COLLECTION_DIR}`);
  console.log(`Review in progress: ${reviewEntries.length} player(s) on disk.`);

  for (let index = 0; index < batchRows.length; index += BATCH_SIZE) {
    const batch = batchRows.slice(index, index + BATCH_SIZE);
    console.log(
      `\nBatch ${Math.floor(index / BATCH_SIZE) + 1}: ${batch.map((row) => `${row.playerName} (${row.teamName})`).join(", ")}`,
    );

    for (const row of batch) {
      if (reviewByPlayerId.has(row.playerId)) {
        skipped += 1;
        console.log(`  ${row.playerName}: skipped (already in review-in-progress)`);
        continue;
      }

      try {
        const review = await reviewFifaRostersPlayer({
          playerId: row.playerId,
          playerName: row.playerName,
          teamName: row.teamName,
          wikiTitle: row.wikiTitle,
          currentPhotoUrl: row.currentPhotoUrl,
        });
        reviewEntries.push(review);
        reviewByPlayerId.add(row.playerId);

        if (review.candidates.length === 0) {
          unresolved += 1;
          console.log(`  ${row.playerName}: no candidates`);
        } else {
          withCandidates += 1;
          console.log(
            `  ${row.playerName}: ${review.candidates.length} candidate(s), suggested ${review.suggestedFileTitle ?? "none"}`,
          );
        }
      } catch (error) {
        failed += 1;
        console.error(
          `  ${row.playerName}: failed`,
          error instanceof Error ? error.message : error,
        );
      }

      if (PLAYER_DELAY_MS > 0) {
        await sleep(PLAYER_DELAY_MS);
      }
    }

    const nextOffset = startOffset + index + batch.length;
    await saveProgress({
      nextOffset,
      processedPlayerIds: rows.slice(0, nextOffset).map((item) => item.playerId),
      updatedAt: new Date().toISOString(),
    });
    await saveReviewInProgress(reviewEntries);

    if (index + BATCH_SIZE < batchRows.length) {
      console.log(`Pausing ${BATCH_PAUSE_MS / 1000}s before next batch...`);
      await sleep(BATCH_PAUSE_MS);
    }
  }

  const reviewPath = path.join(
    CARD_COLLECTION_DIR,
    `review-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  await writeFile(reviewPath, JSON.stringify(reviewEntries, null, 2));

  console.log("\nBuilding composited previews for picker...");
  const previewByKey = await buildCompositedPreviews(reviewEntries);
  const previewIndexPath = path.join(CARD_COLLECTION_DIR, "preview-index.json");
  await writeFile(
    previewIndexPath,
    JSON.stringify(Object.fromEntries(previewByKey), null, 2),
  );

  console.log("\n=== Local FifaRosters scrape summary ===");
  console.log(`Review file: ${reviewPath}`);
  console.log(`Preview index: ${previewIndexPath}`);
  console.log(`With candidates: ${withCandidates}`);
  console.log(`Unresolved: ${unresolved}`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped (cached): ${skipped}`);
  console.log(`Composited previews: ${previewByKey.size}`);
  console.log("Next step: npm run report:card-collection-studio");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
