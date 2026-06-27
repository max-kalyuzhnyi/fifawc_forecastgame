import { config } from "dotenv";

config({ path: ".env.local" });
config();

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";
import { generatePlayerCard } from "../src/shared/lib/cardArt/generatePlayerCard";
import type { PlayerCardMeta } from "../src/shared/lib/cardArt/types";
import { CARD_TEAMS } from "../src/shared/lib/cards/config";
import { getFlagCode } from "../src/shared/lib/teamFlags";

const CARD_ART_BUCKET = "card-art";
const OUTPUT_DIR = path.join(process.cwd(), "scripts", "output");
const PROGRESS_FILE = path.join(OUTPUT_DIR, "player-cards-progress.json");

const BATCH_SIZE = Number(process.env.PLAYER_CARDS_BATCH_SIZE ?? 3);
const BATCH_PAUSE_MS = Number(process.env.PLAYER_CARDS_BATCH_PAUSE_MS ?? 8000);

interface CliOptions {
  dryRun: boolean;
  skipExisting: boolean;
  skipAi: boolean;
  useAi: boolean;
  offset: number;
  limit: number | null;
  nameFilter: string | null;
}

interface CardPlayerRow {
  cardId: string;
  playerId: string;
  displayName: string;
  teamId: string | null;
  teamName: string;
  teamColor: string | null;
  shirtNumber: number | null;
  position: "GK" | "DF" | "MF" | "FW" | null;
  photoUrl: string | null;
  currentImageUrl: string | null;
}

interface ProgressState {
  nextOffset: number;
  processedPlayerIds: string[];
  updatedAt: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getArgValue(args: string[], flag: string): string | null {
  const index = args.indexOf(flag);
  if (index === -1) return null;
  return args[index + 1] ?? null;
}

function parseCliOptions(): CliOptions {
  const args = process.argv.slice(2);

  return {
    dryRun: args.includes("--dry-run") || process.env.PLAYER_CARDS_DRY_RUN === "1",
    skipExisting:
      args.includes("--skip-existing") || process.env.PLAYER_CARDS_SKIP_EXISTING === "1",
    skipAi: args.includes("--skip-ai") || process.env.PLAYER_CARDS_SKIP_AI === "1",
    useAi: args.includes("--use-ai") || process.env.CARD_ART_USE_AI === "1",
    offset: Number(getArgValue(args, "--offset") ?? process.env.PLAYER_CARDS_OFFSET ?? 0),
    limit: (() => {
      const raw = getArgValue(args, "--limit") ?? process.env.PLAYER_CARDS_LIMIT;
      return raw ? Number(raw) : null;
    })(),
    nameFilter: getArgValue(args, "--name") ?? process.env.PLAYER_CARDS_NAME ?? null,
  };
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

async function downloadPhoto(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to download photo (${response.status})`);
  }
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
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

function isGeneratedCardUrl(url: string | null): boolean {
  return Boolean(url?.includes(`/card-art/cards/`));
}

async function processPlayer(
  supabase: ReturnType<typeof createClient> | null,
  supabaseUrl: string | null,
  row: CardPlayerRow,
  options: CliOptions,
): Promise<{ status: "applied" | "skipped" | "failed"; message: string }> {
  if (!row.photoUrl) {
    return { status: "skipped", message: "no photo_url" };
  }

  if (options.skipExisting && isGeneratedCardUrl(row.currentImageUrl)) {
    return { status: "skipped", message: "already generated" };
  }

  const photoBytes = await downloadPhoto(row.photoUrl);
  const meta: PlayerCardMeta = {
    playerId: row.playerId,
    displayName: row.displayName,
    teamName: row.teamName,
    shirtNumber: row.shirtNumber,
    position: row.position,
    primaryColor: row.teamColor,
    flagCode: getFlagCode(row.teamName),
  };

  const result = await generatePlayerCard(photoBytes, meta, {
    skipAiEnhancement: options.skipAi || !options.useAi,
  });

  const cardObjectPath = `cards/${row.playerId}/card.webp`;
  const enhancedObjectPath = `cards/${row.playerId}/enhanced.webp`;

  if (options.dryRun) {
    await mkdir(OUTPUT_DIR, { recursive: true });
    const safeName = row.displayName.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    await writeFile(path.join(OUTPUT_DIR, `${safeName}-card.webp`), result.cardWebp);
    await writeFile(
      path.join(OUTPUT_DIR, `${safeName}-enhanced.webp`),
      result.enhancedPhotoWebp,
    );
    return {
      status: "applied",
      message: `dry-run saved (ai=${result.usedAiEnhancement}, face=${result.faceReused})`,
    };
  }

  if (!supabase || !supabaseUrl) {
    throw new Error("Supabase credentials are required unless running with --dry-run");
  }

  await uploadCardArt(supabase, cardObjectPath, result.cardWebp);
  await uploadCardArt(supabase, enhancedObjectPath, result.enhancedPhotoWebp);

  const publicUrl = getPublicCardArtUrl(supabaseUrl, cardObjectPath);
  const now = new Date().toISOString();

  const { error: cardError } = await supabase
    .from("cards")
    .update({ image_url: publicUrl, updated_at: now })
    .eq("id", row.cardId);

  if (cardError) {
    throw new Error(cardError.message);
  }

  return {
    status: "applied",
    message: `${publicUrl} (ai=${result.usedAiEnhancement})`,
  };
}

async function main(): Promise<void> {
  const options = parseCliOptions();
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!options.useAi && !options.skipAi && !process.env.OPENAI_API_KEY) {
    // Sharp-only pipeline is the default; OpenAI is optional.
  } else if (options.useAi && !options.skipAi && !process.env.OPENAI_API_KEY) {
    throw new Error(
      "Missing OPENAI_API_KEY for --use-ai. Add it to .env.local or run without --use-ai.",
    );
  }

  if ((!options.dryRun || options.useAi) && (!supabaseUrl || !serviceRoleKey)) {
    if (options.dryRun && options.skipAi) {
      console.warn("Supabase credentials missing; only local dry-run with --skip-ai is supported.");
    } else {
      throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }
  }

  const supabase =
    supabaseUrl && serviceRoleKey ? createClient(supabaseUrl, serviceRoleKey) : null;
  const savedProgress = await loadProgress();
  const startOffset = savedProgress?.nextOffset ?? options.offset;

  let rows: CardPlayerRow[] = [];

  if (supabase) {
    const [{ data: teams, error: teamsError }, { data: cards, error: cardsError }] =
      await Promise.all([
        supabase.from("teams").select("id, name, primary_color").in("name", [...CARD_TEAMS]),
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

    const teamById = new Map(
      (teams ?? []).map((team) => [
        team.id,
        { name: team.name, primaryColor: team.primary_color },
      ]),
    );
    const playerIds = [
      ...new Set((cards ?? []).map((card) => card.player_id).filter(Boolean)),
    ] as string[];

    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("id, name, photo_url, shirt_number, position, team_id")
      .in("id", playerIds);

    if (playersError) throw playersError;

    const playerById = new Map((players ?? []).map((player) => [player.id, player]));

    rows = (cards ?? [])
      .map((card) => {
        const player = card.player_id ? playerById.get(card.player_id) : null;
        if (!player) return null;

        const team = card.team_id ? teamById.get(card.team_id) : null;
        const fallbackTeam = player.team_id ? teamById.get(player.team_id) : null;
        const resolvedTeam = team ?? fallbackTeam;

        return {
          cardId: card.id,
          playerId: player.id,
          displayName: card.display_name,
          teamId: card.team_id ?? player.team_id,
          teamName: resolvedTeam?.name ?? "Other",
          teamColor: resolvedTeam?.primaryColor ?? null,
          shirtNumber: player.shirt_number,
          position: player.position,
          photoUrl: player.photo_url,
          currentImageUrl: card.image_url ?? player.photo_url,
        } satisfies CardPlayerRow;
      })
      .filter((row): row is CardPlayerRow => row !== null);
  }

  if (rows.length === 0) {
    throw new Error("No players found to process. Check Supabase credentials and card catalog.");
  }

  const filteredRows = options.nameFilter
    ? rows.filter((row) =>
        row.displayName.toLowerCase().includes(options.nameFilter!.toLowerCase()),
      )
    : rows;

  if (filteredRows.length === 0) {
    throw new Error(`No players matched --name "${options.nameFilter}"`);
  }

  const sliceEnd = options.limit ? startOffset + options.limit : filteredRows.length;
  const batchRows = filteredRows.slice(startOffset, sliceEnd);

  console.log(
    `Processing ${batchRows.length} player card(s) starting at offset ${startOffset} (batch size ${BATCH_SIZE}).`,
  );
  console.log(
    `Mode: ${options.dryRun ? "dry-run" : "apply"} | AI: ${options.useAi && !options.skipAi ? "on" : "off (sharp only)"} | skip-existing: ${options.skipExisting}`,
  );

  let applied = 0;
  let skipped = 0;
  let failed = 0;

  for (let index = 0; index < batchRows.length; index += BATCH_SIZE) {
    const batch = batchRows.slice(index, index + BATCH_SIZE);
    console.log(
      `\nBatch ${Math.floor(index / BATCH_SIZE) + 1}: ${batch.map((row) => row.displayName).join(", ")}`,
    );

    for (const row of batch) {
      try {
        const outcome = await processPlayer(supabase, supabaseUrl, row, options);

        if (outcome.status === "applied") {
          applied += 1;
          console.log(`  ${row.displayName}: ${outcome.message}`);
        } else {
          skipped += 1;
          console.log(`  ${row.displayName}: skipped (${outcome.message})`);
        }
      } catch (error) {
        failed += 1;
        console.error(
          `  ${row.displayName}: failed`,
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

  console.log("\n=== Player card generation summary ===");
  console.log(`Applied: ${applied}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);
  console.log(`Progress saved: ${PROGRESS_FILE}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
