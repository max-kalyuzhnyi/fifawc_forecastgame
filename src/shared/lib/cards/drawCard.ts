import {
  RARITY_DRAW_PROBABILITIES,
  UNOWNED_PITY_WEIGHT,
} from "@/shared/lib/cards/config";
import type { CardRarity } from "@/shared/types/database";

export interface DrawableCard {
  id: string;
  rarity: CardRarity;
}

function rollRarity(random: () => number): CardRarity {
  const roll = random();
  let cumulative = 0;
  const order: CardRarity[] = ["common", "rare", "legendary"];

  for (const rarity of order) {
    cumulative += RARITY_DRAW_PROBABILITIES[rarity];
    if (roll < cumulative) {
      return rarity;
    }
  }

  return "common";
}

function pickWeightedCard(
  pool: DrawableCard[],
  ownedCardIds: Set<string>,
  random: () => number,
): DrawableCard | null {
  if (pool.length === 0) {
    return null;
  }

  const weights = pool.map((card) =>
    ownedCardIds.has(card.id) ? 1 : UNOWNED_PITY_WEIGHT,
  );
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let roll = random() * total;

  for (let index = 0; index < pool.length; index += 1) {
    roll -= weights[index] ?? 0;
    if (roll <= 0) {
      return pool[index] ?? null;
    }
  }

  return pool[pool.length - 1] ?? null;
}

export function drawCardsFromPack(
  catalog: DrawableCard[],
  ownedCardIds: Set<string>,
  packSize: number,
  random: () => number = Math.random,
): string[] {
  const drawn: string[] = [];
  const owned = new Set(ownedCardIds);

  for (let slot = 0; slot < packSize; slot += 1) {
    const rarity = rollRarity(random);
    let pool = catalog.filter((card) => card.rarity === rarity);

    if (pool.length === 0) {
      pool = catalog;
    }

    const picked = pickWeightedCard(pool, owned, random);
    if (!picked) {
      continue;
    }

    drawn.push(picked.id);
    owned.add(picked.id);
  }

  return drawn;
}
