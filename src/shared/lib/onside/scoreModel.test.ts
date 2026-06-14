import { describe, expect, it } from "vitest";
import { suggestScorelines } from "@/shared/lib/onside/scoreModel";
import type { OnsideMatchPrediction } from "@/shared/lib/onside/types";

function makePrediction(
  probability: { home: number; draw: number; away: number },
): OnsideMatchPrediction {
  return {
    home: {
      code: "bra",
      name: "Brazil",
      rank: 6,
      confederation: "CONMEBOL",
    },
    away: {
      code: "mar",
      name: "Morocco",
      rank: 8,
      confederation: "CAF",
    },
    probability,
    favourite: "bra",
    underdog: "mar",
    upset_watch: false,
    confidence: "narrow",
  };
}

describe("suggestScorelines", () => {
  it("normalizes probabilities that do not sum to 100", () => {
    const suggestions = suggestScorelines(
      makePrediction({ home: 44, draw: 26, away: 30 }),
    );

    expect(suggestions).toHaveLength(3);
    expect(suggestions.map((item) => item.outcome).sort()).toEqual([
      "away",
      "draw",
      "home",
    ]);
    expect(
      suggestions.reduce((sum, item) => sum + item.outcomeProbability, 0),
    ).toBe(100);
  });

  it("returns a clear home favourite first with a home win scoreline", () => {
    const suggestions = suggestScorelines(
      makePrediction({ home: 70, draw: 20, away: 10 }),
    );

    expect(suggestions[0]?.outcome).toBe("home");
    expect(suggestions[0]?.home).toBeGreaterThan(suggestions[0]?.away ?? 0);
  });

  it("keeps draw among the top suggestions for balanced probabilities", () => {
    const suggestions = suggestScorelines(
      makePrediction({ home: 33, draw: 34, away: 33 }),
    );

    expect(suggestions.some((item) => item.outcome === "draw")).toBe(true);
    expect(suggestions.find((item) => item.outcome === "draw")?.home).toBe(
      suggestions.find((item) => item.outcome === "draw")?.away,
    );
  });

  it("returns three unique outcomes with scores in range", () => {
    const suggestions = suggestScorelines(
      makePrediction({ home: 44, draw: 26, away: 30 }),
    );

    expect(new Set(suggestions.map((item) => item.outcome)).size).toBe(3);

    for (const suggestion of suggestions) {
      expect(suggestion.home).toBeGreaterThanOrEqual(0);
      expect(suggestion.home).toBeLessThanOrEqual(6);
      expect(suggestion.away).toBeGreaterThanOrEqual(0);
      expect(suggestion.away).toBeLessThanOrEqual(6);

      if (suggestion.outcome === "home") {
        expect(suggestion.home).toBeGreaterThan(suggestion.away);
      } else if (suggestion.outcome === "draw") {
        expect(suggestion.home).toBe(suggestion.away);
      } else {
        expect(suggestion.home).toBeLessThan(suggestion.away);
      }
    }
  });
});
