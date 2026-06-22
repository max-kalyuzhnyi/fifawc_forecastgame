import { readFile } from "node:fs/promises";
import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { normalizePlayerName } from "@/features/matches/lib/apiFootballPhotos";
import { CARD_TEAMS } from "@/shared/lib/cards/config";
import type { CardRarity } from "@/shared/types/database";
import {
  CARD_COLLECTION_FINAL_DIR,
  CARD_COLLECTION_PUSH_MANIFEST_PATH,
  loadCardRoster,
  getTeamRoster,
} from "./card-collection";
import { teamSlug } from "./card-photo-local-export";
import type { CardPhotoSelection } from "./apply-card-selections";

const CARD_ART_BUCKET = "card-art";

interface FinalCardMeta {
  playerSlug: string;
  playerName: string;
  teamName: string;
  fileTitle: string;
  sourceUrl: string;
  score: number;
  rarity?: CardRarity;
}

export interface PushManifest {
  updatedAt: string;
  reviewPath: string;
  selectionsPath: string;
  applied: number;
  skipped: number;
  entries: Array<CardPhotoSelection & { rarity?: CardRarity }>;
}

export interface PushCollectionResult {
  uploadedCards: number;
  deactivatedCards: number;
  logs: string[];
}

function getPublicCardArtUrl(supabaseUrl: string, objectPath: string): string {
  return `${supabaseUrl.replace(/\/$/, "")}/storage/v1/object/public/${CARD_ART_BUCKET}/${objectPath}`;
}

async function loadFinalCard(
  teamName: string,
  playerSlug: string,
): Promise<{ meta: FinalCardMeta; cardWebp: Buffer } | null> {
  const baseDir = path.join(CARD_COLLECTION_FINAL_DIR, teamSlug(teamName), playerSlug);

  try {
    const [metaRaw, cardWebp] = await Promise.all([
      readFile(path.join(baseDir, "meta.json"), "utf8"),
      readFile(path.join(baseDir, "card.webp")),
    ]);
    return {
      meta: JSON.parse(metaRaw) as FinalCardMeta,
      cardWebp,
    };
  } catch {
    return null;
  }
}

export async function loadPushManifest(
  manifestPath = CARD_COLLECTION_PUSH_MANIFEST_PATH,
): Promise<PushManifest | null> {
  try {
    const raw = await readFile(manifestPath, "utf8");
    return JSON.parse(raw) as PushManifest;
  } catch {
    return null;
  }
}

export async function pushCardCollectionLocal(input: {
  supabase: SupabaseClient;
  supabaseUrl: string;
  manifest?: PushManifest | null;
  teams?: string[];
}): Promise<PushCollectionResult> {
  const manifest = input.manifest ?? (await loadPushManifest());
  if (!manifest || manifest.entries.length === 0) {
    throw new Error("push-manifest.json missing or empty. Run apply first.");
  }

  const teamsToPush = input.teams?.length ? input.teams : [...CARD_TEAMS];
  const logs: string[] = [];
  let uploadedCards = 0;
  let deactivatedCards = 0;

  const { data: teams, error: teamsError } = await input.supabase
    .from("teams")
    .select("id, name")
    .in("name", [...CARD_TEAMS]);

  if (teamsError) {
    throw teamsError;
  }

  const teamIdByName = new Map((teams ?? []).map((team) => [team.name, team.id]));

  const roster = await loadCardRoster();

  for (const teamName of teamsToPush) {
    const teamEntries = manifest.entries.filter((entry) => entry.teamName === teamName);
    if (teamEntries.length === 0) {
      continue;
    }

    const teamId = teamIdByName.get(teamName);
    if (!teamId) {
      logs.push(`Skip ${teamName}: team id missing`);
      continue;
    }

    const { data: existingPlayers, error: playersError } = await input.supabase
      .from("players")
      .select("id, team_id, name, shirt_number")
      .eq("team_id", teamId);

    if (playersError) {
      throw playersError;
    }

    const { data: existingCards, error: cardsError } = await input.supabase
      .from("cards")
      .select("id, player_id")
      .eq("team_id", teamId)
      .eq("is_legend", false);

    if (cardsError) {
      throw cardsError;
    }

    const activePlayerIds = new Set<string>();

    const teamRoster = getTeamRoster(roster, teamName);
    const rosterBySlug = new Map((teamRoster?.players ?? []).map((player) => [player.slug, player]));

    for (const [index, entry] of teamEntries.entries()) {
      const finalCard = await loadFinalCard(teamName, entry.playerSlug);
      if (!finalCard) {
        logs.push(`Skip ${entry.playerName}: final card missing`);
        continue;
      }

      const matchedPlayer =
        (existingPlayers ?? []).find(
          (player) => normalizePlayerName(player.name) === normalizePlayerName(entry.playerName),
        ) ?? null;

      let playerId = matchedPlayer?.id;

      const rosterPlayer = rosterBySlug.get(entry.playerSlug);

      if (!playerId) {
        const { data: insertedPlayer, error: insertPlayerError } = await input.supabase
          .from("players")
          .insert({
            team_id: teamId,
            name: entry.playerName,
            position: rosterPlayer?.position ?? "MF",
            shirt_number: rosterPlayer?.shirtNumber ?? null,
          })
          .select("id")
          .single();

        if (insertPlayerError) {
          throw insertPlayerError;
        }

        playerId = insertedPlayer.id;
      } else if (rosterPlayer) {
        const { error: updatePlayerError } = await input.supabase
          .from("players")
          .update({
            position: rosterPlayer.position,
            shirt_number: rosterPlayer.shirtNumber,
          })
          .eq("id", playerId);

        if (updatePlayerError) {
          throw updatePlayerError;
        }
      }

      activePlayerIds.add(playerId);

      const objectPath = `fifarosters/${playerId}/${Date.now()}.webp`;
      const { error: uploadError } = await input.supabase.storage
        .from(CARD_ART_BUCKET)
        .upload(objectPath, finalCard.cardWebp, {
          contentType: "image/webp",
          upsert: true,
        });

      if (uploadError) {
        throw new Error(`Upload failed for ${entry.playerName}: ${uploadError.message}`);
      }

      const publicUrl = getPublicCardArtUrl(input.supabaseUrl, objectPath);
      const now = new Date().toISOString();
      const existingCard = (existingCards ?? []).find((card) => card.player_id === playerId);
      const rarity = (finalCard.meta.rarity ?? entry.rarity ?? "common") as CardRarity;

      const cardPayload = {
        player_id: playerId,
        team_id: teamId,
        is_legend: false,
        display_name: entry.playerName,
        image_url: publicUrl,
        rarity,
        sort_order: index,
        is_active: true,
        updated_at: now,
      };

      const { error: cardWriteError } = existingCard
        ? await input.supabase.from("cards").update(cardPayload).eq("id", existingCard.id)
        : await input.supabase.from("cards").insert(cardPayload);

      if (cardWriteError) {
        throw cardWriteError;
      }

      const { error: playerPhotoError } = await input.supabase
        .from("players")
        .update({ photo_url: publicUrl })
        .eq("id", playerId);

      if (playerPhotoError) {
        throw playerPhotoError;
      }

      uploadedCards += 1;
      logs.push(`Pushed ${entry.playerName} (${teamName})`);
    }

    const cardsToDeactivate = (existingCards ?? []).filter(
      (card) => card.player_id && !activePlayerIds.has(card.player_id),
    );

    if (cardsToDeactivate.length > 0) {
      const { error: deactivateError } = await input.supabase
        .from("cards")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .in(
          "id",
          cardsToDeactivate.map((card) => card.id),
        );

      if (deactivateError) {
        throw deactivateError;
      }

      deactivatedCards += cardsToDeactivate.length;
    }

    logs.push(
      `${teamName}: pushed ${activePlayerIds.size}, deactivated ${cardsToDeactivate.length}`,
    );
  }

  return { uploadedCards, deactivatedCards, logs };
}
