"use server";

import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { z } from "zod";
import { LEGENDS_TEAM_NAME } from "@/shared/lib/cards/config";
import { isAdmin } from "@/shared/lib/auth";
import { createAdminClient } from "@/shared/lib/supabase/admin";
import { createClient } from "@/shared/lib/supabase/server";
import type { CardRarity } from "@/shared/types/database";

const CARD_ART_BUCKET = "card-art";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const CARDS_PATH = "/cards";
const ADMIN_PATH = "/admin";

const raritySchema = z.enum(["common", "rare", "legendary"]);

async function assertAdmin(): Promise<{ error: string } | { ok: true }> {
  if (!(await isAdmin())) {
    return { error: "Forbidden" };
  }
  return { ok: true };
}

function getPublicCardArtUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!baseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL");
  }
  return `${baseUrl}/storage/v1/object/public/${CARD_ART_BUCKET}/${path}`;
}

export async function updateCardRarity(
  cardId: string,
  rarity: CardRarity,
): Promise<{ success: true } | { error: string }> {
  const adminCheck = await assertAdmin();
  if ("error" in adminCheck) {
    return adminCheck;
  }

  const parsed = raritySchema.safeParse(rarity);
  if (!parsed.success) {
    return { error: "Invalid rarity" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("cards")
    .update({ rarity: parsed.data, updated_at: new Date().toISOString() })
    .eq("id", cardId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(CARDS_PATH);
  revalidatePath(ADMIN_PATH);
  return { success: true };
}

export async function swapCardPlayer(
  cardId: string,
  playerId: string,
): Promise<{ success: true } | { error: string }> {
  const adminCheck = await assertAdmin();
  if ("error" in adminCheck) {
    return adminCheck;
  }

  const supabase = await createClient();

  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id, name, team_id, photo_url")
    .eq("id", playerId)
    .maybeSingle();

  if (playerError || !player) {
    return { error: "Player not found" };
  }

  const { error } = await supabase
    .from("cards")
    .update({
      player_id: player.id,
      team_id: player.team_id,
      display_name: player.name,
      image_url: player.photo_url,
      is_legend: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", cardId)
    .eq("is_legend", false);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(CARDS_PATH);
  revalidatePath(ADMIN_PATH);
  return { success: true };
}

export async function createLegendCard(
  displayName: string,
): Promise<{ cardId: string } | { error: string }> {
  const adminCheck = await assertAdmin();
  if ("error" in adminCheck) {
    return adminCheck;
  }

  const name = displayName.trim();
  if (!name) {
    return { error: "Name required" };
  }

  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("cards")
    .select("sort_order")
    .eq("is_legend", true)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const sortOrder = (existing?.sort_order ?? 1000) + 1;

  const { data, error } = await supabase
    .from("cards")
    .insert({
      is_legend: true,
      display_name: name,
      rarity: "legendary",
      sort_order: sortOrder,
      team_id: null,
      player_id: null,
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  revalidatePath(CARDS_PATH);
  revalidatePath(ADMIN_PATH);
  return { cardId: data.id };
}

export async function updateLegendCardName(
  cardId: string,
  displayName: string,
): Promise<{ success: true } | { error: string }> {
  const adminCheck = await assertAdmin();
  if ("error" in adminCheck) {
    return adminCheck;
  }

  const name = displayName.trim();
  if (!name) {
    return { error: "Name required" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("cards")
    .update({ display_name: name, updated_at: new Date().toISOString() })
    .eq("id", cardId)
    .eq("is_legend", true);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(CARDS_PATH);
  revalidatePath(ADMIN_PATH);
  return { success: true };
}

export async function deleteLegendCard(
  cardId: string,
): Promise<{ success: true } | { error: string }> {
  const adminCheck = await assertAdmin();
  if ("error" in adminCheck) {
    return adminCheck;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("cards")
    .update({ is_active: false, updated_at: new Date().toISOString() })
    .eq("id", cardId)
    .eq("is_legend", true);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(CARDS_PATH);
  revalidatePath(ADMIN_PATH);
  return { success: true };
}

export async function uploadLegendCardPhoto(
  cardId: string,
  formData: FormData,
): Promise<{ imageUrl: string } | { error: string }> {
  return uploadCardPhoto(cardId, formData);
}

export async function uploadCardPhoto(
  cardId: string,
  formData: FormData,
): Promise<{ imageUrl: string } | { error: string }> {
  const adminCheck = await assertAdmin();
  if ("error" in adminCheck) {
    return adminCheck;
  }

  const file = formData.get("photo");
  if (!(file instanceof File)) {
    return { error: "Choose an image" };
  }

  if (file.size > MAX_IMAGE_BYTES) {
    return { error: "Image too large" };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  let webp: Buffer;

  try {
    webp = await sharp(buffer)
      .rotate()
      .resize(512, 768, { fit: "cover" })
      .webp({ quality: 85 })
      .toBuffer();
  } catch {
    return { error: "Failed to process image" };
  }

  const supabase = await createClient();
  const { data: card, error: cardError } = await supabase
    .from("cards")
    .select("id")
    .eq("id", cardId)
    .eq("is_active", true)
    .maybeSingle();

  if (cardError || !card) {
    return { error: "Card not found" };
  }

  const admin = createAdminClient();
  // New paths avoid serving an old card image from the storage CDN.
  const path = `cards/${cardId}/${Date.now()}.webp`;

  const { error: uploadError } = await admin.storage
    .from(CARD_ART_BUCKET)
    .upload(path, webp, {
      contentType: "image/webp",
    });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const imageUrl = getPublicCardArtUrl(path);

  const { error } = await supabase
    .from("cards")
    .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
    .eq("id", cardId)
    .eq("is_active", true);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(CARDS_PATH);
  revalidatePath(ADMIN_PATH);
  return { imageUrl };
}

export async function getLegendsTeamLabel(): Promise<string> {
  return LEGENDS_TEAM_NAME;
}
