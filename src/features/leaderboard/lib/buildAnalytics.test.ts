import { describe, expect, it } from "vitest";
import { buildLeaderboardAnalytics } from "./buildAnalytics";

describe("buildLeaderboardAnalytics", () => {
  const profiles = [
    { id: "user-a", display_name: "Alice", photo_url: null },
    { id: "user-b", display_name: "Bob", photo_url: null },
  ];

  it("computes overall and per-stage points from forecast scoring", () => {
    const analytics = buildLeaderboardAnalytics({
      matches: [
        {
          id: "m1",
          round_key: "group_1",
          status: "finished",
          home_score: 2,
          away_score: 1,
        },
        {
          id: "m2",
          round_key: "group_2",
          status: "finished",
          home_score: 0,
          away_score: 0,
        },
      ],
      predictions: [
        {
          user_id: "user-a",
          match_id: "m1",
          home_score: 2,
          away_score: 1,
          scorer_name: null,
          boost_multiplier: 1,
        },
        {
          user_id: "user-b",
          match_id: "m1",
          home_score: 1,
          away_score: 1,
          scorer_name: null,
          boost_multiplier: 1,
        },
        {
          user_id: "user-a",
          match_id: "m2",
          home_score: 0,
          away_score: 0,
          scorer_name: null,
          boost_multiplier: 1,
        },
      ],
      profiles,
      scorersByMatch: {},
    });

    expect(analytics.stages).toEqual(["group_1", "group_2"]);
    expect(analytics.overall[0]?.user_id).toBe("user-a");
    expect(analytics.overall[0]?.total_points).toBe(6);
    expect(analytics.perStage.group_1?.[0]?.user_id).toBe("user-a");
    expect(analytics.perStage.group_1?.[0]?.points).toBe(3);
  });

  it("builds position series across stages", () => {
    const analytics = buildLeaderboardAnalytics({
      matches: [
        {
          id: "m1",
          round_key: "group_1",
          status: "finished",
          home_score: 1,
          away_score: 0,
        },
        {
          id: "m2",
          round_key: "group_2",
          status: "finished",
          home_score: 0,
          away_score: 1,
        },
      ],
      predictions: [
        {
          user_id: "user-a",
          match_id: "m1",
          home_score: 1,
          away_score: 0,
          scorer_name: null,
          boost_multiplier: 1,
        },
        {
          user_id: "user-b",
          match_id: "m1",
          home_score: 0,
          away_score: 1,
          scorer_name: null,
          boost_multiplier: 1,
        },
        {
          user_id: "user-b",
          match_id: "m2",
          home_score: 0,
          away_score: 1,
          scorer_name: null,
          boost_multiplier: 1,
        },
      ],
      profiles,
      scorersByMatch: {},
    });

    expect(analytics.positionSeries["user-a"]).toEqual([
      { stageKey: "group_1", cumulativePoints: 3, position: 1 },
      { stageKey: "group_2", cumulativePoints: 3, position: 2 },
    ]);
    expect(analytics.positionSeries["user-b"]).toEqual([
      { stageKey: "group_1", cumulativePoints: 0, position: 2 },
      { stageKey: "group_2", cumulativePoints: 3, position: 1 },
    ]);
  });
});
