import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import type { PlayerPhotoReviewEntry } from "../../src/shared/lib/commonsPhoto/types";
import { CARD_COLLECTION_DIR } from "./card-collection";

export const CARD_PHOTO_OUTPUT_DIR = path.join(process.cwd(), "scripts", "output");

const REVIEW_SEARCH_DIRS = [CARD_COLLECTION_DIR, CARD_PHOTO_OUTPUT_DIR];

export async function findLatestReviewFile(searchDirs = REVIEW_SEARCH_DIRS): Promise<string | null> {
  const reviewFiles: Array<{ entry: string; mtimeMs: number }> = [];

  for (const dir of searchDirs) {
    let entries: string[];

    try {
      entries = await readdir(dir);
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (
        (entry.startsWith("card-photo-review-") ||
          entry.startsWith("card-photo-fifarosters-review-") ||
          entry.startsWith("review-")) &&
        entry.endsWith(".json")
      ) {
        reviewFiles.push({
          entry: path.join(dir, entry),
          mtimeMs: (await stat(path.join(dir, entry))).mtimeMs,
        });
      }
    }
  }

  if (reviewFiles.length === 0) {
    return null;
  }

  reviewFiles.sort((left, right) => right.mtimeMs - left.mtimeMs);
  return reviewFiles[0]!.entry;
}

export async function loadReviewEntries(
  explicitPath?: string,
): Promise<{ reviewPath: string; entries: PlayerPhotoReviewEntry[] }> {
  const reviewPath = explicitPath ?? (await findLatestReviewFile());

  if (!reviewPath) {
    throw new Error(
      "No review file found. Run npm run scrape:card-photos-fifarosters-local first.",
    );
  }

  const raw = await readFile(reviewPath, "utf8");
  const entries = JSON.parse(raw) as PlayerPhotoReviewEntry[];

  return { reviewPath, entries };
}
