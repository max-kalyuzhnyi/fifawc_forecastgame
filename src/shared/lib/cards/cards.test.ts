import { describe, expect, it } from "vitest";
import { drawCardsFromPack } from "@/shared/lib/cards/drawCard";
import { evaluateDailyPackGrants } from "@/shared/lib/cards/earnPacks";

describe("evaluateDailyPackGrants", () => {
  it("grants cumulative packs for a perfect day", () => {
    const grants = evaluateDailyPackGrants({
      matches: [
        {
          id: "m1",
          kickoffAt: "2026-06-15T18:00:00.000Z",
          status: "finished",
          homeScore: 2,
          awayScore: 1,
        },
      ],
      predictions: [
        {
          matchId: "m1",
          homeScore: 2,
          awayScore: 1,
          scorerName: "Messi",
          boostMultiplier: 2,
        },
      ],
      scorersByMatch: { m1: ["Messi"] },
      todayKey: "2026-06-16",
    });

    expect(grants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reason: "daily_picks", size: 3 }),
        expect.objectContaining({ reason: "scored", size: 5 }),
        expect.objectContaining({ reason: "boost_scorer", size: 7 }),
      ]),
    );
  });
});

describe("drawCardsFromPack", () => {
  const catalog = [
    { id: "c1", rarity: "common" as const },
    { id: "c2", rarity: "common" as const },
    { id: "l1", rarity: "legendary" as const },
  ];

  it("returns the requested number of card ids", () => {
    const drawn = drawCardsFromPack(catalog, new Set(), 5, () => 0.1);
    expect(drawn).toHaveLength(5);
  });
});
