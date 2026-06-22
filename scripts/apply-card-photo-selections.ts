import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { applyCardPhotoSelections } from "./lib/apply-card-selections";
import {
  CARD_COLLECTION_DIR,
  CARD_COLLECTION_SELECTIONS_PATH,
  type CardPhotoSelection,
} from "./lib/card-collection";
import { loadReviewEntries } from "./lib/card-photo-review";
import { loadCardRoster } from "./lib/card-collection";

async function loadSelections(selectionPath: string): Promise<CardPhotoSelection[]> {
  const raw = await readFile(selectionPath, "utf8");
  const parsed = JSON.parse(raw) as CardPhotoSelection[];
  if (!Array.isArray(parsed)) {
    throw new Error("Selections file must contain a JSON array.");
  }
  return parsed;
}

async function main(): Promise<void> {
  const selectionPath =
    process.argv[2] && !process.argv[2].startsWith("--")
      ? process.argv[2]
      : CARD_COLLECTION_SELECTIONS_PATH;
  const reviewPathArg = process.argv.find((arg, index) => index > 2 && !arg.startsWith("--"));
  const onlyArg = process.argv.find((arg) => arg.startsWith("--only="));
  const onlyPlayerIds = onlyArg
    ? new Set(
        onlyArg
          .slice("--only=".length)
          .split(",")
          .map((value) => value.trim())
          .filter(Boolean),
      )
    : undefined;

  const selections = await loadSelections(selectionPath);
  const { reviewPath, entries } = await loadReviewEntries(reviewPathArg);
  const roster = await loadCardRoster();

  const rosterPlayersByTeam = new Map(
    Object.values(roster.teams).map((team) => [team.teamName, team.players]),
  );

  const result = await applyCardPhotoSelections({
    selections,
    reviewPath,
    reviewEntries: entries,
    selectionsPath: selectionPath,
    rosterPlayersByTeam,
    onlyPlayerIds,
    mergeManifest: Boolean(onlyPlayerIds),
    skipValidation: Boolean(onlyPlayerIds),
  });

  for (const log of result.logs) {
    console.log(log);
  }

  console.log("\n=== Apply selections summary ===");
  console.log(`Applied: ${result.applied}`);
  console.log(`Skipped: ${result.skipped}`);
  console.log(`Final cards: ${path.join(CARD_COLLECTION_DIR, "final")}`);
  console.log(`Push manifest: ${path.join(CARD_COLLECTION_DIR, "push-manifest.json")}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
