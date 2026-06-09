import { describe, expect, it } from "vitest";
import { parseRoundKey } from "./parseRoundKey";

describe("parseRoundKey", () => {
  it("maps group matchdays to round keys", () => {
    expect(parseRoundKey("Matchday 1")).toBe("group_1");
    expect(parseRoundKey("Matchday 8")).toBe("group_2");
    expect(parseRoundKey("Matchday 14")).toBe("group_3");
  });

  it("maps knockout rounds", () => {
    expect(parseRoundKey("Round of 32")).toBe("round_of_32");
    expect(parseRoundKey("Quarter-final")).toBe("quarter_final");
    expect(parseRoundKey("Final")).toBe("final");
  });
});
