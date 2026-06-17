import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { PlayerPhotoReviewEntry } from "../src/shared/lib/commonsPhoto/types";

const OUTPUT_DIR = path.join(process.cwd(), "scripts", "output");

async function findLatestReviewFile(): Promise<string | null> {
  let entries: string[];

  try {
    entries = await readdir(OUTPUT_DIR);
  } catch {
    return null;
  }

  const reviewFiles = entries
    .filter((entry) => entry.startsWith("card-photo-review-") && entry.endsWith(".json"))
    .sort();

  return reviewFiles.length > 0
    ? path.join(OUTPUT_DIR, reviewFiles[reviewFiles.length - 1])
    : null;
}

async function main(): Promise<void> {
  const explicitPath = process.argv[2];
  const reviewPath = explicitPath ?? (await findLatestReviewFile());

  if (!reviewPath) {
    throw new Error("No review file found. Run npm run import:card-photos-commons first.");
  }

  const raw = await readFile(reviewPath, "utf8");
  const entries = JSON.parse(raw) as PlayerPhotoReviewEntry[];

  const needsReview = entries.filter((entry) => !entry.autoAccept && entry.selectedFileTitle);
  const unresolved = entries.filter((entry) => !entry.selectedFileTitle);
  const autoAccepted = entries.filter((entry) => entry.autoAccept);

  console.log(`Review file: ${reviewPath}`);
  console.log(`Total players: ${entries.length}`);
  console.log(`Auto-accepted: ${autoAccepted.length}`);
  console.log(`Needs manual review: ${needsReview.length}`);
  console.log(`Unresolved: ${unresolved.length}`);

  if (needsReview.length > 0) {
    console.log("\nManual review queue:");
    for (const entry of needsReview) {
      const top = entry.candidates[0];
      console.log(
        [
          entry.teamName,
          entry.playerName,
          entry.rejectionReason ?? "review",
          top?.fileTitle ?? "",
          top?.score ?? "",
          top?.sourceUrl ?? "",
        ].join("\t"),
      );
    }
  }

  if (unresolved.length > 0) {
    console.log("\nUnresolved players:");
    for (const entry of unresolved) {
      console.log(`${entry.teamName}\t${entry.playerName}\t${entry.rejectionReason ?? "none"}`);
    }
  }

  console.log("\nNext step: npm run audit:card-photos");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
