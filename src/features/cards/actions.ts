"use server";

import { revalidatePath } from "next/cache";
import { drawCardsFromPack } from "@/shared/lib/cards/drawCard";
import {
  buildScorersByMatch,
  countTotalDuplicates,
  evaluateDailyPackGrants,
} from "@/shared/lib/cards/earnPacks";
import { EXCHANGE_TIERS, REQUEST_COOLDOWN_MS } from "@/shared/lib/cards/config";
import type { CatalogCard } from "@/shared/lib/cards/types";
import {
  getCurrentUserId,
  getCurrentUserTelegramId,
  isCardsEnabledForCurrentUser,
} from "@/shared/lib/auth";
import { cardsEnabledForTelegramId } from "@/shared/lib/cards/featureFlag";
import { createClient } from "@/shared/lib/supabase/server";

const CARDS_PATH = "/cards";

async function assertCardsAccess(): Promise<
  { userId: string } | { error: string }
> {
  const userId = await getCurrentUserId();
  if (!userId) {
    return { error: "Not authenticated" };
  }

  const telegramId = await getCurrentUserTelegramId();
  if (!cardsEnabledForTelegramId(telegramId)) {
    return { error: "Cards feature not available" };
  }

  return { userId };
}

async function loadActiveCatalog(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<CatalogCard[]> {
  const [{ data, error }, { data: teams }, { data: players }] = await Promise.all([
    supabase
      .from("cards")
      .select(
        "id, player_id, team_id, is_legend, display_name, image_url, rarity, sort_order",
      )
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase.from("teams").select("id, name"),
    supabase.from("players").select("id, photo_url"),
  ]);

  if (error) {
    throw new Error(error.message);
  }

  const teamNameById = new Map((teams ?? []).map((team) => [team.id, team.name]));
  const playerPhotoById = new Map(
    (players ?? []).map((player) => [player.id, player.photo_url]),
  );

  return (data ?? []).map((row) => ({
    id: row.id,
    playerId: row.player_id,
    teamId: row.team_id,
    teamName: row.is_legend
      ? "Legends OTB"
      : (row.team_id ? teamNameById.get(row.team_id) ?? null : null),
    isLegend: row.is_legend,
    displayName: row.display_name,
    imageUrl: row.is_legend
      ? row.image_url
      : (row.image_url ??
        (row.player_id ? playerPhotoById.get(row.player_id) ?? null : null)),
    rarity: row.rarity,
    sortOrder: row.sort_order,
  }));
}

async function incrementUserCards(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  cardIds: string[],
): Promise<void> {
  const now = new Date().toISOString();

  for (const cardId of cardIds) {
    const { data: existing } = await supabase
      .from("user_cards")
      .select("count")
      .eq("user_id", userId)
      .eq("card_id", cardId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("user_cards")
        .update({
          count: existing.count + 1,
          last_obtained_at: now,
        })
        .eq("user_id", userId)
        .eq("card_id", cardId);

      if (error) {
        throw new Error(error.message);
      }
    } else {
      const { error } = await supabase.from("user_cards").insert({
        user_id: userId,
        card_id: cardId,
        count: 1,
        first_obtained_at: now,
        last_obtained_at: now,
      });

      if (error) {
        throw new Error(error.message);
      }
    }
  }
}

async function consumeDuplicates(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  amount: number,
): Promise<void> {
  const { data: inventory, error } = await supabase
    .from("user_cards")
    .select("card_id, count")
    .eq("user_id", userId)
    .gt("count", 1)
    .order("count", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  let remaining = amount;

  for (const entry of inventory ?? []) {
    if (remaining <= 0) {
      break;
    }

    const duplicates = entry.count - 1;
    const toConsume = Math.min(duplicates, remaining);
    const newCount = entry.count - toConsume;

    const { error: updateError } = await supabase
      .from("user_cards")
      .update({ count: newCount })
      .eq("user_id", userId)
      .eq("card_id", entry.card_id);

    if (updateError) {
      throw new Error(updateError.message);
    }

    remaining -= toConsume;
  }

  if (remaining > 0) {
    throw new Error("Not enough duplicates");
  }
}

export async function syncEarnedPacks(): Promise<{ granted: number } | { error: string }> {
  const access = await assertCardsAccess();
  if ("error" in access) {
    return access;
  }

  const { userId } = access;
  const supabase = await createClient();

  const [{ data: matches }, { data: predictions }, { data: events }] =
    await Promise.all([
      supabase
        .from("matches")
        .select("id, kickoff_at, status, home_score, away_score"),
      supabase
        .from("predictions")
        .select(
          "match_id, home_score, away_score, scorer_name, boost_multiplier",
        )
        .eq("user_id", userId),
      supabase
        .from("match_events")
        .select("match_id, type, player_name")
        .in("type", ["goal", "penalty"]),
    ]);

  const scorersByMatch = buildScorersByMatch(
    (events ?? []).map((event) => ({
      matchId: event.match_id,
      type: event.type,
      playerName: event.player_name,
    })),
  );

  const grants = evaluateDailyPackGrants({
    matches: (matches ?? []).map((match) => ({
      id: match.id,
      kickoffAt: match.kickoff_at,
      status: match.status,
      homeScore: match.home_score,
      awayScore: match.away_score,
    })),
    predictions: (predictions ?? []).map((prediction) => ({
      matchId: prediction.match_id,
      homeScore: prediction.home_score,
      awayScore: prediction.away_score,
      scorerName: prediction.scorer_name,
      boostMultiplier: prediction.boost_multiplier,
    })),
    scorersByMatch,
  });

  let granted = 0;

  for (const grant of grants) {
    const { error } = await supabase.from("card_packs").insert({
      user_id: userId,
      reason: grant.reason,
      size: grant.size,
      source_day: grant.sourceDay,
      status: "unopened",
    });

    if (!error) {
      granted += 1;
    }
  }

  if (granted > 0) {
    revalidatePath(CARDS_PATH);
  }

  return { granted };
}

export async function openPack(
  packId: string,
): Promise<
  | { cards: CatalogCard[] }
  | { error: string }
> {
  const access = await assertCardsAccess();
  if ("error" in access) {
    return access;
  }

  const { userId } = access;
  const supabase = await createClient();

  const { data: pack, error: packError } = await supabase
    .from("card_packs")
    .select("id, size, status")
    .eq("id", packId)
    .eq("user_id", userId)
    .maybeSingle();

  if (packError) {
    return { error: packError.message };
  }

  if (!pack) {
    return { error: "Pack not found" };
  }

  if (pack.status === "opened") {
    return { error: "Pack already opened" };
  }

  const catalog = await loadActiveCatalog(supabase);
  const { data: inventory } = await supabase
    .from("user_cards")
    .select("card_id")
    .eq("user_id", userId);

  const ownedIds = new Set((inventory ?? []).map((entry) => entry.card_id));
  const drawnIds = drawCardsFromPack(
    catalog.map((card) => ({ id: card.id, rarity: card.rarity })),
    ownedIds,
    pack.size,
  );

  await incrementUserCards(supabase, userId, drawnIds);

  const { error: openError } = await supabase
    .from("card_packs")
    .update({
      status: "opened",
      opened_at: new Date().toISOString(),
    })
    .eq("id", packId)
    .eq("user_id", userId);

  if (openError) {
    return { error: openError.message };
  }

  const catalogById = new Map(catalog.map((card) => [card.id, card]));
  const cards = drawnIds
    .map((id) => catalogById.get(id))
    .filter((card): card is CatalogCard => card != null);

  revalidatePath(CARDS_PATH);
  return { cards };
}

export async function exchangeDuplicates(
  tier: "exchange_3" | "exchange_5",
): Promise<{ packId: string } | { error: string }> {
  const access = await assertCardsAccess();
  if ("error" in access) {
    return access;
  }

  const { userId } = access;
  const config = EXCHANGE_TIERS[tier];
  const supabase = await createClient();

  const { data: inventory, error: inventoryError } = await supabase
    .from("user_cards")
    .select("card_id, count")
    .eq("user_id", userId);

  if (inventoryError) {
    return { error: inventoryError.message };
  }

  const totalDuplicates = countTotalDuplicates(inventory ?? []);
  if (totalDuplicates < config.duplicatesRequired) {
    return { error: "Not enough duplicates" };
  }

  try {
    await consumeDuplicates(supabase, userId, config.duplicatesRequired);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Exchange failed",
    };
  }

  const { data: pack, error: packError } = await supabase
    .from("card_packs")
    .insert({
      user_id: userId,
      reason: tier,
      size: config.packSize,
      status: "unopened",
    })
    .select("id")
    .single();

  if (packError) {
    return { error: packError.message };
  }

  revalidatePath(CARDS_PATH);
  return { packId: pack.id };
}

export async function createCardRequest(
  cardId: string,
): Promise<
  | { success: true }
  | { error: string; nextAvailableAt?: string }
> {
  const access = await assertCardsAccess();
  if ("error" in access) {
    return access;
  }

  const { userId } = access;
  const supabase = await createClient();

  const { data: lastRequest } = await supabase
    .from("card_gift_requests")
    .select("created_at")
    .eq("requester_user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (lastRequest) {
    const nextAvailableAt = new Date(
      new Date(lastRequest.created_at).getTime() + REQUEST_COOLDOWN_MS,
    );
    if (Date.now() < nextAvailableAt.getTime()) {
      return {
        error: "Request cooldown active",
        nextAvailableAt: nextAvailableAt.toISOString(),
      };
    }
  }

  const { data: owned } = await supabase
    .from("user_cards")
    .select("card_id")
    .eq("user_id", userId)
    .eq("card_id", cardId)
    .maybeSingle();

  if (owned) {
    return { error: "You already own this card" };
  }

  const { error } = await supabase.from("card_gift_requests").insert({
    requester_user_id: userId,
    card_id: cardId,
    status: "open",
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath(CARDS_PATH);
  return { success: true };
}

export async function cancelCardRequest(
  requestId: string,
): Promise<{ success: true } | { error: string }> {
  const access = await assertCardsAccess();
  if ("error" in access) {
    return access;
  }

  const { userId } = access;
  const supabase = await createClient();

  const { error } = await supabase
    .from("card_gift_requests")
    .update({ status: "cancelled" })
    .eq("id", requestId)
    .eq("requester_user_id", userId)
    .eq("status", "open");

  if (error) {
    return { error: error.message };
  }

  revalidatePath(CARDS_PATH);
  return { success: true };
}

export async function fulfillCardRequest(
  requestId: string,
): Promise<{ success: true } | { error: string }> {
  const access = await assertCardsAccess();
  if ("error" in access) {
    return access;
  }

  const { userId } = access;
  const supabase = await createClient();

  const { data: request, error: requestError } = await supabase
    .from("card_gift_requests")
    .select("id, requester_user_id, card_id, status")
    .eq("id", requestId)
    .maybeSingle();

  if (requestError) {
    return { error: requestError.message };
  }

  if (!request || request.status !== "open") {
    return { error: "Request not found" };
  }

  if (request.requester_user_id === userId) {
    return { error: "Cannot fulfill your own request" };
  }

  const { data: giverCard } = await supabase
    .from("user_cards")
    .select("count")
    .eq("user_id", userId)
    .eq("card_id", request.card_id)
    .maybeSingle();

  if (!giverCard || giverCard.count < 2) {
    return { error: "You need a duplicate to gift" };
  }

  const now = new Date().toISOString();

  const { error: decrementError } = await supabase
    .from("user_cards")
    .update({ count: giverCard.count - 1 })
    .eq("user_id", userId)
    .eq("card_id", request.card_id);

  if (decrementError) {
    return { error: decrementError.message };
  }

  const { data: recipientCard } = await supabase
    .from("user_cards")
    .select("count")
    .eq("user_id", request.requester_user_id)
    .eq("card_id", request.card_id)
    .maybeSingle();

  if (recipientCard) {
    const { error } = await supabase
      .from("user_cards")
      .update({
        count: recipientCard.count + 1,
        last_obtained_at: now,
      })
      .eq("user_id", request.requester_user_id)
      .eq("card_id", request.card_id);

    if (error) {
      return { error: error.message };
    }
  } else {
    const { error } = await supabase.from("user_cards").insert({
      user_id: request.requester_user_id,
      card_id: request.card_id,
      count: 1,
      first_obtained_at: now,
      last_obtained_at: now,
    });

    if (error) {
      return { error: error.message };
    }
  }

  const { error: giftError } = await supabase.from("card_gifts").insert({
    from_user_id: userId,
    to_user_id: request.requester_user_id,
    card_id: request.card_id,
    request_id: request.id,
    seen_by_recipient: false,
  });

  if (giftError) {
    return { error: giftError.message };
  }

  const { error: fulfillError } = await supabase
    .from("card_gift_requests")
    .update({
      status: "fulfilled",
      fulfilled_by: userId,
      fulfilled_at: now,
    })
    .eq("id", requestId);

  if (fulfillError) {
    return { error: fulfillError.message };
  }

  revalidatePath(CARDS_PATH);
  return { success: true };
}

export async function markGiftSeen(
  giftId: string,
): Promise<{ success: true } | { error: string }> {
  const access = await assertCardsAccess();
  if ("error" in access) {
    return access;
  }

  const { userId } = access;
  const supabase = await createClient();

  const { error } = await supabase
    .from("card_gifts")
    .update({ seen_by_recipient: true })
    .eq("id", giftId)
    .eq("to_user_id", userId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath(CARDS_PATH);
  return { success: true };
}

export async function getCardsEnabled(): Promise<boolean> {
  return isCardsEnabledForCurrentUser();
}
