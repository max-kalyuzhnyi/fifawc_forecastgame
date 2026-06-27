import { describe, expect, it } from "vitest";
import {
  getBoostBudgetMatrix,
  getStageBoostBudget,
  getTierFromRank,
  isBoostAllowedStage,
} from "./boostBudget";

describe("getTierFromRank", () => {
  it("maps rank boundaries to tiers", () => {
    expect(getTierFromRank(1)).toBe(1);
    expect(getTierFromRank(3)).toBe(1);
    expect(getTierFromRank(4)).toBe(2);
    expect(getTierFromRank(8)).toBe(2);
    expect(getTierFromRank(9)).toBe(3);
    expect(getTierFromRank(14)).toBe(3);
    expect(getTierFromRank(15)).toBe(4);
    expect(getTierFromRank(100)).toBe(4);
  });
});

describe("getStageBoostBudget", () => {
  it("returns baseline budgets for tier 1", () => {
    expect(getStageBoostBudget(1, "round_of_32")).toBe(4);
    expect(getStageBoostBudget(1, "round_of_16")).toBe(2);
    expect(getStageBoostBudget(1, "quarter_final")).toBe(1);
    expect(getStageBoostBudget(1, "semi_final")).toBe(1);
  });

  it("adds tier bonuses on later stages", () => {
    expect(getStageBoostBudget(2, "quarter_final")).toBe(3);
    expect(getStageBoostBudget(3, "round_of_16")).toBe(5);
    expect(getStageBoostBudget(4, "round_of_32")).toBe(5);
  });

  it("disallows boosts on third place and final", () => {
    expect(getStageBoostBudget(1, "third_place")).toBe(0);
    expect(getStageBoostBudget(1, "final")).toBe(0);
    expect(isBoostAllowedStage("third_place")).toBe(false);
    expect(isBoostAllowedStage("final")).toBe(false);
  });
});

describe("getBoostBudgetMatrix", () => {
  it("matches the spec matrix", () => {
    const matrix = getBoostBudgetMatrix();

    expect(matrix[1]).toMatchObject({
      round_of_32: 4,
      round_of_16: 2,
      quarter_final: 1,
      semi_final: 1,
      third_place: 0,
      final: 0,
    });
    expect(matrix[2].quarter_final).toBe(3);
    expect(matrix[3].round_of_16).toBe(5);
    expect(matrix[4].round_of_32).toBe(5);
  });
});
