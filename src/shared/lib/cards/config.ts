import type { CardPackReason, CardRarity } from "@/shared/types/database";

/** 12 top national teams in the card set */
export const CARD_TEAMS = [
  "Brazil",
  "Argentina",
  "France",
  "England",
  "Spain",
  "Germany",
  "Portugal",
  "Netherlands",
  "USA",
  "Mexico",
  "Croatia",
  "Belgium",
] as const;

export const PLAYERS_PER_TEAM = 11;

/** Per-team rarity split: 6 common, 3 rare, 2 legendary */
export const TEAM_RARITY_SPLIT: Record<CardRarity, number> = {
  common: 6,
  rare: 3,
  legendary: 2,
};

/** Pack sizes for earnable reasons (exchange tiers use EXCHANGE_TIERS) */
export const PACK_SIZES: Record<
  Exclude<CardPackReason, "exchange_3" | "exchange_5" | "scored" | "boost_scorer">,
  number
> = {
  welcome: 5,
  daily_picks: 3,
  exact_score: 5,
  goalscorer: 2,
};

export const EXCHANGE_TIERS = {
  exchange_3: { duplicatesRequired: 3, packSize: 5 },
  exchange_5: { duplicatesRequired: 5, packSize: 10 },
} as const;

/** Rarity roll probabilities when opening a pack (must sum to 1) */
export const RARITY_DRAW_PROBABILITIES: Record<CardRarity, number> = {
  common: 0.68,
  rare: 0.27,
  legendary: 0.05,
};

/** Extra weight multiplier for cards the user does not own yet */
export const UNOWNED_PITY_WEIGHT = 4;

export const LEGENDS_TEAM_NAME = "Legends OTB";

/** Max simultaneous open card gift requests per user */
export const MAX_OPEN_CARD_REQUESTS = 3;
