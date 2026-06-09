import { describe, expect, it } from "vitest";
import { calculateLeaderboard } from "./calculateLeaderboard";

describe("calculateLeaderboard", () => {
  it("ranks users by total points from finished matches", () => {
    const profiles = [
      { id: "u1", display_name: "Alice" },
      { id: "u2", display_name: "Bob" },
    ];

    const predictions = [
      {
        user_id: "u1",
        match_id: "m1",
        display_name: "Alice",
        home_score: 2,
        away_score: 1,
        scorer_name: null,
        boost_multiplier: 1 as const,
      },
      {
        user_id: "u2",
        match_id: "m1",
        display_name: "Bob",
        home_score: 0,
        away_score: 2,
        scorer_name: null,
        boost_multiplier: 1 as const,
      },
    ];

    const matches = {
      m1: { home_score: 2, away_score: 1, scorers: [] },
    };

    const result = calculateLeaderboard(profiles, predictions, matches);
    expect(result[0].display_name).toBe("Alice");
    expect(result[0].total_points).toBe(3);
    expect(result[1].total_points).toBe(0);
  });
});
