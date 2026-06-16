import { redirect } from "next/navigation";
import { CardsView } from "@/features/cards/ui/CardsView";
import { syncEarnedPacks } from "@/features/cards/actions";
import type { CatalogCard, GiftRequestEntry, UnseenGiftEntry } from "@/shared/lib/cards/types";
import { REQUEST_COOLDOWN_MS } from "@/shared/lib/cards/config";
import {
  getCurrentUserId,
  isCardsEnabledForCurrentUser,
} from "@/shared/lib/auth";
import { createClient } from "@/shared/lib/supabase/server";
import type { CardRarity } from "@/shared/types/database";

function mapCatalogRow(
  row: {
    id: string;
    player_id: string | null;
    team_id: string | null;
    is_legend: boolean;
    display_name: string;
    image_url: string | null;
    rarity: CardRarity;
    sort_order: number;
  },
  teamNameById: Map<string, string>,
  playerPhotoById: Map<string, string | null>,
): CatalogCard {
  return {
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
  };
}

export default async function CardsPage() {
  if (!(await isCardsEnabledForCurrentUser())) {
    redirect("/matches");
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    redirect("/login");
  }

  await syncEarnedPacks();

  const supabase = await createClient();

  const [
    { data: catalogRows },
    { data: teams },
    { data: players },
    { data: inventory },
    { data: packs },
    { data: requests },
    { data: unseenGifts },
    { data: ownOpenRequests },
    { data: latestOwnRequest },
    { data: profiles },
  ] = await Promise.all([
    supabase
      .from("cards")
      .select(
        "id, player_id, team_id, is_legend, display_name, image_url, rarity, sort_order",
      )
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase.from("teams").select("id, name"),
    supabase.from("players").select("id, photo_url"),
    supabase
      .from("user_cards")
      .select("card_id, count, first_obtained_at")
      .eq("user_id", userId),
    supabase
      .from("card_packs")
      .select("id, reason, size, status, source_day, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
    supabase
      .from("card_gift_requests")
      .select("id, requester_user_id, card_id, created_at")
      .eq("status", "open")
      .order("created_at", { ascending: false }),
    supabase
      .from("card_gifts")
      .select("id, card_id, from_user_id")
      .eq("to_user_id", userId)
      .eq("seen_by_recipient", false)
      .order("created_at", { ascending: true }),
    supabase
      .from("card_gift_requests")
      .select("card_id")
      .eq("requester_user_id", userId)
      .eq("status", "open"),
    supabase
      .from("card_gift_requests")
      .select("created_at")
      .eq("requester_user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from("profiles").select("id, display_name"),
  ]);

  const profileById = new Map(
    (profiles ?? []).map((profile) => [profile.id, profile.display_name]),
  );

  const teamNameById = new Map((teams ?? []).map((team) => [team.id, team.name]));
  const playerPhotoById = new Map(
    (players ?? []).map((player) => [player.id, player.photo_url]),
  );

  const catalog = (catalogRows ?? []).map((row) =>
    mapCatalogRow(row, teamNameById, playerPhotoById),
  );
  const catalogById = new Map(catalog.map((card) => [card.id, card]));

  const giftRequests: GiftRequestEntry[] = (requests ?? []).map((request) => ({
    id: request.id,
    requesterUserId: request.requester_user_id,
    requesterName: profileById.get(request.requester_user_id) ?? "User",
    cardId: request.card_id,
    createdAt: request.created_at,
  }));

  const unseen: UnseenGiftEntry[] = (unseenGifts ?? [])
    .map((gift) => {
      const card = catalogById.get(gift.card_id);
      if (!card) return null;
      return {
        id: gift.id,
        cardId: gift.card_id,
        fromUserId: gift.from_user_id,
        fromUserName: profileById.get(gift.from_user_id) ?? "User",
        card,
      };
    })
    .filter((gift): gift is UnseenGiftEntry => gift != null);

  const nextRequestAt =
    latestOwnRequest &&
    new Date(latestOwnRequest.created_at).getTime() + REQUEST_COOLDOWN_MS >
      Date.now()
      ? new Date(
          new Date(latestOwnRequest.created_at).getTime() + REQUEST_COOLDOWN_MS,
        ).toISOString()
      : null;

  return (
    <CardsView
      catalog={catalog}
      inventory={(inventory ?? []).map((entry) => ({
        cardId: entry.card_id,
        count: entry.count,
        firstObtainedAt: entry.first_obtained_at,
      }))}
      packs={(packs ?? []).map((pack) => ({
        id: pack.id,
        reason: pack.reason,
        size: pack.size,
        status: pack.status,
        sourceDay: pack.source_day,
        createdAt: pack.created_at,
      }))}
      requests={giftRequests}
      unseenGifts={unseen}
      currentUserId={userId}
      openRequestCardIds={(ownOpenRequests ?? []).map((row) => row.card_id)}
      nextRequestAt={nextRequestAt}
    />
  );
}
