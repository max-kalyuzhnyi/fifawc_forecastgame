import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";
import { CARD_TEAMS } from "../src/shared/lib/cards/config";
import {
  isCandidateBytesTooSmall,
  pickBestCandidate,
  rankCommonsPhotoCandidate,
} from "../src/shared/lib/commonsPhoto/rankCandidate";
import type { PlayerPhotoReviewEntry } from "../src/shared/lib/commonsPhoto/types";
import {
  collectCommonsCandidates,
  downloadCandidateImage,
} from "../src/shared/lib/commonsPhoto/wikimediaClient";

const CARD_ART_BUCKET = "card-art";
const OUTPUT_DIR = path.join(process.cwd(), "scripts", "output");
const PROGRESS_FILE = path.join(OUTPUT_DIR, "card-photo-commons-progress.json");

const BATCH_SIZE = Number(process.env.CARD_PHOTOS_COMMONS_BATCH_SIZE ?? 5);
const PLAYER_OFFSET = Number(process.env.CARD_PHOTOS_COMMONS_OFFSET ?? 0);
const PLAYER_LIMIT = process.env.CARD_PHOTOS_COMMONS_LIMIT
  ? Number(process.env.CARD_PHOTOS_COMMONS_LIMIT)
  : null;
const BATCH_PAUSE_MS = Number(process.env.CARD_PHOTOS_COMMONS_BATCH_PAUSE_MS ?? 5000);
const APPLY_AUTO_ACCEPTED = process.env.CARD_PHOTOS_COMMONS_APPLY !== "0";
const REVIEW_ONLY = process.env.CARD_PHOTOS_COMMONS_REVIEW_ONLY === "1";

interface CardPlayerRow {
  cardId: string;
  playerId: string;
  playerName: string;
  teamName: string;
  wikiTitle: string | null;
  currentPhotoUrl: string | null;
}

interface ProgressState {
  nextOffset: number;
  processedPlayerIds: string[];
  updatedAt: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getPublicCardArtUrl(supabaseUrl: string, objectPath: string): string {
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${CARD_ART_BUCKET}/${objectPath}`;
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
  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(PROGRESS_FILE, JSON.stringify(state, null, 2));
}

async function processToCardArt(bytes: Buffer): Promise<Buffer> {
  return sharp(bytes)
    .rotate()
    .resize(512, 768, { fit: "cover" })
    .webp({ quality: 85 })
    .toBuffer();
}

async function uploadCardArt(
  supabase: ReturnType<typeof createClient>,
  objectPath: string,
  webp: Buffer,
): Promise<void> {
  const { error } = await supabase.storage.from(CARD_ART_BUCKET).upload(objectPath, webp, {
    contentType: "image/webp",
    upsert: true,
  });

  if (error) {
    throw new Error(`Upload failed for ${objectPath}: ${error.message}`);
  }
}

async function deactivateExistingPhotoSources(
  supabase: ReturnType<typeof createClient>,
  playerId: string,
): Promise<void> {
  const { error } = await supabase
    .from("player_photo_sources")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("player_id", playerId)
    .eq("is_active", true);

  if (error && !/player_photo_sources/i.test(error.message)) {
    throw new Error(error.message);
  }
}

async function storePhotoSource(
  supabase: ReturnType<typeof createClient>,
  input: {
    playerId: string;
    cardId: string;
    candidate: ReturnType<typeof rankCommonsPhotoCandidate>;
    status: "pending" | "accepted" | "rejected";
    isActive: boolean;
  },
): Promise<boolean> {
  const { error } = await supabase.from("player_photo_sources").insert({
    player_id: input.playerId,
    card_id: input.cardId,
    source_provider: "wikimedia_commons",
    file_title: input.candidate.fileTitle,
    source_url: input.candidate.sourceUrl,
    thumb_url: input.candidate.thumbUrl,
    license_url: input.candidate.licenseUrl,
    author_credit: input.candidate.authorCredit,
    width: input.candidate.width,
    height: input.candidate.height,
    score: input.candidate.score,
    reason_tags: input.candidate.reasonTags,
    status: input.status,
    is_active: input.isActive,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    if (/player_photo_sources/i.test(error.message)) {
      console.warn("player_photo_sources table missing; run migration 020 and retry metadata persist.");
      return false;
    }
    throw new Error(error.message);
  }

  return true;
}

async function applyAcceptedPhoto(
  supabase: ReturnType<typeof createClient>,
  supabaseUrl: string,
  row: CardPlayerRow,
  candidate: ReturnType<typeof rankCommonsPhotoCandidate>,
): Promise<string> {
  const imageUrl = candidate.thumbUrl ?? candidate.sourceUrl;
  const bytes = await downloadCandidateImage(imageUrl);

  if (isCandidateBytesTooSmall(bytes.length)) {
    throw new Error(`Downloaded file too small (${bytes.length} bytes)`);
  }

  const webp = await processToCardArt(bytes);
  const objectPath = `commons/${row.playerId}/${Date.now()}.webp`;
  await uploadCardArt(supabase, objectPath, webp);

  const publicUrl = getPublicCardArtUrl(supabaseUrl, objectPath);
  const now = new Date().toISOString();

  const { error: playerError } = await supabase
    .from("players")
    .update({ photo_url: publicUrl })
    .eq("id", row.playerId);

  if (playerError) {
    throw new Error(playerError.message);
  }

  const { error: cardError } = await supabase
    .from("cards")
    .update({ image_url: publicUrl, updated_at: now })
    .eq("id", row.cardId);

  if (cardError) {
    throw new Error(cardError.message);
  }

  await deactivateExistingPhotoSources(supabase, row.playerId);
  await storePhotoSource(supabase, {
    playerId: row.playerId,
    cardId: row.cardId,
    candidate,
    status: "accepted",
    isActive: true,
  });

  return publicUrl;
}

async function reviewPlayer(row: CardPlayerRow): Promise<PlayerPhotoReviewEntry> {
  const rawCandidates = await collectCommonsCandidates({
    playerName: row.playerName,
    teamName: row.teamName,
    wikiTitle: row.wikiTitle,
  });

  const ranked = rawCandidates
    .map((candidate) => rankCommonsPhotoCandidate(candidate, row.teamName))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);

  const decision = pickBestCandidate(ranked);

  return {
    playerId: row.playerId,
    playerName: row.playerName,
    teamName: row.teamName,
    wikiTitle: row.wikiTitle,
    currentPhotoUrl: row.currentPhotoUrl,
    candidates: ranked,
    autoAccept: decision.autoAccept,
    selectedFileTitle: decision.best?.fileTitle ?? null,
    rejectionReason: decision.rejectionReason,
  };
}

async function main(): Promise<void> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const savedProgress = await loadProgress();
  const startOffset = savedProgress?.nextOffset ?? PLAYER_OFFSET;

  const [{ data: teams, error: teamsError }, { data: cards, error: cardsError }] =
    await Promise.all([
      supabase.from("teams").select("id, name").in("name", [...CARD_TEAMS]),
      supabase
        .from("cards")
        .select("id, player_id, image_url, display_name, team_id")
        .eq("is_active", true)
        .eq("is_legend", false)
        .not("player_id", "is", null)
        .order("sort_order", { ascending: true }),
    ]);

  if (teamsError) throw teamsError;
  if (cardsError) throw cardsError;

  const teamNameById = new Map((teams ?? []).map((team) => [team.id, team.name]));
  const playerIds = [...new Set((cards ?? []).map((card) => card.player_id).filter(Boolean))];

  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("id, name, wiki_title, photo_url")
    .in("id", playerIds);

  if (playersError) throw playersError;

  const playerById = new Map((players ?? []).map((player) => [player.id, player]));

  const rows: CardPlayerRow[] = (cards ?? [])
    .map((card) => {
      const player = card.player_id ? playerById.get(card.player_id) : null;
      if (!player) return null;

      return {
        cardId: card.id,
        playerId: player.id,
        playerName: card.display_name,
        teamName: card.team_id ? teamNameById.get(card.team_id) ?? "Other" : "Other",
        wikiTitle: player.wiki_title,
        currentPhotoUrl: card.image_url ?? player.photo_url,
      };
    })
    .filter((row): row is CardPlayerRow => row !== null);

  const sliceEnd = PLAYER_LIMIT ? startOffset + PLAYER_LIMIT : rows.length;
  const batchRows = rows.slice(startOffset, sliceEnd);

  console.log(
    `Processing ${batchRows.length} card player(s) starting at offset ${startOffset} (batch size ${BATCH_SIZE}).`,
  );
  console.log(
    `Mode: ${REVIEW_ONLY ? "review-only" : APPLY_AUTO_ACCEPTED ? "review+apply" : "review without apply"}`,
  );

  const reviewEntries: PlayerPhotoReviewEntry[] = [];
  let applied = 0;
  let needsReview = 0;
  let unresolved = 0;

  for (let index = 0; index < batchRows.length; index += BATCH_SIZE) {
    const batch = batchRows.slice(index, index + BATCH_SIZE);
    console.log(
      `\nBatch ${Math.floor(index / BATCH_SIZE) + 1}: ${batch.map((row) => row.playerName).join(", ")}`,
    );

    for (const row of batch) {
      try {
        const review = await reviewPlayer(row);
        reviewEntries.push(review);

        if (!review.selectedFileTitle) {
          unresolved += 1;
          console.log(`  ${row.playerName}: no candidates`);
          continue;
        }

        const selected = review.candidates.find(
          (candidate) => candidate.fileTitle === review.selectedFileTitle,
        );

        if (!selected) {
          unresolved += 1;
          continue;
        }

        if (!review.autoAccept) {
          needsReview += 1;
          await storePhotoSource(supabase, {
            playerId: row.playerId,
            cardId: row.cardId,
            candidate: selected,
            status: "pending",
            isActive: false,
          });
          console.log(
            `  ${row.playerName}: needs review (${review.rejectionReason}) -> ${selected.fileTitle}`,
          );
          continue;
        }

        if (REVIEW_ONLY || !APPLY_AUTO_ACCEPTED) {
          console.log(
            `  ${row.playerName}: auto-accept candidate ${selected.fileTitle} (score ${selected.score})`,
          );
          continue;
        }

        const publicUrl = await applyAcceptedPhoto(supabase, supabaseUrl, row, selected);
        applied += 1;
        console.log(`  ${row.playerName}: applied ${selected.fileTitle} -> ${publicUrl}`);
      } catch (error) {
        unresolved += 1;
        console.error(
          `  ${row.playerName}: failed`,
          error instanceof Error ? error.message : error,
        );
      }
    }

    const nextOffset = startOffset + index + batch.length;
    await saveProgress({
      nextOffset,
      processedPlayerIds: batchRows.slice(0, index + batch.length).map((row) => row.playerId),
      updatedAt: new Date().toISOString(),
    });

    if (index + BATCH_SIZE < batchRows.length) {
      console.log(`Pausing ${BATCH_PAUSE_MS / 1000}s before next batch...`);
      await sleep(BATCH_PAUSE_MS);
    }
  }

  await mkdir(OUTPUT_DIR, { recursive: true });
  const reviewPath = path.join(
    OUTPUT_DIR,
    `card-photo-review-${new Date().toISOString().replace(/[:.]/g, "-")}.json`,
  );
  await writeFile(reviewPath, JSON.stringify(reviewEntries, null, 2));

  console.log("\n=== Commons import summary ===");
  console.log(`Review file: ${reviewPath}`);
  console.log(`Applied: ${applied}`);
  console.log(`Needs manual review: ${needsReview}`);
  console.log(`Unresolved/failed: ${unresolved}`);
  console.log(`Progress saved: ${PROGRESS_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
