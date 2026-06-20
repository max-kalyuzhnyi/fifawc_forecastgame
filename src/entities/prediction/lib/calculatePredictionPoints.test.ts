import { describe, expect, it } from "vitest";
import { calculatePredictionPoints } from "./calculatePredictionPoints";

describe("calculatePredictionPoints", () => {
  it("awards 3 for exact score", () => {
    const result = calculatePredictionPoints({
      predictedHome: 2,
      predictedAway: 1,
      actualHome: 2,
      actualAway: 1,
      predictedScorer: null,
      actualScorers: [],
      boostMultiplier: 1,
    });
    expect(result.basePoints).toBe(3);
    expect(result.totalPoints).toBe(3);
  });

  it("awards 2 for correct goal difference", () => {
    const result = calculatePredictionPoints({
      predictedHome: 3,
      predictedAway: 2,
      actualHome: 1,
      actualAway: 0,
      predictedScorer: null,
      actualScorers: [],
      boostMultiplier: 1,
    });
    expect(result.basePoints).toBe(2);
  });

  it("awards 1 for correct result only", () => {
    const result = calculatePredictionPoints({
      predictedHome: 2,
      predictedAway: 0,
      actualHome: 1,
      actualAway: 0,
      predictedScorer: null,
      actualScorers: [],
      boostMultiplier: 1,
    });
    expect(result.basePoints).toBe(1);
  });

  it("adds scorer bonus and applies boost", () => {
    const result = calculatePredictionPoints({
      predictedHome: 2,
      predictedAway: 1,
      actualHome: 2,
      actualAway: 1,
      predictedScorer: "Mbappe",
      actualScorers: ["mbappe"],
      boostMultiplier: 2,
    });
    expect(result.basePoints).toBe(3);
    expect(result.scorerBonus).toBe(2);
    expect(result.totalPoints).toBe(10);
  });

  it("applies x2 boost to zero points", () => {
    const result = calculatePredictionPoints({
      predictedHome: 0,
      predictedAway: 2,
      actualHome: 3,
      actualAway: 1,
      predictedScorer: null,
      actualScorers: [],
      boostMultiplier: 2,
    });
    expect(result.totalPoints).toBe(0);
  });

  it("matches scorer bonus by player id when names differ", () => {
    const result = calculatePredictionPoints({
      predictedHome: 2,
      predictedAway: 1,
      actualHome: 3,
      actualAway: 1,
      predictedScorer: "K. Mbappé",
      predictedScorerPlayerId: "player-1",
      actualScorers: ["Kylian Mbappé"],
      actualScorerPlayerIds: ["player-1"],
      boostMultiplier: 1,
    });
    expect(result.scorerBonus).toBe(2);
    expect(result.totalPoints).toBe(3);
  });

  it("matches scorer bonus when diacritics differ (Vinícius Júnior vs Vinicius Junior)", () => {
    const result = calculatePredictionPoints({
      predictedHome: 3,
      predictedAway: 0,
      actualHome: 3,
      actualAway: 0,
      predictedScorer: "Vinícius Júnior",
      predictedScorerPlayerId: "499b188f-2130-41e6-be7c-a0ca54022ebd",
      actualScorers: ["Matheus Cunha", "Vinicius Junior"],
      actualScorerPlayerIds: ["7e290d1e-ef45-4f7a-af51-0c960ee23681"],
      boostMultiplier: 1,
    });
    expect(result.scorerBonus).toBe(2);
    expect(result.totalPoints).toBe(5);
  });

  it("falls back to name match when player id is missing from actual scorers", () => {
    const result = calculatePredictionPoints({
      predictedHome: 3,
      predictedAway: 0,
      actualHome: 3,
      actualAway: 0,
      predictedScorer: "Vinícius Júnior",
      predictedScorerPlayerId: "499b188f-2130-41e6-be7c-a0ca54022ebd",
      actualScorers: ["Matheus Cunha", "Vinicius Junior"],
      actualScorerPlayerIds: ["7e290d1e-ef45-4f7a-af51-0c960ee23681"],
      boostMultiplier: 2,
    });
    expect(result.scorerBonus).toBe(2);
    expect(result.totalPoints).toBe(10);
  });
});
