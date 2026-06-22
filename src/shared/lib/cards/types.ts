import type { CardRarity } from "@/shared/types/database";

export interface CatalogCard {
  id: string;
  playerId: string | null;
  teamId: string | null;
  teamName: string | null;
  isLegend: boolean;
  displayName: string;
  imageUrl: string | null;
  isFullCardArt?: boolean;
  rarity: CardRarity;
  sortOrder: number;
}

export interface UserCardEntry {
  cardId: string;
  count: number;
  firstObtainedAt: string;
}

export interface CardPackEntry {
  id: string;
  reason: string;
  size: number;
  status: "unopened" | "opened";
  sourceDay: string | null;
  createdAt: string;
}

export interface GiftRequestEntry {
  id: string;
  requesterUserId: string;
  requesterName: string;
  cardId: string;
  createdAt: string;
}

export interface UnseenGiftEntry {
  id: string;
  cardId: string;
  fromUserId: string;
  fromUserName: string;
  card: CatalogCard;
}
