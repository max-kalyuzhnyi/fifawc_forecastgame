import { describe, expect, it } from "vitest";
import { drawCardsFromPack } from "@/shared/lib/cards/drawCard";
import {
  evaluateDailyPackGrants,
  selectSyncPackGrants,
} from "@/shared/lib/cards/earnPacks";

describe("evaluateDailyPackGrants", () => {
  it("grants daily, exact score, and goalscorer packs for a perfect match", () => {
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
        expect.objectContaining({
          reason: "exact_score",
          size: 5,
          sourceMatchId: "m1",
        }),
        expect.objectContaining({
          reason: "goalscorer",
          size: 2,
          sourceMatchId: "m1",
        }),
      ]),
    );
  });

  it("grants only goalscorer when result is wrong but scorer hits", () => {
    const grants = evaluateDailyPackGrants({
      matches: [
        {
          id: "m2",
          kickoffAt: "2026-06-15T18:00:00.000Z",
          status: "finished",
          homeScore: 2,
          awayScore: 1,
        },
      ],
      predictions: [
        {
          matchId: "m2",
          homeScore: 1,
          awayScore: 0,
          scorerName: "Messi",
          boostMultiplier: 1,
        },
      ],
      scorersByMatch: { m2: ["Messi"] },
      todayKey: "2026-06-16",
    });

    expect(grants).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          reason: "goalscorer",
          size: 2,
          sourceMatchId: "m2",
        }),
      ]),
    );
    expect(grants.some((grant) => grant.reason === "exact_score")).toBe(false);
  });

  it("does not backfill packs for matches before card eligibility", () => {
    const grants = evaluateDailyPackGrants({
      matches: [
        {
          id: "old-match",
          kickoffAt: "2026-06-15T18:00:00.000Z",
          status: "finished",
          homeScore: 2,
          awayScore: 1,
        },
      ],
      predictions: [
        {
          matchId: "old-match",
          homeScore: 2,
          awayScore: 1,
          scorerName: "Messi",
          boostMultiplier: 2,
        },
      ],
      scorersByMatch: { "old-match": ["Messi"] },
      eligibleFrom: "2026-06-16T00:00:00.000Z",
      todayKey: "2026-06-16",
    });

    expect(grants).toEqual([]);
  });
});

describe("selectSyncPackGrants", () => {
  it("keeps daily packs blocked while one is unopened", () => {
    const grants = selectSyncPackGrants(
      [
        { reason: "daily_picks", sourceDay: "2026-06-15", size: 3 },
        { reason: "exact_score", sourceMatchId: "m1", size: 5 },
      ],
      { hasUnopenedDaily: true },
    );

    expect(grants).toEqual([
      { reason: "exact_score", sourceMatchId: "m1", size: 5 },
    ]);
  });

  it("allows only the next daily pack when none is unopened", () => {
    const grants = selectSyncPackGrants(
      [
        { reason: "daily_picks", sourceDay: "2026-06-16", size: 3 },
        { reason: "daily_picks", sourceDay: "2026-06-15", size: 3 },
      ],
      { hasUnopenedDaily: false },
    );

    expect(grants).toEqual([
      { reason: "daily_picks", sourceDay: "2026-06-15", size: 3 },
    ]);
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
